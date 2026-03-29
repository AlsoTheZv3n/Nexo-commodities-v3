import { ExternalLink } from "lucide-react";
import Card from "./Card";

const sentimentBadge = {
  bullish: "text-positive bg-positive/[0.08] border-positive/20",
  bearish: "text-negative bg-negative/[0.08] border-negative/20",
  neutral: "text-muted bg-muted/[0.08] border-border",
};

const sentimentLabel = {
  bullish: "Bullish",
  bearish: "Bearish",
  neutral: "Neutral",
};

export default function NewsCard({ news, loading, assetName }) {
  return (
    <Card label={`News Feed`} trailing="AI Sentiment" span={2}>
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 text-muted text-[11px] py-3">
            <div className="w-3 h-3 border-[1.5px] border-accent/20 border-t-accent rounded-full animate-spin" />
            Fetching {assetName} news...
          </div>
        )}
        {!loading && !news.length && (
          <div className="text-[11px] text-muted py-2">
            Click News to load AI-curated articles for {assetName}.
          </div>
        )}
        {news.map((item, i) => {
          const badge = sentimentBadge[item.sentiment] || sentimentBadge.neutral;
          return (
            <div key={i} className="px-3 py-2.5 rounded-lg border border-border bg-white/[0.01] hover:bg-white/[0.025] hover:border-border-hi transition-colors animate-fade-in">
              <div className="text-[11px] leading-relaxed text-text-primary mb-1.5">{item.headline}</div>
              <div className="flex items-center gap-2 text-[9px] text-muted">
                <span>{item.source}</span>
                <span>·</span>
                <span>{item.time}</span>
                <span className={`text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>
                  {sentimentLabel[item.sentiment] || "Neutral"}
                </span>
              </div>
              {item.summary && (
                <div className="text-[10px] text-text-secondary leading-relaxed mt-2 pt-2 border-t border-border">
                  {item.summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
