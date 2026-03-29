"""
Spider: MarketWatch — Commodities news
"""
import scrapy
from scraper.items import NewsItem

TICKER_MAP = {
    "crude": "CL=F", "wti": "CL=F", "brent": "BZ=F", "oil": "CL=F",
    "natural gas": "NG=F", "gold": "GC=F", "silver": "SI=F",
    "copper": "HG=F", "platinum": "PL=F", "palladium": "PA=F",
    "corn": "ZC=F", "wheat": "ZW=F", "soybean": "ZS=F",
    "coffee": "KC=F", "sugar": "SB=F", "cocoa": "CC=F", "cotton": "CT=F",
    "opec": "CL=F",
}

def match_ticker(text):
    t = text.lower()
    for keyword, ticker in TICKER_MAP.items():
        if keyword in t:
            return ticker
    return "CL=F"


class MarketWatchSpider(scrapy.Spider):
    name = "marketwatch"
    allowed_domains = ["marketwatch.com"]
    start_urls = [
        "https://www.marketwatch.com/investing/futures",
        "https://www.marketwatch.com/energy",
        "https://www.marketwatch.com/metals",
    ]

    def parse(self, response):
        articles = response.css(".article__content, .element--article")
        for art in articles[:15]:
            link = art.css("a::attr(href)").get()
            headline = art.css("h3::text, .article__headline a::text, a::text").get("").strip()
            summary = art.css("p::text, .article__summary::text").get("").strip()
            time = art.css("time::attr(datetime), .article__timestamp::text").get("")
            if headline and link:
                yield NewsItem(
                    ticker=match_ticker(headline),
                    headline=headline,
                    source="MarketWatch",
                    url=response.urljoin(link),
                    summary=summary,
                    published_at=time,
                )
