import { useState, useEffect, useCallback } from "react";
import { ASSET_CLASSES, DEFAULT_WATCHLIST, getAssetInfo, fmtPrice, pctChange } from "./lib/constants";
import { runMonteCarlo, computeRSI } from "./lib/math";

import Sidebar from "./components/Sidebar";
import WatchlistGrid from "./components/WatchlistGrid";
import DetailView from "./components/DetailView";
import ToastContainer from "./components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8002";

// Fetch real OHLC from backend (Yahoo Finance)
async function fetchOHLC(ticker, days = 365) {
  try {
    const url = `${API_BASE}/api/ohlc/${encodeURIComponent(ticker)}?days=${days}`;
    const res = await fetch(url);
    const data = await res.json();
    const bars = data.bars || [];
    // Normalize: ensure bullish flag exists
    return bars.map(b => ({
      ...b,
      date: new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bullish: b.close >= b.open,
      vol: b.volume || 0,
    }));
  } catch (err) {
    console.error(`Failed to fetch OHLC for ${ticker}:`, err);
    return [];
  }
}

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [active, setActive] = useState("CL=F");
  const [view, setView] = useState("overview"); // "overview" | "detail"
  const [sector, setSector] = useState("All");
  const [timeframe, setTimeframe] = useState("1M");
  const [dataLoading, setDataLoading] = useState(true);

  // Per-ticker state
  const [prices, setPrices] = useState({});
  const [prevPrices, setPrevPrices] = useState({});
  const [ohlcs, setOhlcs] = useState({});
  const [mcs, setMcs] = useState({});
  const [signals, setSignals] = useState({});
  const [confidences, setConfidences] = useState({});
  const [agentTexts, setAgentTexts] = useState({});
  const [newsItems, setNewsItems] = useState({});
  const [agentLoading, setAgentLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message, duration = 4000) => {
    setToasts(t => [...t, { id: Date.now() + Math.random(), type, title, message, duration }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const addAlert = useCallback((type, msg) => {
    setAlerts(a => [{
      id: Date.now() + Math.random(),
      type,
      msg,
      time: new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    }, ...a].slice(0, 12));
  }, []);

  // Load data for all watchlist tickers on mount — SEQUENTIALLY to avoid yfinance race condition
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setDataLoading(true);
      const newOhlcs = {};
      const newPrices = {};
      const newMcs = {};
      for (const ticker of watchlist) {
        if (cancelled) return;
        const bars = await fetchOHLC(ticker);
        const info = getAssetInfo(ticker);
        if (bars.length > 0) {
          newOhlcs[ticker] = bars;
          newPrices[ticker] = bars[bars.length - 1].close;
          newMcs[ticker] = runMonteCarlo(bars[bars.length - 1].close, info.class);
        } else {
          newPrices[ticker] = info.base;
          newMcs[ticker] = runMonteCarlo(info.base, info.class);
        }
      }
      setOhlcs(newOhlcs);
      setPrices(newPrices);
      setMcs(newMcs);
      setDataLoading(false);
      const loaded = Object.keys(newOhlcs).length;
      addAlert("info", `${loaded}/${watchlist.length} tickers loaded from Yahoo Finance`);
      addToast("success", "Market Data Ready", `${loaded} tickers loaded with real-time OHLC data.`);
    }
    loadAll();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulate small price ticks on top of real last close
  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        setPrevPrices({ ...prev });
        watchlist.forEach(t => {
          if (!prev[t]) return;
          const a = getAssetInfo(t);
          const { sigma } = ASSET_CLASSES[a.class] || ASSET_CLASSES.commodity;
          const base = prev[t];
          const tick = (Math.random() - 0.495) * base * sigma * 0.08;
          next[t] = +(base + tick).toFixed(a.class === "forex" ? 5 : 2);
          if (Math.abs(tick / base) > 0.008) {
            addAlert("warn", `${a.short} ${tick > 0 ? "▲" : "▼"} ${Math.abs(tick / base * 100).toFixed(3)}%`);
          }
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [watchlist, addAlert]);

  // Add new ticker
  const handleAddTicker = useCallback(async (ticker) => {
    setWatchlist(w => [...w, ticker]);
    setActive(ticker);
    const bars = await fetchOHLC(ticker);
    const info = getAssetInfo(ticker);
    if (bars.length > 0) {
      const lastClose = bars[bars.length - 1].close;
      setOhlcs(o => ({ ...o, [ticker]: bars }));
      setPrices(p => ({ ...p, [ticker]: lastClose }));
      setMcs(m => ({ ...m, [ticker]: runMonteCarlo(lastClose, info.class) }));
      addAlert("info", `${info.short}: ${bars.length} bars loaded`);
    } else {
      setPrices(p => ({ ...p, [ticker]: info.base }));
      setMcs(m => ({ ...m, [ticker]: runMonteCarlo(info.base, info.class) }));
      addAlert("warn", `${info.short}: No data from Yahoo`);
    }
  }, [addAlert]);

  // Fetch news
  const fetchNews = async () => {
    if (newsLoading) return;
    setNewsLoading(true);
    const a = getAssetInfo(active);
    const prompt = `Search the web for the 5 most recent relevant news articles about ${a.name} (${active}) markets right now.

For each article return a JSON array. Each object must have exactly these keys:
- "headline": punchy title max 12 words
- "source": news outlet name
- "time": relative e.g. "2h ago" or "Today"
- "sentiment": exactly one of "bullish", "bearish", "neutral"
- "summary": 1-2 sentences on price impact

Return ONLY a valid JSON array. No markdown. No preamble. Start with [`;
    try {
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const txt = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const match = txt.match(/\[[\s\S]*\]/);
      if (match) {
        let jsonStr = match[0];
        // Fix truncated JSON: ensure it ends with ]
        if (!jsonStr.trim().endsWith("]")) {
          // Try to close the last object and array
          const lastBrace = jsonStr.lastIndexOf("}");
          if (lastBrace > 0) jsonStr = jsonStr.slice(0, lastBrace + 1) + "]";
        }
        try {
          const items = JSON.parse(jsonStr);
          setNewsItems(n => ({ ...n, [active]: items }));
          addAlert("info", `${a.short}: ${items.length} articles loaded`);
          addToast("success", "News Loaded", `${items.length} articles for ${a.name} with sentiment analysis.`);
        } catch {
          // If still invalid, try to extract individual objects
          const objMatches = [...txt.matchAll(/\{[^{}]*"headline"[^{}]*\}/g)];
          if (objMatches.length > 0) {
            const items = objMatches.map(m => { try { return JSON.parse(m[0]); } catch { return null; } }).filter(Boolean);
            setNewsItems(n => ({ ...n, [active]: items }));
            addAlert("info", `${a.short}: ${items.length} articles loaded (partial)`);
            addToast("success", "News Loaded", `${items.length} articles recovered for ${a.name}.`);
          } else {
            addAlert("warn", `${a.short}: Could not parse news response`);
          }
        }
      }
    } catch (err) {
      addAlert("danger", `News error: ${err.message}`);
      addToast("error", "News Error", err.message);
    }
    setNewsLoading(false);
  };

  // Run Claude Agent
  const runAgent = async () => {
    if (agentLoading) return;
    setAgentLoading(true);
    const t = active;
    const a = getAssetInfo(t);
    const px = prices[t] || a.base;
    const ohlc = ohlcs[t] || [];
    const mc = mcs[t] || [];
    const lastC = ohlc[ohlc.length - 1] || {};
    const open60 = ohlc[0]?.close || px;
    const rsi = computeRSI(ohlc);
    const mc7 = mc[7] || {};
    const mc30 = mc[30] || {};

    const prompt = `You are a commodities/markets analyst. Analyse ${a.name} (${t}).

OHLC LAST CANDLE: O=${fmtPrice(lastC.open, a.class)} H=${fmtPrice(lastC.high, a.class)} L=${fmtPrice(lastC.low, a.class)} C=${fmtPrice(lastC.close, a.class)} ${lastC.bullish ? "(Bullish)" : "(Bearish)"}
CURRENT PRICE: ${fmtPrice(px, a.class)} ${a.unit || "USD"}
60D CHANGE: ${pctChange(px, open60).toFixed(2)}%
RSI(14): ${rsi} — ${rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral"}
MONTE CARLO 7D: P10=${fmtPrice(mc7.p10, a.class)} Median=${fmtPrice(mc7.p50, a.class)} P90=${fmtPrice(mc7.p90, a.class)}
MONTE CARLO 30D: P10=${fmtPrice(mc30.p10, a.class)} Median=${fmtPrice(mc30.p50, a.class)} P90=${fmtPrice(mc30.p90, a.class)}

Search the web for current ${a.name} market news and fundamentals.

Respond in EXACTLY this format:
SIGNAL: [BUY/SELL/HOLD]
CONFIDENCE: [0-100]%
TREND: [2 sentences — price action, candle pattern, RSI]
FORECAST: [2 sentences — Monte Carlo interpretation]
NEWS CONTEXT: [3 sentences — live fundamentals from web search]
RISK FACTORS: [2 sentences]
ALERT: [NONE or brief alert]`;

    try {
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const full = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const sig = full.match(/SIGNAL:\s*(BUY|SELL|HOLD)/i)?.[1]?.toUpperCase() || "—";
      const conf = parseInt(full.match(/CONFIDENCE:\s*(\d+)/)?.[1] || "0");
      const alertTxt = full.match(/ALERT:\s*(.+)/i)?.[1]?.trim() || "";

      setSignals(s => ({ ...s, [t]: sig }));
      setConfidences(c => ({ ...c, [t]: conf }));
      setMcs(m => ({ ...m, [t]: runMonteCarlo(px, a.class) }));

      if (alertTxt && !alertTxt.toLowerCase().includes("none")) {
        addAlert("danger", `${a.short}: ${alertTxt}`);
        addToast("error", `${a.short} Alert`, alertTxt, 6000);
      } else {
        addAlert("info", `${a.short} → ${sig} (${conf}%)`);
      }
      addToast("success", "Agent Complete", `${a.name}: ${sig} signal with ${conf}% confidence.`, 5000);

      setAgentLoading(false);
      let i = 0;
      const type = () => {
        if (i < full.length) {
          setAgentTexts(a => ({ ...a, [t]: full.slice(0, i + 1) }));
          i += 4;
          setTimeout(type, 7);
        }
      };
      type();
    } catch (err) {
      setAgentLoading(false);
      setAgentTexts(a => ({ ...a, [active]: `Error: ${err.message}` }));
    }
  };

  // Navigate to detail
  const openDetail = useCallback((ticker) => {
    setActive(ticker);
    setView("detail");
  }, []);

  // Derived state for active ticker
  const asset = getAssetInfo(active);
  const sigma = (ASSET_CLASSES[asset.class] || ASSET_CLASSES.commodity).sigma;
  const px = prices[active] || asset.base;
  const ohlc = ohlcs[active] || [];
  const mc = mcs[active] || [];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        watchlist={watchlist}
        active={active}
        onSelect={openDetail}
        onAdd={handleAddTicker}
        prices={prices}
        prevPrices={prevPrices}
        sector={sector}
        onSectorChange={setSector}
      />

      {view === "overview" ? (
        <main className="flex-1 p-5 overflow-y-auto">
          {dataLoading && (
            <div className="flex items-center gap-3 mb-4 px-1 text-sm text-muted animate-fade-in">
              <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              Loading market data from Yahoo Finance...
            </div>
          )}

          <div className="mb-5">
            <h1 className="text-lg font-semibold text-text-primary">Market Overview</h1>
            <p className="text-xs text-muted mt-1">Click on any asset for detailed analysis</p>
          </div>

          <WatchlistGrid
            watchlist={watchlist}
            prices={prices}
            prevPrices={prevPrices}
            ohlcs={ohlcs}
            onSelect={openDetail}
          />
        </main>
      ) : (
        <DetailView
          asset={asset}
          price={px}
          ohlc={ohlc}
          mc={mc}
          sigma={sigma}
          alerts={alerts}
          news={newsItems}
          signals={signals}
          confidences={confidences}
          agentTexts={agentTexts}
          agentLoading={agentLoading}
          newsLoading={newsLoading}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onRunAgent={runAgent}
          onFetchNews={fetchNews}
          onBack={() => setView("overview")}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
