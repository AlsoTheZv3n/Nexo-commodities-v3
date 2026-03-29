"""
Spider: OilPrice.com — Oil, Gas, Energy commodity news
"""
import scrapy
from scraper.items import NewsItem

TICKER_MAP = {
    "crude": "CL=F", "wti": "CL=F", "brent": "BZ=F",
    "natural gas": "NG=F", "lng": "NG=F",
    "gold": "GC=F", "silver": "SI=F", "copper": "HG=F",
    "oil": "CL=F", "opec": "CL=F", "petroleum": "CL=F",
    "gasoline": "RB=F", "heating oil": "HO=F",
    "corn": "ZC=F", "wheat": "ZW=F", "soybean": "ZS=F",
    "coffee": "KC=F", "sugar": "SB=F", "cocoa": "CC=F",
}

def match_ticker(text):
    t = text.lower()
    for keyword, ticker in TICKER_MAP.items():
        if keyword in t:
            return ticker
    return "CL=F"


class OilPriceSpider(scrapy.Spider):
    name = "oilprice"
    allowed_domains = ["oilprice.com"]
    start_urls = ["https://oilprice.com/Latest-Energy-News/World-News/"]

    def parse(self, response):
        for art in response.css(".categoryArticle")[:15]:
            headline = art.css(".categoryArticle__title::text").get("").strip()
            link = art.css("a::attr(href)").get()
            excerpt = art.css(".categoryArticle__excerpt::text").get("").strip()
            # First p usually has "Mar 27, 2026 at 14:31 | Author"
            meta = art.css("p::text").get("").strip()
            pub_date = meta.split("|")[0].strip() if "|" in meta else ""

            if headline and link:
                yield NewsItem(
                    ticker=match_ticker(headline + " " + excerpt),
                    headline=headline,
                    source="OilPrice.com",
                    url=link,
                    summary=excerpt[:200],
                    published_at=pub_date,
                )
