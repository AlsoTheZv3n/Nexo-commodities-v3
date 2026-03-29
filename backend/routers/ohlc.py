"""routers/ohlc.py"""
from fastapi import APIRouter, Query, HTTPException
from services.db import db
from services.scraper import fetch_ohlc_yfinance

router = APIRouter()

@router.get("/{ticker}")
async def get_ohlc(ticker: str, days: int = Query(365)):
    bars = await db.fetch(
        "SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date DESC LIMIT $2", ticker, days)
    if not bars:
        period = "1y" if days > 180 else f"{days}d"
        raw = await fetch_ohlc_yfinance(ticker, period=period, interval="1d")
        return {"ticker": ticker, "bars": raw, "source": "live"}
    return {"ticker": ticker, "bars": list(reversed(bars)), "source": "db"}

@router.post("/refresh/{ticker}")
async def refresh_ohlc(ticker: str):
    bars = await fetch_ohlc_yfinance(ticker, period="1y", interval="1d")
    if not bars:
        raise HTTPException(404, f"No data for {ticker}")
    n = await db.upsert_ohlc([{"ticker": ticker, **b} for b in bars])
    return {"ticker": ticker, "upserted": n}
