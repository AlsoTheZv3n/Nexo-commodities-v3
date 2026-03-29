"""
Pipeline: stores scraped news into a JSON file for the API to read.
The FastAPI app reads this file and serves it + runs FinBERT sentiment on it.
"""
import json
import os
from datetime import datetime

NEWS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "scraped_news.json")

class NewsPipeline:
    def open_spider(self, spider):
        os.makedirs(os.path.dirname(NEWS_FILE), exist_ok=True)
        self.items = []
        # Load existing
        if os.path.exists(NEWS_FILE):
            try:
                with open(NEWS_FILE, "r", encoding="utf-8") as f:
                    self.items = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.items = []

    def process_item(self, item, spider):
        entry = dict(item)
        entry["scraped_at"] = datetime.utcnow().isoformat()
        # Deduplicate by URL
        if not any(e.get("url") == entry.get("url") for e in self.items):
            self.items.insert(0, entry)
        return item

    def close_spider(self, spider):
        # Keep max 200 articles
        self.items = self.items[:200]
        with open(NEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.items, f, indent=2, default=str)
