/**
 * hooks/useMarketData.js
 * 
 * Handles:
 * - WebSocket connection to backend (live price ticks)
 * - REST API calls for OHLC, ML predictions, news
 * - Browser-side TF.js Linear Regression
 * - Reconnect logic
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

const API_BASE  = import.meta.env.VITE_API_URL  || "http://localhost:8000";
const WS_BASE   = import.meta.env.VITE_WS_URL   || "ws://localhost:8000";

// ── WebSocket Hook ────────────────────────────────────────
export function useLiveTick(ticker) {
  const [tick, setTick]     = useState(null);
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    const ws = new WebSocket(`${WS_BASE}/ws/${ticker}`);
    wsRef.current = ws;

    ws.onopen  = () => setStatus("connected");
    ws.onclose = () => {
      setStatus("disconnected");
      retryRef.current = setTimeout(connect, 3000);  // reconnect in 3s
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "tick") setTick(msg);
    };
  }, [ticker]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { tick, wsStatus: status };
}

// ── OHLC Data Hook ────────────────────────────────────────
export function useOHLC(ticker) {
  const [bars,    setBars]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`${API_BASE}/api/ohlc/${ticker}`)
      .then(r => r.json())
      .then(d => { setBars(d.bars || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [ticker]);

  return { bars, loading, error };
}

// ── ML Predictions Hook ───────────────────────────────────
export function useMLPredictions(ticker) {
  const [lstm,      setLstm]      = useState(null);
  const [anomaly,   setAnomaly]   = useState(null);
  const [features,  setFeatures]  = useState(null);
  const [loading,   setLoading]   = useState(false);

  const fetch_ml = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    try {
      const [lstmRes, anomalyRes, featRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/ml/predict/${ticker}`).then(r => r.json()),
        fetch(`${API_BASE}/api/ml/anomaly/${ticker}`).then(r => r.json()),
        fetch(`${API_BASE}/api/ml/features/${ticker}`).then(r => r.json()),
      ]);
      if (lstmRes.status    === "fulfilled") setLstm(lstmRes.value);
      if (anomalyRes.status === "fulfilled") setAnomaly(anomalyRes.value);
      if (featRes.status    === "fulfilled") setFeatures(featRes.value);
    } catch (e) {
      console.error("ML fetch error:", e);
    }
    setLoading(false);
  }, [ticker]);

  useEffect(() => { fetch_ml(); }, [fetch_ml]);
  return { lstm, anomaly, features, mlLoading: loading, refresh: fetch_ml };
}

// ── Browser-side TF.js Linear Regression ─────────────────
export async function runBrowserLinearRegression(closes) {
  /**
   * Lightweight linear regression in the browser.
   * Features: [normalized_index, rsi_norm, momentum_5d, volatility_5d]
   * Target:   next-day return (up/down)
   */
  if (closes.length < 20) return null;

  const n = closes.length;
  const features = [], labels = [];

  for (let i = 10; i < n - 1; i++) {
    const window = closes.slice(i - 10, i);
    const rsi = computeRSI(window, 9);
    const mom5 = (closes[i] - closes[i-5]) / closes[i-5];
    const vol5 = stdDev(closes.slice(i-5, i)) / closes[i];
    const idx  = i / n;
    features.push([idx, rsi/100, mom5, vol5]);
    labels.push(closes[i+1] > closes[i] ? 1 : 0);
  }

  const xs = tf.tensor2d(features);
  const ys = tf.tensor1d(labels);

  // Simple logistic regression via gradient descent
  const w = tf.variable(tf.randomNormal([4, 1]));
  const b = tf.variable(tf.scalar(0));
  const optim = tf.train.adam(0.01);

  for (let epoch = 0; epoch < 100; epoch++) {
    optim.minimize(() => {
      const pred = xs.matMul(w).add(b).sigmoid().squeeze();
      return tf.losses.sigmoidCrossEntropy(ys, pred);
    });
  }

  // Predict on most recent window
  const lastWindow = closes.slice(-10);
  const rsi  = computeRSI(lastWindow, 9);
  const mom5 = (closes[n-1] - closes[n-6]) / closes[n-6];
  const vol5 = stdDev(closes.slice(-5)) / closes[n-1];
  const xLast = tf.tensor2d([[1.0, rsi/100, mom5, vol5]]);
  const prob  = xLast.matMul(w).add(b).sigmoid().dataSync()[0];

  // Cleanup
  xs.dispose(); ys.dispose(); w.dispose(); b.dispose(); xLast.dispose();

  return {
    prob_up: parseFloat(prob.toFixed(4)),
    signal: prob > 0.55 ? "buy" : prob < 0.45 ? "sell" : "hold",
    confidence: parseFloat(Math.abs(prob - 0.5).toFixed(4)) * 2,
  };
}

// ── Indicator Helpers (browser-side) ─────────────────────
export function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const deltas = closes.slice(1).map((v, i) => v - closes[i]);
  const gains  = deltas.slice(-period).map(d => Math.max(0, d));
  const losses = deltas.slice(-period).map(d => Math.max(0, -d));
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
  const e12  = ema(closes.slice(-26), 12);
  const e26  = ema(closes.slice(-26), 26);
  const macd = e12 - e26;
  const sig  = macd * 0.8;
  return { macd, signal: sig, hist: macd - sig, crossover: macd > sig ? "bullish" : "bearish" };
}

export function computeBollinger(closes, period = 20) {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, position: 0.5 };
  const w   = closes.slice(-period);
  const mid = w.reduce((a, b) => a + b) / period;
  const std = Math.sqrt(w.reduce((a, v) => a + (v - mid) ** 2, 0) / period);
  const upper = mid + 2 * std, lower = mid - 2 * std;
  const last  = closes[closes.length - 1];
  return { upper, middle: mid, lower, position: (last - lower) / (upper - lower + 1e-9), squeeze: (upper-lower)/mid < 0.1 };
}

function stdDev(arr) {
  const m = arr.reduce((a, b) => a + b) / arr.length;
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}
