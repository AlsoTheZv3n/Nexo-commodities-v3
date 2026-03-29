"""Fetch news from RSS feeds for commodities."""
import asyncio, httpx
from datetime import datetime

RSS_FEEDS = {
    "CL=F": ["https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F&region=US&lang=en-US"],
    "GC=F": ["https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US"],
    "default": ["https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"],
}

async def fetch_news_rss(ticker: str) -> list[dict]:
    feeds = RSS_FEEDS.get(ticker, RSS_FEEDS["default"])
    results = []
    async with httpx.AsyncClient(timeout=10) as client:
        for url in feeds:
            url = url.replace("{ticker}", ticker)
            try:
                r = await client.get(url)
                # Simple XML parse
                import xml.etree.ElementTree as ET
                root = ET.fromstring(r.text)
                for item in root.findall(".//item")[:10]:
                    title = item.findtext("title", "")
                    link  = item.findtext("link", "")
                    pub   = item.findtext("pubDate", "")
                    if title:
                        results.append({"headline": title, "url": link, "source": "Yahoo Finance", "published_at": pub})
            except Exception as e:
                print(f"RSS error: {e}")
    return results
