import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Minus } from "lucide-react";
import Card from "./Card";

const signalStyles = {
  BUY:  "text-positive bg-positive/10 border-positive/25",
  SELL: "text-negative bg-negative/10 border-negative/25",
  HOLD: "text-warning bg-warning/10 border-warning/25",
};

const signalIcons = {
  BUY: ArrowUpCircle,
  SELL: ArrowDownCircle,
  HOLD: MinusCircle,
};

export default function SignalCard({ signal, confidence, rsi, lastUpdate }) {
  const style = signalStyles[signal] || "text-muted bg-muted/10 border-border";
  const Icon = signalIcons[signal] || Minus;
  const rsiColor = rsi > 70 ? "text-negative" : rsi < 30 ? "text-positive" : "text-warning";
  const rsiLabel = rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral";

  return (
    <Card label="Signal & Technicals">
      <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[180px]">
        {/* Signal Badge */}
        <div className={`flex items-center gap-2 text-2xl font-bold tracking-widest px-5 py-2.5 rounded-lg border ${style}`}>
          <Icon size={22} />
          {signal || "—"}
        </div>

        {confidence != null && (
          <div className="text-[11px] text-muted">
            Confidence <span className="text-accent font-medium">{confidence}%</span>
          </div>
        )}

        {/* RSI */}
        <div className="w-full pt-3 mt-1 border-t border-border">
          <div className="text-[9px] text-muted tracking-wider uppercase mb-1">RSI (14)</div>
          <div className={`text-2xl font-bold leading-none ${rsiColor}`}>{rsi}</div>
          <div className={`text-[10px] mt-0.5 ${rsiColor}`}>{rsiLabel}</div>
          {/* RSI bar */}
          <div className="mt-3 relative">
            <div className="h-1 bg-border rounded-full w-full relative">
              <div className="absolute left-[30%] top-0 w-px h-1 bg-positive/30" />
              <div className="absolute left-[70%] top-0 w-px h-1 bg-negative/30" />
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${rsiColor.replace("text-", "bg-")}`}
                style={{ left: `${rsi}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-muted mt-1">
              <span>0</span><span>30</span><span>70</span><span>100</span>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-muted mt-1">
          {lastUpdate || "Run agent for signal"}
        </div>
      </div>
    </Card>
  );
}
