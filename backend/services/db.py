"""
services/db.py — PostgreSQL connection pool via asyncpg
Usage:
    from services.db import db
    rows = await db.fetch("SELECT * FROM ohlc WHERE ticker=$1", ticker)
    await db.execute("INSERT INTO ohlc (...) VALUES (...)", ...)
"""

import asyncpg
import logging
from config import settings

log = logging.getLogger("db")

class Database:
    def __init__(self):
        self._pool: asyncpg.Pool | None = None

    async def connect(self):
        self._pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        log.info("PostgreSQL pool connected")

    async def disconnect(self):
        if self._pool:
            await self._pool.close()
            log.info("PostgreSQL pool closed")

    async def fetch(self, query: str, *args) -> list[dict]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(r) for r in rows]

    async def fetchrow(self, query: str, *args) -> dict | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def fetchval(self, query: str, *args):
        async with self._pool.acquire() as conn:
            return await conn.fetchval(query, *args)

    async def execute(self, query: str, *args) -> str:
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def executemany(self, query: str, args_list: list) -> None:
        async with self._pool.acquire() as conn:
            await conn.executemany(query, args_list)

    async def upsert_ohlc(self, rows: list[dict]) -> int:
        """Batch upsert OHLC rows — conflict on (ticker, date)."""
        if not rows:
            return 0
        query = """
            INSERT INTO ohlc (ticker, date, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (ticker, date) DO UPDATE SET
                open   = EXCLUDED.open,
                high   = EXCLUDED.high,
                low    = EXCLUDED.low,
                close  = EXCLUDED.close,
                volume = EXCLUDED.volume
        """
        data = [(r["ticker"], r["date"], r["open"], r["high"],
                 r["low"], r["close"], r.get("volume", 0)) for r in rows]
        async with self._pool.acquire() as conn:
            await conn.executemany(query, data)
        return len(rows)

    async def upsert_news(self, row: dict) -> None:
        """Upsert a news article — conflict on url."""
        query = """
            INSERT INTO news (ticker, headline, source, url, sentiment, sentiment_score, published_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (url) DO UPDATE SET
                sentiment       = EXCLUDED.sentiment,
                sentiment_score = EXCLUDED.sentiment_score
        """
        await self.execute(query,
            row["ticker"], row["headline"], row.get("source"),
            row.get("url"), row.get("sentiment"), row.get("sentiment_score"),
            row.get("published_at"))

    async def insert_alert(self, ticker: str, type_: str,
                            severity: str, message: str) -> None:
        await self.execute(
            "INSERT INTO alerts (ticker, type, severity, message) VALUES ($1,$2,$3,$4)",
            ticker, type_, severity, message)

    async def insert_prediction(self, ticker: str, model: str,
                                 pred_1d: float, pred_3d: float, pred_7d: float,
                                 direction: str, confidence: float) -> None:
        await self.execute("""
            INSERT INTO ml_predictions (ticker, model, pred_1d, pred_3d, pred_7d, direction, confidence)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
        """, ticker, model, pred_1d, pred_3d, pred_7d, direction, confidence)

# Singleton
db = Database()
