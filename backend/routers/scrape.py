"""
routers/scrape.py — API for scraped commodity news
Runs Scrapy spiders in subprocess, serves results from JSON file.
"""
import json
import os
import subprocess
import sys
from datetime import datetime
from fastapi import APIRouter, Query, BackgroundTasks

router = APIRouter()

NEWS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "scraped_news.json")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read_news():
    if not os.path.exists(NEWS_FILE):
        return []
    try:
        with open(NEWS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _run_scrapy():
    """Run scrapy spiders in a subprocess to avoid Twisted/asyncio conflicts."""
    subprocess.run(
        [sys.executable, "-m", "scraper.runner"],
        cwd=BACKEND_DIR,
        timeout=120,
        capture_output=True,
    )


@router.get("/news")
async def get_scraped_news(ticker: str = Query(None), limit: int = Query(20)):
    """Get scraped news, optionally filtered by ticker."""
    articles = _read_news()
    if ticker:
        articles = [a for a in articles if a.get("ticker") == ticker]
    return {"articles": articles[:limit], "total": len(articles)}


@router.post("/run")
async def run_scraper(background_tasks: BackgroundTasks):
    """Trigger a scrape run in the background."""
    background_tasks.add_task(_run_scrapy)
    return {"status": "started", "message": "Scraping OilPrice, Reuters, MarketWatch..."}


@router.get("/status")
async def scraper_status():
    """Check last scrape time and article count."""
    articles = _read_news()
    last_scraped = articles[0].get("scraped_at") if articles else None
    sources = {}
    for a in articles:
        src = a.get("source", "Unknown")
        sources[src] = sources.get(src, 0) + 1
    return {
        "total_articles": len(articles),
        "last_scraped": last_scraped,
        "sources": sources,
    }
