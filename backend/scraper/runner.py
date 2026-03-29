"""
Runs commodity news scraping. Called as: python -m scraper.runner
Uses Scrapy FEEDS to export to a temp JSON, then merges into main file.
"""
import os
import sys
import json
from datetime import datetime

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

DATA_DIR = os.path.join(backend_dir, "data")
NEWS_FILE = os.path.join(DATA_DIR, "scraped_news.json")
TEMP_FILE = os.path.join(DATA_DIR, "_temp_scrape.json")

TICKER_MAP = {
    "crude": "CL=F", "wti": "CL=F", "brent": "BZ=F", "oil": "CL=F",
    "natural gas": "NG=F", "lng": "NG=F", "opec": "CL=F",
    "gold": "GC=F", "silver": "SI=F", "copper": "HG=F",
    "platinum": "PL=F", "palladium": "PA=F",
    "gasoline": "RB=F", "heating oil": "HO=F",
    "corn": "ZC=F", "wheat": "ZW=F", "soybean": "ZS=F", "soy": "ZS=F",
    "coffee": "KC=F", "sugar": "SB=F", "cocoa": "CC=F", "cotton": "CT=F",
}

def match_ticker(text):
    t = text.lower()
    for kw, tk in TICKER_MAP.items():
        if kw in t:
            return tk
    return "CL=F"


def run_all_spiders():
    import scrapy
    from scrapy.crawler import CrawlerProcess

    os.makedirs(DATA_DIR, exist_ok=True)
    # Remove temp file if exists
    if os.path.exists(TEMP_FILE):
        os.remove(TEMP_FILE)

    class OilPriceSpider(scrapy.Spider):
        name = "oilprice"
        start_urls = ["https://oilprice.com/Latest-Energy-News/World-News/"]
        def parse(self, response):
            for art in response.css(".categoryArticle")[:15]:
                headline = art.css(".categoryArticle__title::text").get("").strip()
                link = art.css("a::attr(href)").get()
                excerpt = art.css(".categoryArticle__excerpt::text").get("").strip()
                meta = art.css("p::text").get("").strip()
                pub = meta.split("|")[0].strip() if "|" in meta else ""
                if headline and link:
                    yield {"ticker": match_ticker(headline + " " + excerpt),
                           "headline": headline, "source": "OilPrice.com",
                           "url": link, "summary": excerpt[:200],
                           "published_at": pub, "scraped_at": datetime.utcnow().isoformat()}

    class MarketWatchSpider(scrapy.Spider):
        name = "marketwatch"
        start_urls = ["https://www.marketwatch.com/investing/futures"]
        def parse(self, response):
            for art in response.css(".article__content, .element--article")[:15]:
                headline = art.css("h3 a::text, .article__headline a::text").get("").strip()
                link = art.css("h3 a::attr(href), .article__headline a::attr(href)").get()
                if headline and link:
                    yield {"ticker": match_ticker(headline),
                           "headline": headline, "source": "MarketWatch",
                           "url": response.urljoin(link), "summary": "",
                           "published_at": "", "scraped_at": datetime.utcnow().isoformat()}

    process = CrawlerProcess({
        "LOG_LEVEL": "INFO",
        "ROBOTSTXT_OBEY": True,
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "REQUEST_FINGERPRINTER_IMPLEMENTATION": "2.7",
        "FEEDS": {
            TEMP_FILE: {"format": "json", "encoding": "utf-8", "overwrite": True},
        },
    })

    process.crawl(OilPriceSpider)
    process.crawl(MarketWatchSpider)
    process.start()

    # Read temp results and merge
    new_items = []
    if os.path.exists(TEMP_FILE):
        try:
            with open(TEMP_FILE, "r", encoding="utf-8") as f:
                new_items = json.load(f)
            os.remove(TEMP_FILE)
        except (json.JSONDecodeError, IOError):
            pass

    existing = []
    if os.path.exists(NEWS_FILE):
        try:
            with open(NEWS_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    seen = {a.get("url") for a in existing}
    for item in new_items:
        if item.get("url") not in seen:
            existing.insert(0, item)
            seen.add(item.get("url"))

    existing = existing[:200]
    with open(NEWS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, default=str)

    print(f"Scraped {len(new_items)} articles, total {len(existing)} stored")


if __name__ == "__main__":
    run_all_spiders()
