"""
ml/finbert.py — FinBERT sentiment analysis for financial news
Model: ProsusAI/finbert (HuggingFace)
Labels: positive (bullish) | negative (bearish) | neutral
Runs on CPU for Railway, GPU if available locally.
"""

import asyncio
import logging
from functools import lru_cache
from typing import Optional

log = logging.getLogger("finbert")

# ── Lazy model loading (only loaded on first call) ────────
_pipeline = None

def _load_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        from transformers import pipeline
        log.info("Loading FinBERT model (ProsusAI/finbert)...")
        _pipeline = pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert",
            device=-1,           # -1 = CPU, 0 = GPU:0
            top_k=None,          # return all labels with scores
            truncation=True,
            max_length=512,
        )
        log.info("FinBERT loaded successfully.")
    except ImportError:
        log.warning("transformers not installed — using fallback keyword sentiment")
        _pipeline = "fallback"
    except Exception as e:
        log.error(f"FinBERT load error: {e} — using fallback")
        _pipeline = "fallback"
    return _pipeline


# ── Fallback: keyword-based sentiment ────────────────────
BULLISH_KW = ["surge", "rally", "gain", "rise", "jump", "bullish", "strong",
              "demand", "supply cut", "OPEC cut", "shortage", "record high"]
BEARISH_KW = ["drop", "fall", "decline", "crash", "weak", "bearish", "glut",
              "oversupply", "recession", "demand drop", "rate hike", "sell-off"]

def _keyword_sentiment(text: str) -> dict:
    text_l = text.lower()
    bull = sum(1 for kw in BULLISH_KW if kw in text_l)
    bear = sum(1 for kw in BEARISH_KW if kw in text_l)
    if bull > bear:
        return {"label": "bullish",  "score": round(0.5 + 0.1*bull, 2)}
    elif bear > bull:
        return {"label": "bearish",  "score": round(0.5 + 0.1*bear, 2)}
    return {"label": "neutral", "score": 0.5}


# ── Main API ──────────────────────────────────────────────
async def analyze_sentiment(text: str) -> dict:
    """
    Analyze sentiment of a financial news headline or summary.
    Returns: {"label": "bullish"|"bearish"|"neutral", "score": float 0-1}
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _analyze_sync, text)

def _analyze_sync(text: str) -> dict:
    pipe = _load_pipeline()

    if pipe == "fallback":
        return _keyword_sentiment(text)

    try:
        results = pipe(text)[0]   # list of {label, score}
        # FinBERT labels: positive, negative, neutral
        label_map = {"positive": "bullish", "negative": "bearish", "neutral": "neutral"}
        best = max(results, key=lambda x: x["score"])
        return {
            "label": label_map.get(best["label"].lower(), "neutral"),
            "score": round(best["score"], 4),
            "all": {label_map.get(r["label"].lower(), r["label"]): round(r["score"], 4) for r in results},
        }
    except Exception as e:
        log.warning(f"FinBERT inference error: {e} — fallback")
        return _keyword_sentiment(text)


async def batch_analyze(texts: list[str]) -> list[dict]:
    """Batch sentiment analysis for multiple headlines."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _batch_sync, texts)

def _batch_sync(texts: list[str]) -> list[dict]:
    pipe = _load_pipeline()
    if pipe == "fallback":
        return [_keyword_sentiment(t) for t in texts]
    try:
        results = pipe(texts, batch_size=8)
        label_map = {"positive": "bullish", "negative": "bearish", "neutral": "neutral"}
        out = []
        for r in results:
            best = max(r, key=lambda x: x["score"])
            out.append({
                "label": label_map.get(best["label"].lower(), "neutral"),
                "score": round(best["score"], 4),
            })
        return out
    except Exception:
        return [_keyword_sentiment(t) for t in texts]
