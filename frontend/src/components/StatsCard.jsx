import Card from "./Card";
import { fmtPrice } from "../lib/constants";

export default function StatsCard({ ohlc, mc, asset, sigma }) {
  const high = ohlc.length ? Math.max(...ohlc.map(d => d.high)) : 0;
  const low = ohlc.length ? Math.min(...ohlc.map(d => d.low)) : 0;

  const stats = [
    { value: fmtPrice(high, asset.class), label: "60D HIGH", color: "text-positive" },
    { value: fmtPrice(low, asset.class), label: "60D LOW", color: "text-negative" },
    { value: fmtPrice(mc[7]?.p50, asset.class), label: "7D MEDIAN", color: "text-accent" },
    { value: fmtPrice(mc[30]?.p50, asset.class), label: "30D MEDIAN", color: "text-accent" },
    { value: `${(sigma * 100).toFixed(1)}%`, label: "DAILY VOL", color: "text-text-secondary" },
    { value: fmtPrice(mc[30]?.p90, asset.class), label: "BULL P90", color: "text-positive" },
  ];

  return (
    <Card label="Key Stats">
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-white/[0.015] border border-border rounded-lg px-3 py-2.5">
            <div className={`text-sm font-bold font-mono tabular-nums ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-muted tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
