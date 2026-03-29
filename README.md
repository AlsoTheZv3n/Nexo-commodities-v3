# Nexo Commodities v3

Real-time commodity trading analytics platform with ML-driven predictions, AI-powered market analysis, and automated news scraping.

## Architecture

```
Frontend (React + Tailwind)  <->  Backend (FastAPI)  <->  PostgreSQL
     |                              |         |
  Recharts                     Scrapy      yfinance
  TensorFlow.js               FinBERT     Yahoo Finance
  lucide-react                 LSTM/PyTorch
                               Isolation Forest
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, Recharts, TensorFlow.js, lucide-react |
| **Backend** | FastAPI, Python 3.11+, APScheduler, asyncpg |
| **ML** | PyTorch (LSTM), scikit-learn (Isolation Forest), HuggingFace (FinBERT) |
| **Scraping** | Scrapy (OilPrice.com, MarketWatch) with anti-detection |
| **AI Agent** | Claude API (Anthropic) with web search |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker Compose, Nginx, GitHub Actions CI/CD |

## Features

- **Real-time OHLC data** from Yahoo Finance (17 commodities: Energy, Metals, Agriculture)
- **Candlestick charts** with hover tooltips, volume bars, 9 timeframes (1D to YTD), fullscreen expand
- **Monte Carlo forecasting** (Geometric Brownian Motion, 80 paths, 30-day horizon)
- **Claude AI Agent** with web search for live market analysis and BUY/SELL/HOLD signals
- **Automated news scraping** via Scrapy (OilPrice.com, MarketWatch) with ticker matching
- **AI news sentiment** via Claude API with web search
- **Technical indicators** (RSI, MACD, SMA 20/50, Bollinger Bands, ATR, OBV)
- **LSTM price predictions** (1d/3d/7d horizons)
- **Anomaly detection** via Isolation Forest
- **Toast notifications** for agent/news completion
- **Overview + Detail** drill-down navigation

## Commodities Covered

| Sector | Tickers |
|--------|---------|
| **Energy** | WTI Crude (CL=F), Brent (BZ=F), Natural Gas (NG=F), Heating Oil (HO=F), Gasoline (RB=F) |
| **Metals** | Gold (GC=F), Silver (SI=F), Copper (HG=F), Platinum (PL=F), Palladium (PA=F) |
| **Agriculture** | Corn (ZC=F), Wheat (ZW=F), Soybean (ZS=F), Coffee (KC=F), Sugar (SB=F), Cocoa (CC=F), Cotton (CT=F) |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for PostgreSQL)

### 1. Database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and DATABASE_URL
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npx vite --port 3050 --host
```

### 4. Open

Visit `http://localhost:3050`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ohlc/{ticker}?days=365` | OHLC price history |
| POST | `/api/ohlc/refresh/{ticker}` | Force refresh from Yahoo |
| GET | `/api/ml/predict/{ticker}` | LSTM predictions |
| GET | `/api/ml/anomaly/{ticker}` | Anomaly detection |
| GET | `/api/ml/features/{ticker}` | Technical indicators |
| POST | `/api/agent/chat` | Claude API proxy |
| GET | `/api/scrape/news?ticker=CL=F` | Scraped commodity news |
| POST | `/api/scrape/run` | Trigger manual scrape |
| GET | `/api/scrape/status` | Scraper status |
| GET | `/api/news/{ticker}` | RSS news with sentiment |
| GET | `/api/alerts/` | Live alerts |
| WS | `/ws/{ticker}` | WebSocket price stream |
| GET | `/health` | Health check |

## Project Structure

```
backend/
  main.py              # FastAPI app, WebSocket, cron jobs
  config.py            # Settings, watchlist
  routers/             # API endpoints (ohlc, ml, news, alerts, agent, scrape)
  ml/                  # LSTM, Isolation Forest, FinBERT
  services/            # DB, yfinance scraper, RSS fetcher
  scraper/             # Scrapy spiders (OilPrice, MarketWatch)
frontend/
  src/
    Dashboard.jsx      # Main app with overview + detail routing
    lib/               # Constants, math utilities
    components/        # UI components (Sidebar, Charts, Cards, Toast)
infra/
  schema.sql           # PostgreSQL schema
  nginx.conf           # Reverse proxy config
  setup-vm.sh          # VM setup script
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key (for agent + news) |
| `VITE_API_URL` | Backend URL for frontend |
| `VITE_WS_URL` | WebSocket URL for frontend |

## License

MIT
