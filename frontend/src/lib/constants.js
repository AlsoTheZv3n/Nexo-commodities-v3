export const ASSET_CLASSES = {
  commodity: { sigma: 0.018, mu: 0.0001, label: "Commodity" },
};

export const TICKER_DB = {
  // Energy
  "CL=F":  { name: "WTI Crude Oil",     short: "WTI",     base: 99.64,  unit: "USD/bbl",   class: "commodity", sector: "Energy" },
  "BZ=F":  { name: "Brent Crude Oil",   short: "Brent",   base: 103.50, unit: "USD/bbl",   class: "commodity", sector: "Energy" },
  "NG=F":  { name: "Natural Gas",       short: "Nat Gas", base: 4.12,   unit: "USD/MMBtu", class: "commodity", sector: "Energy" },
  "HO=F":  { name: "Heating Oil",       short: "Heat Oil",base: 2.85,   unit: "USD/gal",   class: "commodity", sector: "Energy" },
  "RB=F":  { name: "RBOB Gasoline",     short: "Gasoline",base: 2.72,   unit: "USD/gal",   class: "commodity", sector: "Energy" },
  // Metals
  "GC=F":  { name: "Gold Futures",      short: "Gold",    base: 4524.30, unit: "USD/oz",   class: "commodity", sector: "Metals" },
  "SI=F":  { name: "Silver Futures",    short: "Silver",  base: 34.20,   unit: "USD/oz",   class: "commodity", sector: "Metals" },
  "HG=F":  { name: "Copper Futures",    short: "Copper",  base: 5.12,    unit: "USD/lb",   class: "commodity", sector: "Metals" },
  "PL=F":  { name: "Platinum Futures",  short: "Platinum",base: 1020.0,  unit: "USD/oz",   class: "commodity", sector: "Metals" },
  "PA=F":  { name: "Palladium Futures", short: "Palladium",base: 980.0,  unit: "USD/oz",   class: "commodity", sector: "Metals" },
  // Agriculture
  "ZC=F":  { name: "Corn Futures",      short: "Corn",    base: 445,    unit: "USc/bu",    class: "commodity", sector: "Agri" },
  "ZW=F":  { name: "Wheat Futures",     short: "Wheat",   base: 545,    unit: "USc/bu",    class: "commodity", sector: "Agri" },
  "ZS=F":  { name: "Soybean Futures",   short: "Soybean", base: 1020,   unit: "USc/bu",    class: "commodity", sector: "Agri" },
  "KC=F":  { name: "Coffee Futures",    short: "Coffee",  base: 395,    unit: "USc/lb",    class: "commodity", sector: "Agri" },
  "SB=F":  { name: "Sugar Futures",     short: "Sugar",   base: 18.5,   unit: "USc/lb",    class: "commodity", sector: "Agri" },
  "CC=F":  { name: "Cocoa Futures",     short: "Cocoa",   base: 8200,   unit: "USD/t",     class: "commodity", sector: "Agri" },
  "CT=F":  { name: "Cotton Futures",    short: "Cotton",  base: 67.5,   unit: "USc/lb",    class: "commodity", sector: "Agri" },
};

export const DEFAULT_WATCHLIST = ["CL=F", "BZ=F", "NG=F", "GC=F", "SI=F", "HG=F", "ZC=F", "ZW=F"];

export const SECTORS = ["All", "Energy", "Metals", "Agri"];

export const TIMEFRAMES = { "1W": 7, "2W": 14, "1M": 30, "3M": 60 };

export function getAssetInfo(ticker) {
  const t = ticker.toUpperCase();
  if (TICKER_DB[t]) return { ticker: t, ...TICKER_DB[t] };
  return { ticker: t, name: ticker, short: ticker, base: 100, unit: "USD", class: "commodity", sector: "Other" };
}

export function fmtPrice(value, assetClass) {
  if (value == null || isNaN(value)) return "—";
  if (value > 10000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value > 100) return value.toFixed(2);
  if (value > 10) return value.toFixed(2);
  return value.toFixed(3);
}

export function pctChange(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous * 100);
}
