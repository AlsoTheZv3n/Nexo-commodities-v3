import { Play, Newspaper, Loader2 } from "lucide-react";
import { ASSET_CLASSES, fmtPrice, pctChange } from "../lib/constants";

export default function Header({ asset, price, openPrice, onRunAgent, onFetchNews, agentLoading, newsLoading }) {
  const change = price - openPrice;
  const changePct = pctChange(price, openPrice);
  const isUp = change >= 0;
  const cls = ASSET_CLASSES[asset.class] || ASSET_CLASSES.commodity;

  return (
    <div className="mb-5 animate-fade-in">
      {/* Badge */}
      <div className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase px-2.5 py-1 rounded border mb-3 font-medium ${
        "text-accent border-accent/20 bg-accent/[0.06]"
      }`}>
        {cls.label} · {asset.unit || "USD"}
      </div>

      <div className="text-[11px] text-text-secondary mb-1">{asset.name}</div>

      <div className="flex items-end gap-5 flex-wrap">
        {/* Price */}
        <div className={`text-[44px] font-extrabold tracking-tight leading-none tabular-nums ${isUp ? "text-positive" : "text-negative"}`}>
          {fmtPrice(price, asset.class)}
        </div>

        <div className="flex items-center gap-3 pb-1.5">
          {/* Live dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
          {/* Change */}
          <span className={`text-sm font-medium font-mono tabular-nums ${isUp ? "text-positive" : "text-negative"}`}>
            {isUp ? "+" : ""}{change.toFixed(asset.class === "forex" ? 4 : 2)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
          </span>
          <span className="text-[11px] text-muted">60d</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onRunAgent}
            disabled={agentLoading}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-accent/10 text-accent border-accent/25 hover:bg-accent/[0.18] hover:border-accent/40"
          >
            {agentLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {agentLoading ? "Analysing..." : "Run Agent"}
          </button>
          <button
            onClick={onFetchNews}
            disabled={newsLoading}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white/[0.04] text-text-secondary border-border hover:bg-white/[0.07] hover:text-text-primary"
          >
            {newsLoading ? <Loader2 size={13} className="animate-spin" /> : <Newspaper size={13} />}
            News
          </button>
        </div>
      </div>
    </div>
  );
}
