import { useState, useEffect } from "react";
import { Rss, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import Card from "./Card";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8002";

export default function ScrapedNewsCard({ ticker }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/scrape/news?ticker=${encodeURIComponent(ticker)}&limit=10`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error("Failed to fetch scraped news:", err);
    }
    setLoading(false);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scrape/status`);
      setStatus(await res.json());
    } catch {}
  };

  const runScrape = async () => {
    setScraping(true);
    try {
      await fetch(`${API_BASE}/api/scrape/run`, { method: "POST" });
      // Wait and then refresh
      setTimeout(async () => {
        await fetchNews();
        await fetchStatus();
        setScraping(false);
      }, 15000);
    } catch {
      setScraping(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchStatus();
  }, [ticker]);

  return (
    <Card label="Scraped News" span={3}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-[10px] text-muted">
          <Rss size={12} />
          {status && (
            <>
              <span>{status.total_articles} articles</span>
              <span>·</span>
              <span>{Object.entries(status.sources || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
              {status.last_scraped && (
                <>
                  <span>·</span>
                  <span>Last: {new Date(status.last_scraped).toLocaleTimeString("de-CH")}</span>
                </>
              )}
            </>
          )}
        </div>
        <button
          onClick={runScrape}
          disabled={scraping}
          className="flex items-center gap-1.5 text-[10px] font-medium text-muted hover:text-accent transition-colors cursor-pointer disabled:opacity-40"
        >
          {scraping ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {scraping ? "Scraping..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted py-4">
          <Loader2 size={14} className="animate-spin" />
          Loading scraped news...
        </div>
      ) : articles.length === 0 ? (
        <div className="text-xs text-muted py-4">
          No scraped articles for this ticker. Click Refresh to scrape OilPrice, MarketWatch.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white/[0.01] hover:bg-white/[0.03] hover:border-border-hi transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] leading-relaxed text-text-primary group-hover:text-accent transition-colors">
                  {a.headline}
                </div>
                {a.summary && (
                  <div className="text-[10px] text-text-secondary mt-1 line-clamp-2">{a.summary}</div>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted">
                  <span className="font-medium">{a.source}</span>
                  {a.published_at && <><span>·</span><span>{a.published_at}</span></>}
                </div>
              </div>
              <ExternalLink size={12} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
