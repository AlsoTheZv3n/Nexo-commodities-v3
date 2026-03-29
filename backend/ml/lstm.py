"""
ml/lstm.py — LSTM price prediction model
Input:  last N closing prices (normalized)
Output: predicted price for next 1, 3, 7 days
Framework: PyTorch (lightweight, no Keras overhead)
"""

import asyncio
import json
import math
import os
import pickle
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

# ── Model Architecture ────────────────────────────────────
class PriceLSTM(nn.Module):
    """
    2-layer LSTM with dropout for commodity price prediction.
    Input shape:  (batch, lookback, 1)
    Output shape: (batch, horizon)  — horizon = [1d, 3d, 7d]
    """
    def __init__(self, input_size=1, hidden_size=64, num_layers=2,
                 dropout=0.2, horizon=3):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers,
                            batch_first=True, dropout=dropout)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, horizon)
        )

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        out, _ = self.lstm(x, (h0, c0))
        return self.fc(out[:, -1, :])


# ── Training ──────────────────────────────────────────────
async def train_lstm(ticker: str, closes: list[float],
                     lookback: int = 20, horizon: int = 3,
                     epochs: int = 50) -> dict:
    """
    Train LSTM on historical closing prices.
    Returns: loss history + last prediction
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _train_sync, ticker, closes, lookback, horizon, epochs)
    return result

def _train_sync(ticker, closes, lookback, horizon, epochs):
    closes = np.array(closes, dtype=np.float32)

    # Normalize with min-max
    mn, mx = closes.min(), closes.max()
    if mx == mn:
        return {"error": "constant price series"}
    norm = (closes - mn) / (mx - mn)

    # Build sequences
    X, y = [], []
    for i in range(len(norm) - lookback - horizon + 1):
        X.append(norm[i:i+lookback])
        y.append(norm[i+lookback:i+lookback+horizon])
    if len(X) < 10:
        return {"error": "not enough data"}

    X = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)
    y = torch.tensor(y, dtype=torch.float32)
    dataset = TensorDataset(X, y)
    loader  = DataLoader(dataset, batch_size=16, shuffle=True)

    model = PriceLSTM(horizon=horizon)
    optim = torch.optim.Adam(model.parameters(), lr=0.001)
    crit  = nn.MSELoss()

    losses = []
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0
        for xb, yb in loader:
            optim.zero_grad()
            pred = model(xb)
            loss = crit(pred, yb)
            loss.backward()
            optim.step()
            epoch_loss += loss.item()
        losses.append(epoch_loss / len(loader))

    # Predict next horizon days from last window
    model.eval()
    with torch.no_grad():
        last_seq = torch.tensor(norm[-lookback:], dtype=torch.float32).unsqueeze(0).unsqueeze(-1)
        pred_norm = model(last_seq).squeeze().numpy()

    # Denormalize
    pred_prices = pred_norm * (mx - mn) + mn

    # Save model + scaler
    state = {"model": model.state_dict(), "mn": float(mn), "mx": float(mx),
             "lookback": lookback, "horizon": horizon}
    torch.save(state, MODEL_DIR / f"lstm_{ticker.replace('=','_').replace('^','')}.pt")

    return {
        "ticker": ticker,
        "predictions": {
            "1d": float(pred_prices[0]) if horizon >= 1 else None,
            "3d": float(pred_prices[min(1,horizon-1)]),
            "7d": float(pred_prices[min(2,horizon-1)]),
        },
        "final_loss": losses[-1],
        "epochs": epochs,
        "trained_on": len(closes),
    }


# ── Inference ─────────────────────────────────────────────
async def predict_lstm(ticker: str, closes: list[float]) -> Optional[dict]:
    """Load saved model and run inference."""
    path = MODEL_DIR / f"lstm_{ticker.replace('=','_').replace('^','')}.pt"
    if not path.exists():
        return None
    state = torch.load(path, map_location="cpu")
    lookback = state["lookback"]
    horizon  = state["horizon"]
    mn, mx   = state["mn"], state["mx"]
    if mx == mn:
        return None

    model = PriceLSTM(horizon=horizon)
    model.load_state_dict(state["model"])
    model.eval()

    closes_arr = np.array(closes[-lookback:], dtype=np.float32)
    norm = (closes_arr - mn) / (mx - mn)
    x = torch.tensor(norm, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)

    with torch.no_grad():
        pred_norm = model(x).squeeze().numpy()

    pred = pred_norm * (mx - mn) + mn
    current = closes[-1]

    return {
        "ticker": ticker,
        "current": float(current),
        "pred_1d": float(pred[0]) if horizon >= 1 else float(pred),
        "pred_3d": float(pred[min(1,horizon-1)]),
        "pred_7d": float(pred[min(2,horizon-1)]),
        "direction_1d": "up" if float(pred[0]) > current else "down",
        "confidence": _confidence(pred[0], current, state["mx"] - state["mn"]),
    }

def _confidence(pred, actual, price_range):
    """Rough confidence estimate based on prediction distance from current."""
    dist = abs(pred - actual) / (price_range + 1e-9)
    return round(max(0.3, min(0.95, 1.0 - dist * 2)), 2)
