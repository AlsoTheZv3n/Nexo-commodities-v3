"""
services/scraper.py — OHLC data fetcher via yfinance
Runs in cron + on-demand via API.
Note: yfinance is NOT thread-safe. All downloads must be serialized.
"""
import asyncio
import threading
from datetime import datetime

_yf_lock = threading.Lock()

async def fetch_ohlc_yfinance(ticker: str, period: str = "60d", interval: str = "1d") -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_sync, ticker, period, interval)

def _fetch_sync(ticker, period, interval):
    with _yf_lock:
        try:
            import yfinance as yf
            df = yf.download(ticker, period=period, interval=interval, progress=False, auto_adjust=True)
            if df.empty:
                return []
            # yfinance >=1.0 returns MultiIndex columns (Price, Ticker) — flatten
            if hasattr(df.columns, 'levels') and len(df.columns.levels) > 1:
                df.columns = df.columns.get_level_values(0)
            bars = []
            for date, row in df.iterrows():
                bars.append({
                    "date":   str(date.date()),
                    "open":   round(float(row["Open"]), 4),
                    "high":   round(float(row["High"]), 4),
                    "low":    round(float(row["Low"]), 4),
                    "close":  round(float(row["Close"]), 4),
                    "volume": int(row.get("Volume", 0) or 0),
                })
            return bars
        except Exception as e:
            print(f"yfinance error for {ticker}: {e}")
            return []
