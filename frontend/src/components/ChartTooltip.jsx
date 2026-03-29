export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-[11px] font-mono shadow-lg">
      <div className="text-muted mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "var(--color-accent)" }}>
          {p.name}: <span className="font-semibold">
            {typeof p.value === "number" ? p.value.toFixed(p.value > 1000 ? 0 : p.value < 10 ? 4 : 2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
