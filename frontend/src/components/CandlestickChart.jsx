import { useRef, useState, useEffect } from "react";
import { fmtPrice } from "../lib/constants";

export default function CandlestickChart({ data, currentPrice, height = 300, assetClass }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 800, h: height });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setSize({ w: r.width, h: height });
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [height]);

  const PL = 64, PR = 12, PT = 12, PB = 28;
  const W = size.w - PL - PR;
  const H = size.h - PT - PB;
  const visible = data.slice(-Math.min(data.length, 60));

  if (!visible.length) return <div ref={ref} style={{ width: "100%", height }} className="flex items-center justify-center text-muted text-xs">No data</div>;

  const allH = visible.flatMap(d => [d.high, d.low]);
  const minP = Math.min(...allH) * 0.999;
  const maxP = Math.max(...allH) * 1.001;
  const sy = v => PT + H - ((v - minP) / (maxP - minP)) * H;
  const sx = i => PL + (i / (visible.length - 1 || 1)) * W;
  const bw = Math.max(4, Math.min(16, W / visible.length * 0.6));
  const yTicks = Array.from({ length: 6 }, (_, i) => minP + (maxP - minP) * i / 5);
  const xInt = Math.max(1, Math.floor(visible.length / 6));

  const hoverData = hover !== null ? visible[hover] : null;

  return (
    <div ref={ref} style={{ width: "100%", height }} className="relative">
      {/* Hover tooltip */}
      {hoverData && (
        <div className="absolute top-2 right-3 bg-card/95 border border-border rounded-lg px-3 py-2 text-[11px] font-mono z-10 backdrop-blur-sm">
          <div className="text-text-primary font-semibold mb-1">{hoverData.date}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-muted">O</span><span className="text-text-secondary">{fmtPrice(hoverData.open, assetClass)}</span>
            <span className="text-muted">H</span><span className="text-positive">{fmtPrice(hoverData.high, assetClass)}</span>
            <span className="text-muted">L</span><span className="text-negative">{fmtPrice(hoverData.low, assetClass)}</span>
            <span className="text-muted">C</span><span className={hoverData.bullish ? "text-positive" : "text-negative"}>{fmtPrice(hoverData.close, assetClass)}</span>
            <span className="text-muted">Vol</span><span className="text-text-secondary">{(hoverData.vol || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      <svg width={size.w} height={size.h} className="select-none">
        {/* Grid lines + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PL} y1={sy(v)} x2={size.w - PR} y2={sy(v)} stroke="var(--color-border)" strokeDasharray="2 4" strokeOpacity={0.5} />
            <text x={PL - 8} y={sy(v) + 4} textAnchor="end" fill="var(--color-text-secondary)" fontSize={11} fontFamily="var(--font-mono)" fontWeight="500">
              {fmtPrice(v, assetClass)}
            </text>
          </g>
        ))}

        {/* Current price line + label */}
        <line x1={PL} y1={sy(currentPrice)} x2={size.w - PR} y2={sy(currentPrice)} stroke="var(--color-accent)" strokeDasharray="4 3" strokeOpacity={0.4} strokeWidth={1} />
        <rect x={0} y={sy(currentPrice) - 9} width={PL - 10} height={18} rx={3} fill="var(--color-accent)" fillOpacity={0.15} />
        <text x={PL / 2 - 5} y={sy(currentPrice) + 4} textAnchor="middle" fill="var(--color-accent)" fontSize={10} fontFamily="var(--font-mono)" fontWeight="600">
          {fmtPrice(currentPrice, assetClass)}
        </text>

        {/* Hover crosshair */}
        {hover !== null && (
          <line x1={sx(hover)} y1={PT} x2={sx(hover)} y2={PT + H} stroke="var(--color-text-secondary)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 2" />
        )}

        {/* Candles */}
        {visible.map((d, i) => {
          const cx = sx(i), yO = sy(d.open), yC = sy(d.close), yH = sy(d.high), yL = sy(d.low);
          const top = Math.min(yO, yC), bodyH = Math.max(2, Math.abs(yO - yC));
          const col = d.bullish ? "var(--color-positive)" : "var(--color-negative)";
          const fill = d.bullish ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)";
          const isHovered = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }}>
              {/* Invisible wider hit area */}
              <rect x={cx - bw} y={PT} width={bw * 2} height={H} fill="transparent" />
              {/* Wick */}
              <line x1={cx} y1={yH} x2={cx} y2={top} stroke={col} strokeWidth={isHovered ? 2 : 1} strokeOpacity={0.8} />
              <line x1={cx} y1={top + bodyH} x2={cx} y2={yL} stroke={col} strokeWidth={isHovered ? 2 : 1} strokeOpacity={0.8} />
              {/* Body */}
              <rect x={cx - bw / 2} y={top} width={bw} height={bodyH}
                fill={isHovered ? col : fill} stroke={col} strokeWidth={isHovered ? 1.5 : 1} rx={1}
                fillOpacity={isHovered ? 0.4 : 1} />
            </g>
          );
        })}

        {/* X-axis labels */}
        {visible.map((d, i) => i % xInt !== 0 && i !== visible.length - 1 ? null : (
          <text key={i} x={sx(i)} y={size.h - 6} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={10} fontFamily="var(--font-mono)">
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  );
}
