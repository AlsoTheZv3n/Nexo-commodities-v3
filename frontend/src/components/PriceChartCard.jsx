import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { fmtPrice } from "../lib/constants";
import Card from "./Card";
import CandlestickChart from "./CandlestickChart";
import VolumeBar from "./VolumeBar";

const TIMEFRAMES = {
  "1D": 1, "3D": 3, "1W": 7, "2W": 14, "1M": 30, "3M": 60, "6M": 120, "1Y": 252, "YTD": -1,
};

function getYTDDays() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - jan1) / 86400000);
}

export default function PriceChartCard({ ohlc, price, timeframe, onTimeframeChange, asset }) {
  const [expanded, setExpanded] = useState(false);

  const days = timeframe === "YTD" ? getYTDDays() : TIMEFRAMES[timeframe] || 30;
  const vis = ohlc.slice(-days);
  const lastC = ohlc[ohlc.length - 1] || {};
  const isUp = lastC.close >= lastC.open;

  const ohlcItems = [
    { l: "O", v: fmtPrice(lastC.open, asset.class), color: "text-text-secondary" },
    { l: "H", v: fmtPrice(lastC.high, asset.class), color: "text-positive" },
    { l: "L", v: fmtPrice(lastC.low, asset.class), color: "text-negative" },
    { l: "C", v: fmtPrice(lastC.close, asset.class), color: isUp ? "text-positive" : "text-negative" },
  ];

  const chartHeight = expanded ? 480 : 300;

  const chartContent = (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase font-medium">
          Candlestick — {asset.short}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface rounded-md p-0.5">
            {Object.keys(TIMEFRAMES).map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`text-[10px] px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                  timeframe === tf
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-text-primary"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* OHLC row */}
      <div className="flex gap-6 mb-3">
        {ohlcItems.map(item => (
          <div key={item.l}>
            <div className="text-[9px] text-muted tracking-wider font-medium">{item.l}</div>
            <div className={`text-sm font-semibold font-mono tabular-nums ${item.color}`}>{item.v}</div>
          </div>
        ))}
        <div className="ml-auto text-right">
          <div className="text-[9px] text-muted tracking-wider font-medium">LAST</div>
          <div className={`text-sm font-semibold ${lastC.bullish ? "text-positive" : "text-negative"}`}>
            {lastC.bullish ? "▲ Bull" : "▼ Bear"}
          </div>
        </div>
      </div>

      <CandlestickChart data={vis} currentPrice={price} height={chartHeight} assetClass={asset.class} />
      <VolumeBar data={vis} />
    </>
  );

  // Expanded = full-width overlay
  if (expanded) {
    return (
      <>
        {/* Placeholder to keep grid layout */}
        <Card span={2} className="!p-0 !min-h-[100px] flex items-center justify-center">
          <span className="text-muted text-xs">Chart expanded</span>
        </Card>
        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm p-6 overflow-auto animate-fade-in">
          <div className="max-w-[1600px] mx-auto bg-card border border-border rounded-xl p-5">
            {chartContent}
          </div>
        </div>
      </>
    );
  }

  return <Card span={2}>{chartContent}</Card>;
}
