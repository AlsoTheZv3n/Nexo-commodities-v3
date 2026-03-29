import { useRef, useState, useEffect } from "react";

export default function VolumeBar({ data, height = 32 }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);

  useEffect(() => {
    const obs = new ResizeObserver(e => setW(e[0].contentRect.width));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const PL = 52, PR = 8;
  const vis = data.slice(-50);
  const maxV = Math.max(...vis.map(d => d.vol));
  const sx = i => PL + (i / (vis.length - 1 || 1)) * (w - PL - PR);
  const bw = Math.max(2, (w - PL - PR) / vis.length * 0.55);

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg width={w} height={height}>
        <text x={PL - 6} y={11} textAnchor="end" fill="var(--color-muted)" fontSize={8} fontFamily="var(--font-mono)">
          VOL
        </text>
        {vis.map((d, i) => {
          const bh = Math.max(1, (d.vol / maxV) * height);
          return (
            <rect key={i} x={sx(i) - bw / 2} y={height - bh} width={bw} height={bh}
              fill={d.bullish ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"} rx={1} />
          );
        })}
      </svg>
    </div>
  );
}
