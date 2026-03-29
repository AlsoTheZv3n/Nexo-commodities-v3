import { useState } from "react";
import {
  Droplets, Flame, Gem, CircleDot, Wheat, Coffee, Candy, Shirt, Plus, Search
} from "lucide-react";
import { TICKER_DB, SECTORS, getAssetInfo, fmtPrice } from "../lib/constants";

const ICON_MAP = {
  "CL=F": Droplets, "BZ=F": Droplets, "NG=F": Flame,
  "HO=F": Droplets, "RB=F": Droplets,
  "GC=F": Gem, "SI=F": Gem, "HG=F": CircleDot,
  "PL=F": Gem, "PA=F": Gem,
  "ZC=F": Wheat, "ZW=F": Wheat, "ZS=F": Wheat,
  "KC=F": Coffee, "SB=F": Candy, "CC=F": Coffee, "CT=F": Shirt,
};

function getIcon(ticker) {
  if (ICON_MAP[ticker]) return ICON_MAP[ticker];
  return Droplets;
}

export default function Sidebar({ watchlist, active, onSelect, onAdd, prices, prevPrices, sector, onSectorChange }) {
  const [input, setInput] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t && !watchlist.includes(t)) {
      onAdd(t);
      setInput("");
    }
  };

  const filtered = watchlist.filter(t => {
    if (sector === "All") return true;
    const info = getAssetInfo(t);
    return info.sector === sector;
  });

  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-border flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="text-sm font-semibold tracking-widest text-accent">NEXO</div>
        <div className="text-[10px] text-muted tracking-wider mt-0.5">Commodities & Markets</div>
      </div>

      {/* Sector Filter */}
      <div className="px-3 py-3 border-b border-border">
        <div className="text-[9px] tracking-[0.16em] text-muted uppercase mb-2 px-1">Sector</div>
        <div className="flex flex-wrap gap-1">
          {SECTORS.map(s => (
            <button
              key={s}
              onClick={() => onSectorChange(s)}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                sector === s
                  ? "bg-accent/10 text-accent border-accent/25"
                  : "bg-transparent text-muted border-border hover:text-text-primary hover:bg-white/[0.03]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div className="flex-1 py-2">
        <div className="text-[9px] tracking-[0.16em] text-muted uppercase px-4 mb-2">Watchlist</div>
        {filtered.map(t => {
          const info = getAssetInfo(t);
          const Icon = getIcon(t);
          const px = prices[t] || info.base;
          const prev = prevPrices[t] || px;
          const isUp = px >= prev;
          const isActive = active === t;

          return (
            <button
              key={t}
              onClick={() => onSelect(t)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors border-l-2 cursor-pointer ${
                isActive
                  ? "bg-accent/[0.07] border-l-accent"
                  : "border-l-transparent hover:bg-white/[0.02]"
              }`}
            >
              <Icon size={13} className={isActive ? "text-accent" : "text-muted"} />
              <span className={`text-[11px] font-medium flex-1 ${isActive ? "text-text-primary" : "text-text-secondary"}`}>
                {info.short}
              </span>
              <span className={`text-[11px] font-mono tabular-nums ${isUp ? "text-positive" : "text-negative"}`}>
                {fmtPrice(px, info.class)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Ticker */}
      <div className="px-3 py-3 border-t border-border">
        <form onSubmit={handleAdd} className="flex gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Add ticker..."
              className="w-full bg-white/[0.04] border border-border rounded-md text-text-primary text-[11px] font-mono py-1.5 pl-7 pr-2 outline-none focus:border-accent/50 placeholder:text-muted/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="p-1.5 rounded-md border border-border bg-white/[0.03] text-muted hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[8px] text-muted/60 tracking-wider leading-relaxed">
          SIMULATED DATA<br />NOT FINANCIAL ADVICE
        </div>
      </div>
    </aside>
  );
}
