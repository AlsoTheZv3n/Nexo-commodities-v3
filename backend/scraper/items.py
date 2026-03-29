import scrapy

class NewsItem(scrapy.Item):
    ticker = scrapy.Field()
    headline = scrapy.Field()
    source = scrapy.Field()
    url = scrapy.Field()
    summary = scrapy.Field()
    published_at = scrapy.Field()
    scraped_at = scrapy.Field()
