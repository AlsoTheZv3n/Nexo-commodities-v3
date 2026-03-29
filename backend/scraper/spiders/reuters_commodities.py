"""
Spider: Reuters — Commodities section
"""
import scrapy
from scraper.items import NewsItem

TICKER_MAP = {
    "crude": "CL=F", "wti": "CL=F", "brent": "BZ=F", "oil": "CL=F",
    "natural gas": "NG=F", "gold": "GC=F", "silver": "SI=F",
    "copper": "HG=F", "platinum": "PL=F", "palladium": "PA=F",
    "corn": "ZC=F", "wheat": "ZW=F", "soybean": "ZS=F", "soy": "ZS=F",
    "coffee": "KC=F", "sugar": "SB=F", "cocoa": "CC=F", "cotton": "CT=F",
    "opec": "CL=F", "gasoline": "RB=F",
}

def match_ticker(text):
    t = text.lower()
    for keyword, ticker in TICKER_MAP.items():
        if keyword in t:
            return ticker
    return "CL=F"


class ReutersCommoditiesSpider(scrapy.Spider):
    name = "reuters"
    allowed_domains = ["reuters.com"]
    start_urls = ["https://www.reuters.com/markets/commodities/"]

    def parse(self, response):
        # Reuters uses data-testid for article cards
        articles = response.css("[data-testid='MediaStoryCard'], .story-card, article")
        for art in articles[:15]:
            link = art.css("a::attr(href)").get()
            headline = art.css("h3::text, [data-testid='Heading']::text, a::text").get("").strip()
            summary = art.css("p::text").get("").strip()
            time = art.css("time::attr(datetime), time::text").get("")
            if headline and link:
                yield NewsItem(
                    ticker=match_ticker(headline),
                    headline=headline,
                    source="Reuters",
                    url=response.urljoin(link),
                    summary=summary,
                    published_at=time,
                )
