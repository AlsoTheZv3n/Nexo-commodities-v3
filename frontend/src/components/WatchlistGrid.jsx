import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { getAssetInfo, fmtPrice, pctChange, ASSET_CLASSES } from "../lib/constants";
import { computeRSI } from "../lib/math";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";

function MiniChart({ ohlc, isUp }) {
  if (!ohlc || ohlc.length < 2) return null;
  const data = ohlc.slice(-14).map((b, i) => ({ i, v: b.close }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mini-${isUp ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "var(--color-positive)" : "var(--color-negative)"} stopOpacity={0.2} />
            <stop offset="100%" stopColor={isUp ? "var(--color-positive)" : "var(--color-negative)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={isUp ? "var(--color-positive)" : "var(--color-negative)"}
          strokeWidth={1.5} fill={`url(#mini-${isUp ? "up" : "down"})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function WatchlistGrid({ watchlist, prices, prevPrices, ohlcs, onSelect }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {watchlist.map(ticker => {
        const info = getAssetInfo(ticker);
        const px = prices[ticker] || info.base;
        const prev = prevPrices[ticker] || px;
        const ohlc = ohlcs[ticker] || [];
        const openPrice = ohlc[0]?.close || px;
        const change = pctChange(px, openPrice);
        const isUp = change >= 0;
        const rsi = ohlc.length > 15 ? computeRSI(ohlc) : null;
        const sigma = (ASSET_CLASSES[info.class] || ASSET_CLASSES.commodity).sigma;
        const high = ohlc.length ? Math.max(...ohlc.map(d => d.high)) : 0;
        const low = ohlc.length ? Math.min(...ohlc.map(d => d.low)) : 0;

        return (
          <button
            key={ticker}
            onClick={() => onSelect(ticker)}
            className="group bg-card border border-border rounded-xl p-4 text-left hover:border-border-hi hover:bg-card-hover transition-all cursor-pointer animate-fade-in"
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{info.short}</span>
                  <span className="text-[9px] tracking-wider text-muted uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-border">
                    {(ASSET_CLASSES[info.class] || {}).label || info.class}
                  </span>
                </div>
                <div className="text-[10px] text-muted mt-0.5">{info.name}</div>
              </div>
              <ArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all mt-1" />
            </div>

            {/* Price + Change */}
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className={`text-xl font-bold font-mono tabular-nums ${isUp ? "text-positive" : "text-negative"}`}>
                  {fmtPrice(px, info.class)}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isUp ? <TrendingUp size={12} className="text-positive" /> : <TrendingDown size={12} className="text-negative" />}
                  <span className={`text-xs font-medium font-mono ${isUp ? "text-positive" : "text-negative"}`}>
                    {isUp ? "+" : ""}{change.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-muted">60d</span>
                </div>
              </div>

              {/* Mini sparkline */}
              <div className="w-24 h-10">
                <MiniChart ohlc={ohlc} isUp={isUp} />
              </div>
            </div>

            {/* Bottom stats row */}
            <div className="flex gap-3 pt-2 border-t border-border text-[10px] text-muted">
              {rsi !== null && (
                <span>RSI <span className={`font-medium ${rsi > 70 ? "text-negative" : rsi < 30 ? "text-positive" : "text-warning"}`}>{rsi}</span></span>
              )}
              {high > 0 && <span>H <span className="text-positive font-medium">{fmtPrice(high, info.class)}</span></span>}
              {low > 0 && <span>L <span className="text-negative font-medium">{fmtPrice(low, info.class)}</span></span>}
              <span>Vol <span className="text-text-secondary font-medium">{(sigma * 100).toFixed(1)}%</span></span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
