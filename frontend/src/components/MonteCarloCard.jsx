import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Line, ReferenceLine, Area
} from "recharts";
import Card from "./Card";
import ChartTooltip from "./ChartTooltip";
import { fmtPrice, ASSET_CLASSES } from "../lib/constants";

export default function MonteCarloCard({ mc, price, asset, sigma }) {
  const mcFiltered = mc.filter((_, i) => i % 3 === 0 || i === mc.length - 1);

  return (
    <Card label={`Monte Carlo — 30d · 80 paths · σ=${(sigma * 100).toFixed(1)}%`} span={3}>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={mcFiltered} margin={{ top: 2, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "var(--color-muted)", fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "var(--color-muted)", fontSize: 9 }} tickLine={false} axisLine={false}
            domain={["auto", "auto"]} tickFormatter={v => fmtPrice(v, asset.class)} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="p90" stroke="none" fill="var(--color-positive)" fillOpacity={0.04} name="P90" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="var(--color-bg)" fillOpacity={1} name="P10" />
          <Line type="monotone" dataKey="p90" stroke="var(--color-positive)" strokeWidth={1} strokeDasharray="4 3" dot={false} strokeOpacity={0.4} name="P90 Bull" />
          <Line type="monotone" dataKey="p10" stroke="var(--color-negative)" strokeWidth={1} strokeDasharray="4 3" dot={false} strokeOpacity={0.4} name="P10 Bear" />
          <Line type="monotone" dataKey="p50" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} name="Median" />
          <ReferenceLine y={price} stroke="var(--color-text-secondary)" strokeDasharray="2 3" strokeOpacity={0.3} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2.5 text-[10px] text-muted flex-wrap">
        {[
          { label: "7D Median", value: fmtPrice(mc[7]?.p50, asset.class), color: "text-accent" },
          { label: "30D Median", value: fmtPrice(mc[30]?.p50, asset.class), color: "text-accent" },
          { label: "P90 Bull", value: fmtPrice(mc[30]?.p90, asset.class), color: "text-positive" },
          { label: "P10 Bear", value: fmtPrice(mc[30]?.p10, asset.class), color: "text-negative" },
        ].map(s => (
          <span key={s.label}>{s.label}: <strong className={s.color}>{s.value}</strong></span>
        ))}
      </div>
    </Card>
  );
}
