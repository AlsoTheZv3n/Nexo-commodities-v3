"""
Nexo Commodities — FastAPI Backend
Handles: WebSocket proxy, Cron jobs, ML endpoints
Deploy: Docker on Ubuntu VM (192.168.1.50)
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from routers import ohlc, ml, news, alerts, agent, scrape
from services.db import db
from services.scraper import fetch_ohlc_yfinance
from config import WATCHLIST

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("nexo")
scheduler = AsyncIOScheduler(timezone="UTC")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    scheduler.add_job(cron_ohlc,   "interval", minutes=15, id="ohlc",    replace_existing=True)
    scheduler.add_job(cron_news,   "interval", minutes=30, id="news",    replace_existing=True)
    scheduler.add_job(cron_ml,     "interval", hours=1,   id="ml_train", replace_existing=True)
    scheduler.add_job(cron_scrape, "interval", minutes=20, id="scrape",  replace_existing=True)
    scheduler.start()
    log.info("Scheduler started — OHLC/15min · News/30min · Scrape/20min · ML/1h")
    yield
    scheduler.shutdown()
    await db.disconnect()

app = FastAPI(title="Nexo Commodities API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(ohlc.router,   prefix="/api/ohlc",   tags=["OHLC"])
app.include_router(ml.router,     prefix="/api/ml",     tags=["ML"])
app.include_router(news.router,   prefix="/api/news",   tags=["News"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(scrape.router, prefix="/api/scrape", tags=["Scraper"])

# ── WebSocket Manager ─────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ticker: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(ticker, []).append(ws)

    def disconnect(self, ticker: str, ws: WebSocket):
        if ticker in self.connections:
            self.connections[ticker] = [c for c in self.connections[ticker] if c != ws]

    async def broadcast(self, ticker: str, data: dict):
        dead = []
        for ws in self.connections.get(ticker, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ticker, ws)

manager = ConnectionManager()

@app.websocket("/ws/{ticker}")
async def websocket_ticker(websocket: WebSocket, ticker: str):
    await manager.connect(ticker, websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(ticker, websocket)

# ── Cron Jobs ─────────────────────────────────────────────
async def cron_ohlc():
    log.info("Cron: OHLC refresh...")
    for ticker in WATCHLIST:
        try:
            bars = await fetch_ohlc_yfinance(ticker, period="60d", interval="1d")
            if bars:
                n = await db.upsert_ohlc([{"ticker": ticker, **b} for b in bars])
                log.info(f"  {ticker}: {n} bars upserted")
        except Exception as e:
            log.error(f"  {ticker} OHLC error: {e}")

async def cron_news():
    from ml.finbert import analyze_sentiment
    from services.news_fetcher import fetch_news_rss
    log.info("Cron: News + FinBERT...")
    for ticker in WATCHLIST:
        try:
            articles = await fetch_news_rss(ticker)
            for a in articles:
                sentiment = await analyze_sentiment(a["headline"])
                await db.upsert_news({**a, "ticker": ticker,
                                       "sentiment": sentiment["label"],
                                       "sentiment_score": sentiment["score"]})
            log.info(f"  {ticker}: {len(articles)} articles")
        except Exception as e:
            log.error(f"  {ticker} news error: {e}")

async def cron_ml():
    from ml.lstm import train_lstm
    from ml.anomaly import train_isolation_forest
    log.info("Cron: ML retrain...")
    for ticker in WATCHLIST:
        try:
            bars = await db.fetch("SELECT * FROM ohlc WHERE ticker=$1 ORDER BY date", ticker)
            if len(bars) < 30:
                continue
            closes = [b["close"] for b in bars]
            lstm_r = await train_lstm(ticker, closes)
            if "predictions" in lstm_r:
                p = lstm_r["predictions"]
                await db.insert_prediction(ticker, "lstm",
                    p.get("1d",0), p.get("3d",0), p.get("7d",0),
                    lstm_r.get("direction_1d",""), lstm_r.get("confidence",0))
            await train_isolation_forest(ticker, bars)
            log.info(f"  {ticker}: retrained")
        except Exception as e:
            log.error(f"  {ticker} ML error: {e}")

async def cron_scrape():
    import subprocess, sys, os
    log.info("Cron: Scrapy news scrape...")
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        result = subprocess.run(
            [sys.executable, "-m", "scraper.runner"],
            cwd=backend_dir, timeout=120, capture_output=True, text=True
        )
        if result.returncode == 0:
            log.info("  Scrape complete")
        else:
            log.error(f"  Scrape error: {result.stderr[:200]}")
    except Exception as e:
        log.error(f"  Scrape error: {e}")

@app.get("/health")
async def health():
    try:
        await db.fetchval("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok,
            "time": datetime.utcnow().isoformat()}
