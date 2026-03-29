import { ASSET_CLASSES } from "./constants";

export function boxMuller() {
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

export function runMonteCarlo(price, assetClass, paths = 80, days = 30) {
  const { sigma, mu } = ASSET_CLASSES[assetClass] || ASSET_CLASSES.commodity;
  const allPaths = Array.from({ length: paths }, () => {
    const p = [price];
    for (let d = 1; d <= days; d++) {
      p.push(p[d - 1] * Math.exp((mu - 0.5 * sigma ** 2) + sigma * boxMuller()));
    }
    return p;
  });
  return Array.from({ length: days + 1 }, (_, d) => {
    const vals = allPaths.map(p => p[d]).sort((a, b) => a - b);
    return {
      day: d === 0 ? "Now" : `+${d}d`,
      p10: vals[Math.floor(paths * 0.1)],
      p25: vals[Math.floor(paths * 0.25)],
      p50: vals[Math.floor(paths * 0.5)],
      p75: vals[Math.floor(paths * 0.75)],
      p90: vals[Math.floor(paths * 0.9)],
    };
  });
}

export function generateOHLC(base, sigma = 0.018, days = 60) {
  let close = base;
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const open = close;
    const dayVol = base * sigma * 1.5;
    close = Math.max(base * 0.4, open + (Math.random() - 0.485) * dayVol);
    const high = Math.max(open, close) + Math.random() * dayVol * 0.5;
    const low = Math.min(open, close) - Math.random() * dayVol * 0.5;
    const bullish = close >= open;
    return {
      date: new Date(now - (days - 1 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      open: +open.toFixed(base > 100 ? 2 : 4),
      high: +high.toFixed(base > 100 ? 2 : 4),
      low: +low.toFixed(base > 100 ? 2 : 4),
      close: +close.toFixed(base > 100 ? 2 : 4),
      vol: Math.floor(Math.random() * 80000 + 20000),
      bullish,
    };
  });
}

export function generateHistory(base, assetClass) {
  const { sigma } = ASSET_CLASSES[assetClass] || ASSET_CLASSES.commodity;
  const dailyVol = base * sigma * 1.2;
  let price = base;
  const now = Date.now();
  return Array.from({ length: 61 }, (_, i) => {
    if (i > 0) price = Math.max(price * 0.5, price + (Math.random() - 0.49) * dailyVol);
    return {
      date: new Date(now - (60 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: +price.toFixed(assetClass === "forex" ? 4 : price > 1000 ? 0 : 2),
    };
  });
}

export function computeRSI(data, period = 14) {
  const closes = data.map(d => typeof d === "number" ? d : d.close);
  if (closes.length < period + 1) return 50;
  const deltas = closes.slice(1).map((v, i) => v - closes[i]);
  const recent = deltas.slice(-period);
  const gains = recent.map(d => Math.max(0, d));
  const losses = recent.map(d => Math.max(0, -d));
  const ag = gains.reduce((a, b) => a + b, 0) / period || 1e-9;
  const al = losses.reduce((a, b) => a + b, 0) / period || 1e-9;
  return Math.round(100 - (100 / (1 + ag / al)));
}

export function computeMACD(closes) {
  const ema = (data, n) => {
    const k = 2 / (n + 1);
    return data.reduce((e, v) => v * k + e * (1 - k));
  };
  if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 };
  const e12 = ema(closes.slice(-26), 12);
  const e26 = ema(closes.slice(-26), 26);
  const macd = e12 - e26;
  const sig = macd * 0.8;
  return { macd, signal: sig, hist: macd - sig, crossover: macd > sig ? "bullish" : "bearish" };
}
