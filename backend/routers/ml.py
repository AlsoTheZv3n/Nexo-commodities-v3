"""
routers/ml.py — ML prediction endpoints
GET /api/ml/predict/{ticker}   — LSTM price prediction
GET /api/ml/anomaly/{ticker}   — Isolation Forest anomaly score
POST /api/ml/sentiment         — FinBERT sentiment for custom text
GET /api/ml/features/{ticker}  — Technical indicator features (RSI, MACD, Bollinger)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ml.lstm    import predict_lstm, train_lstm
from ml.anomaly import detect_anomalies, train_isolation_forest
from ml.finbert import analyze_sentiment, batch_analyze
from services.db import db

router = APIRouter()


# ── LSTM Prediction ───────────────────────────────────────
@router.get("/predict/{ticker}")
async def lstm_predict(ticker: str):
    """
    Returns LSTM price predictions for 1d, 3d, 7d horizon.
    Uses saved model — run /retrain first if no model exists.
    """
    result = await db.fetch("SELECT close FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
    closes = [r["close"] for r in result]
    if len(closes) < 25:
        raise HTTPException(422, f"Not enough data for {ticker} (need 25+, got {len(closes)})")

    prediction = await predict_lstm(ticker, closes)
    if not prediction:
        raise HTTPException(404, f"No trained LSTM model for {ticker}. Call /retrain first.")

    # Enrich with last actual price
    prediction["last_close"] = closes[-1]
    prediction["upside_1d"] = round((prediction["pred_1d"] - closes[-1]) / closes[-1] * 100, 3)
    prediction["upside_7d"] = round((prediction["pred_7d"] - closes[-1]) / closes[-1] * 100, 3)

    return prediction


# ── Anomaly Detection ─────────────────────────────────────
@router.get("/anomaly/{ticker}")
async def anomaly_detect(ticker: str):
    """
    Returns Isolation Forest anomaly score for latest OHLC bars.
    Includes alert if last bar is anomalous.
    """
    result = await db.fetch("SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
    bars = result
    if len(bars) < 20:
        raise HTTPException(422, f"Not enough OHLC data for {ticker}")

    detection = await detect_anomalies(ticker, bars)
    if not detection:
        raise HTTPException(404, f"No Isolation Forest model for {ticker}. Cron will train it.")

    return detection


# ── Technical Features ────────────────────────────────────
@router.get("/features/{ticker}")
async def get_features(ticker: str):
    """
    Compute technical indicators from stored OHLC:
    RSI(14), MACD(12,26,9), Bollinger Bands(20), ATR(14), OBV
    These feed into the Linear Regression signal model.
    """
    result = await db.fetch("SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
    bars = result
    if len(bars) < 30:
        raise HTTPException(422, "Need 30+ bars for feature computation")

    closes = [b["close"] for b in bars]
    highs  = [b["high"]  for b in bars]
    lows   = [b["low"]   for b in bars]
    vols   = [b.get("volume", 0) for b in bars]

    return {
        "ticker": ticker,
        "rsi_14":       compute_rsi(closes, 14),
        "macd":         compute_macd(closes),
        "bollinger":    compute_bollinger(closes, 20),
        "atr_14":       compute_atr(highs, lows, closes, 14),
        "obv":          compute_obv(closes, vols),
        "linear_signal":compute_linear_signal(closes, highs, lows, vols),
        "last_close":   closes[-1],
        "last_date":    bars[-1]["date"],
    }


# ── FinBERT Sentiment ─────────────────────────────────────
class SentimentRequest(BaseModel):
    texts: list[str]

@router.post("/sentiment")
async def sentiment_analyze(req: SentimentRequest):
    """Batch FinBERT sentiment for list of news headlines."""
    if not req.texts:
        raise HTTPException(400, "texts list is empty")
    if len(req.texts) > 50:
        raise HTTPException(400, "max 50 texts per request")
    results = await batch_analyze(req.texts)
    return {"results": results, "model": "ProsusAI/finbert"}


# ── Retrain endpoint (manual trigger) ────────────────────
@router.post("/retrain/{ticker}")
async def manual_retrain(ticker: str):
    result = await db.fetch("SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
    bars = result
    closes = [b["close"] for b in bars]
    if len(closes) < 30:
        raise HTTPException(422, "Need 30+ bars")
    lstm_r   = await train_lstm(ticker, closes)
    iforest_r = await train_isolation_forest(ticker, bars)
    return {"lstm": lstm_r, "isolation_forest": iforest_r}


# ── Technical Indicator Helpers ───────────────────────────
def compute_rsi(closes: list, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    gains  = [max(0, d) for d in deltas[-period:]]
    losses = [max(0, -d) for d in deltas[-period:]]
    ag = sum(gains) / period or 1e-9
    al = sum(losses) / period or 1e-9
    return round(100 - (100 / (1 + ag/al)), 2)

def compute_macd(closes: list) -> dict:
    def ema(data, n):
        k = 2/(n+1); e = data[0]
        for v in data[1:]: e = v*k + e*(1-k)
        return e
    if len(closes) < 26:
        return {"macd": 0, "signal": 0, "histogram": 0}
    ema12 = ema(closes[-26:], 12)
    ema26 = ema(closes[-26:], 26)
    macd_line = ema12 - ema26
    # Signal: 9-period EMA of MACD (approximate)
    signal = macd_line * 0.8  # simplified
    return {
        "macd":      round(macd_line, 4),
        "signal":    round(signal, 4),
        "histogram": round(macd_line - signal, 4),
        "crossover": "bullish" if macd_line > signal else "bearish",
    }

def compute_bollinger(closes: list, period: int = 20) -> dict:
    if len(closes) < period:
        return {"upper": 0, "middle": 0, "lower": 0, "bandwidth": 0, "position": 0.5}
    window = closes[-period:]
    mid = sum(window) / period
    std = (sum((x - mid)**2 for x in window) / period) ** 0.5
    upper = mid + 2*std
    lower = mid - 2*std
    last  = closes[-1]
    bw    = (upper - lower) / (mid + 1e-9)
    pos   = (last - lower) / (upper - lower + 1e-9)  # 0=at lower, 1=at upper
    return {
        "upper":     round(upper, 4),
        "middle":    round(mid, 4),
        "lower":     round(lower, 4),
        "bandwidth": round(bw, 4),
        "position":  round(pos, 4),
        "squeeze":   bw < 0.1,
    }

def compute_atr(highs, lows, closes, period=14) -> float:
    if len(closes) < period + 1:
        return 0.0
    tr_list = []
    for i in range(1, len(closes)):
        tr = max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
        tr_list.append(tr)
    return round(sum(tr_list[-period:]) / period, 4)

def compute_obv(closes, volumes) -> dict:
    obv = 0
    for i in range(1, len(closes)):
        if closes[i] > closes[i-1]:   obv += volumes[i]
        elif closes[i] < closes[i-1]: obv -= volumes[i]
    trend = "rising" if obv > 0 else "falling"
    return {"obv": obv, "trend": trend}

def compute_linear_signal(closes, highs, lows, vols) -> dict:
    """
    Linear regression signal using multiple features.
    Simple weighted combination (production: train with sklearn Ridge).
    """
    if len(closes) < 30:
        return {"signal": "hold", "score": 0.0}

    rsi = compute_rsi(closes, 14)
    macd = compute_macd(closes)
    boll = compute_bollinger(closes, 20)

    score = 0.0
    score += (50 - rsi) / 100          # RSI: below 50 = bullish signal
    score += macd["histogram"] / (closes[-1] + 1e-9) * 1000  # MACD histogram
    score += (0.5 - boll["position"])  # Bollinger: below middle = bullish

    if score > 0.15:   signal = "buy"
    elif score < -0.15: signal = "sell"
    else:               signal = "hold"

    return {
        "signal":     signal,
        "score":      round(score, 4),
        "components": {"rsi_contrib": round((50-rsi)/100, 4),
                       "macd_contrib": round(macd["histogram"]/(closes[-1]+1e-9)*1000, 4),
                       "boll_contrib": round(0.5-boll["position"], 4)},
    }

# ── Patch: fix retrain to use db ──────────────────────────
async def _get_bars_for_ticker(ticker: str):
    return await db.fetch("SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
