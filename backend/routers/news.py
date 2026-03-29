"""routers/news.py"""
from fastapi import APIRouter, Query
from services.db import db

router = APIRouter()

@router.get("/{ticker}")
async def get_news(ticker: str, limit: int = Query(20)):
    articles = await db.fetch(
        "SELECT * FROM news WHERE ticker=$1 ORDER BY published_at DESC LIMIT $2",
        ticker, limit)
    return {"ticker": ticker, "articles": articles}
