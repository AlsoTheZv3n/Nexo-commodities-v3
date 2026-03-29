"""
ml/anomaly.py — Isolation Forest for commodity price anomaly detection
Detects: flash crashes, supply shocks, unusual volume spikes
Input:   OHLC bars with engineered features
Output:  anomaly score per bar + alert if recent bar is anomalous
"""

import asyncio
import pickle
from pathlib import Path
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)


def _engineer_features(bars: list[dict]) -> np.ndarray:
    """
    Feature engineering from OHLC bars.
    Features: returns, volatility, range, gap, volume ratio
    """
    feats = []
    for i in range(1, len(bars)):
        prev = bars[i-1]
        curr = bars[i]
        close_ret   = (curr["close"] - prev["close"]) / (prev["close"] + 1e-9)
        high_low_r  = (curr["high"] - curr["low"]) / (curr["close"] + 1e-9)
        open_gap    = (curr["open"] - prev["close"]) / (prev["close"] + 1e-9)
        body_ratio  = abs(curr["close"] - curr["open"]) / (curr["high"] - curr["low"] + 1e-9)
        vol_ratio   = curr.get("volume", 1) / (prev.get("volume", 1) + 1e-9)
        feats.append([close_ret, high_low_r, open_gap, body_ratio, vol_ratio])
    return np.array(feats, dtype=np.float32)


async def train_isolation_forest(ticker: str, bars: list[dict],
                                  contamination: float = 0.05) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _train_sync, ticker, bars, contamination)

def _train_sync(ticker, bars, contamination):
    if len(bars) < 20:
        return {"error": "not enough data"}

    feats = _engineer_features(bars)
    scaler = StandardScaler()
    feats_scaled = scaler.fit_transform(feats)

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(feats_scaled)

    # Score on training data — negative = more anomalous
    scores = model.decision_function(feats_scaled)
    labels = model.predict(feats_scaled)   # -1 = anomaly, 1 = normal

    path = MODEL_DIR / f"iforest_{ticker.replace('=','_').replace('^','')}.pkl"
    with open(path, "wb") as f:
        pickle.dump({"model": model, "scaler": scaler}, f)

    n_anomalies = (labels == -1).sum()
    return {
        "ticker": ticker,
        "trained_on": len(bars),
        "anomalies_found": int(n_anomalies),
        "anomaly_rate": round(n_anomalies / len(labels), 3),
    }


async def detect_anomalies(ticker: str, bars: list[dict]) -> Optional[dict]:
    """
    Run trained Isolation Forest on latest bars.
    Returns per-bar anomaly scores + alert for most recent bar.
    """
    path = MODEL_DIR / f"iforest_{ticker.replace('=','_').replace('^','')}.pkl"
    if not path.exists():
        return None

    with open(path, "rb") as f:
        state = pickle.load(f)

    model  = state["model"]
    scaler = state["scaler"]
    feats  = _engineer_features(bars)
    if len(feats) == 0:
        return None

    feats_scaled = scaler.transform(feats)
    scores = model.decision_function(feats_scaled)  # lower = more anomalous
    labels = model.predict(feats_scaled)

    # Anomaly score normalized to 0-1 (1 = most anomalous)
    norm_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)

    last_score = float(norm_scores[-1])
    last_label = int(labels[-1])

    result = {
        "ticker": ticker,
        "last_bar_score": round(last_score, 4),
        "last_bar_anomaly": last_label == -1,
        "alert": None,
    }

    if last_label == -1:
        bar = bars[-1]
        ret = (bar["close"] - bars[-2]["close"]) / bars[-2]["close"] * 100
        direction = "spike" if ret > 0 else "crash"
        result["alert"] = {
            "type": "anomaly",
            "severity": "high" if last_score > 0.8 else "medium",
            "message": f"Unusual price {direction} detected: {ret:+.2f}% — Isolation Forest score {last_score:.2f}",
        }

    # Top 5 historical anomaly dates
    anomaly_indices = np.where(labels == -1)[0]
    result["historical_anomalies"] = [
        {"date": bars[i+1].get("date", f"bar_{i}"), "score": round(float(norm_scores[i]), 3)}
        for i in anomaly_indices[-5:]
    ]

    return result
