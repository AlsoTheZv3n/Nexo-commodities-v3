import { ArrowLeft } from "lucide-react";
import { ASSET_CLASSES, fmtPrice, pctChange } from "../lib/constants";
import { computeRSI, computeMACD } from "../lib/math";

import Header from "./Header";
import PriceChartCard from "./PriceChartCard";
import SignalCard from "./SignalCard";
import StatsCard from "./StatsCard";
import NewsCard from "./NewsCard";
import AlertsCard from "./AlertsCard";
import MonteCarloCard from "./MonteCarloCard";
import AgentCard from "./AgentCard";
import Card from "./Card";
import ScrapedNewsCard from "./ScrapedNewsCard";

function IndicatorRow({ ohlc, asset }) {
  if (!ohlc || ohlc.length < 20) return null;
  const closes = ohlc.map(d => d.close);
  const rsi = computeRSI(ohlc);
  const macd = computeMACD(closes);
  const last = ohlc[ohlc.length - 1];
  const prev = ohlc[ohlc.length - 2];
  const dayReturn = prev ? ((last.close - prev.close) / prev.close * 100) : 0;

  // Simple moving averages
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

  // Avg volume
  const avgVol = ohlc.slice(-20).reduce((a, b) => a + (b.vol || b.volume || 0), 0) / 20;
  const lastVol = last.vol || last.volume || 0;
  const volRatio = avgVol > 0 ? (lastVol / avgVol) : 0;

  const items = [
    { label: "Day Return", value: `${dayReturn >= 0 ? "+" : ""}${dayReturn.toFixed(2)}%`, color: dayReturn >= 0 ? "text-positive" : "text-negative" },
    { label: "RSI (14)", value: rsi, color: rsi > 70 ? "text-negative" : rsi < 30 ? "text-positive" : "text-warning" },
    { label: "MACD", value: macd.macd.toFixed(3), color: macd.hist > 0 ? "text-positive" : "text-negative" },
    { label: "Signal", value: macd.signal.toFixed(3), color: "text-text-secondary" },
    { label: "MACD Cross", value: macd.crossover, color: macd.crossover === "bullish" ? "text-positive" : "text-negative" },
    { label: "SMA 20", value: fmtPrice(sma20, asset.class), color: last.close > sma20 ? "text-positive" : "text-negative" },
    ...(sma50 ? [{ label: "SMA 50", value: fmtPrice(sma50, asset.class), color: last.close > sma50 ? "text-positive" : "text-negative" }] : []),
    { label: "Vol Ratio", value: `${volRatio.toFixed(1)}x`, color: volRatio > 1.5 ? "text-warning" : "text-text-secondary" },
  ];

  return (
    <Card label="Technical Indicators" span={3}>
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <div className={`text-sm font-bold font-mono tabular-nums ${item.color}`}>{item.value}</div>
            <div className="text-[9px] text-muted tracking-wider mt-0.5 uppercase">{item.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PriceTable({ ohlc, asset }) {
  if (!ohlc || ohlc.length === 0) return null;
  const recent = ohlc.slice(-10).reverse();

  return (
    <Card label="Recent OHLC Data" span={3}>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="pb-2 pr-4 font-medium tracking-wider">DATE</th>
              <th className="pb-2 pr-4 font-medium tracking-wider text-right">OPEN</th>
              <th className="pb-2 pr-4 font-medium tracking-wider text-right">HIGH</th>
              <th className="pb-2 pr-4 font-medium tracking-wider text-right">LOW</th>
              <th className="pb-2 pr-4 font-medium tracking-wider text-right">CLOSE</th>
              <th className="pb-2 pr-4 font-medium tracking-wider text-right">VOLUME</th>
              <th className="pb-2 font-medium tracking-wider text-right">CHANGE</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((bar, i) => {
              const prevClose = i < recent.length - 1 ? recent[i + 1].close : bar.open;
              const change = ((bar.close - prevClose) / prevClose * 100);
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 pr-4 text-text-secondary">{bar.date}</td>
                  <td className="py-2 pr-4 text-right text-text-secondary">{fmtPrice(bar.open, asset.class)}</td>
                  <td className="py-2 pr-4 text-right text-positive">{fmtPrice(bar.high, asset.class)}</td>
                  <td className="py-2 pr-4 text-right text-negative">{fmtPrice(bar.low, asset.class)}</td>
                  <td className={`py-2 pr-4 text-right font-semibold ${bar.bullish ? "text-positive" : "text-negative"}`}>
                    {fmtPrice(bar.close, asset.class)}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">{(bar.vol || bar.volume || 0).toLocaleString()}</td>
                  <td className={`py-2 text-right font-medium ${change >= 0 ? "text-positive" : "text-negative"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function DetailView({
  asset, price, ohlc, mc, sigma, alerts, news,
  signals, confidences, agentTexts,
  agentLoading, newsLoading,
  timeframe, onTimeframeChange,
  onRunAgent, onFetchNews, onBack,
}) {
  const rsi = ohlc.length > 15 ? computeRSI(ohlc) : 50;
  const openPrice = ohlc[0]?.close || price;
  const sig = signals[asset.ticker] || "—";
  const conf = confidences[asset.ticker];
  const agentText = agentTexts[asset.ticker] || "";
  const newsData = news[asset.ticker] || [];

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors mb-4 cursor-pointer group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Overview</span>
      </button>

      <Header
        asset={asset}
        price={price}
        openPrice={openPrice}
        onRunAgent={onRunAgent}
        onFetchNews={onFetchNews}
        agentLoading={agentLoading}
        newsLoading={newsLoading}
      />

      <div className="grid grid-cols-3 gap-3">
        {/* Chart - full width */}
        <div className="col-span-3">
          <PriceChartCard
            ohlc={ohlc}
            price={price}
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
            asset={asset}
          />
        </div>

        {/* Technical Indicators row */}
        <IndicatorRow ohlc={ohlc} asset={asset} />

        {/* Signal + Stats + Alerts */}
        <SignalCard
          signal={sig}
          confidence={conf}
          rsi={rsi}
          lastUpdate={agentText ? `Updated ${new Date().toLocaleTimeString("de-CH")}` : null}
        />

        <StatsCard ohlc={ohlc} mc={mc} asset={asset} sigma={sigma} />

        <AlertsCard alerts={alerts} />

        {/* News */}
        <NewsCard news={newsData} loading={newsLoading} assetName={asset.name} />

        {/* Monte Carlo */}
        <MonteCarloCard mc={mc} price={price} asset={asset} sigma={sigma} />

        {/* Agent */}
        <AgentCard text={agentText} loading={agentLoading} assetName={asset.name} />

        {/* Scraped News (from Scrapy spiders) */}
        <ScrapedNewsCard ticker={asset.ticker} />

        {/* OHLC Table */}
        <PriceTable ohlc={ohlc} asset={asset} />
      </div>
    </div>
  );
}
