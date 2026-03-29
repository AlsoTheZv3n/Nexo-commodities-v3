-- ── Nexo Commodities — PostgreSQL Schema ──────────────────
-- Run: psql -U nexo -d nexo -f schema.sql
-- Or:  docker exec -i nexo-postgres psql -U nexo -d nexo < infra/schema.sql

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE IF NOT EXISTS ohlc (
    id         BIGSERIAL PRIMARY KEY,
    ticker     TEXT      NOT NULL,
    date       DATE      NOT NULL,
    open       FLOAT8    NOT NULL,
    high       FLOAT8    NOT NULL,
    low        FLOAT8    NOT NULL,
    close      FLOAT8    NOT NULL,
    volume     BIGINT    DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ticker, date)
);
CREATE INDEX IF NOT EXISTS idx_ohlc_ticker_date ON ohlc (ticker, date DESC);

CREATE TABLE IF NOT EXISTS news (
    id              BIGSERIAL PRIMARY KEY,
    ticker          TEXT NOT NULL,
    headline        TEXT NOT NULL,
    source          TEXT,
    url             TEXT UNIQUE,
    sentiment       TEXT CHECK (sentiment IN ('bullish','bearish','neutral')),
    sentiment_score FLOAT4,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_ticker_pub ON news (ticker, published_at DESC);

CREATE TABLE IF NOT EXISTS ml_predictions (
    id         BIGSERIAL PRIMARY KEY,
    ticker     TEXT    NOT NULL,
    model      TEXT    NOT NULL,
    pred_1d    FLOAT8,
    pred_3d    FLOAT8,
    pred_7d    FLOAT8,
    direction  TEXT,
    confidence FLOAT4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ml_ticker ON ml_predictions (ticker, created_at DESC);

CREATE TABLE IF NOT EXISTS anomalies (
    id         BIGSERIAL PRIMARY KEY,
    ticker     TEXT    NOT NULL,
    score      FLOAT4  NOT NULL,
    severity   TEXT,
    message    TEXT,
    bar_date   DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id         BIGSERIAL PRIMARY KEY,
    ticker     TEXT,
    type       TEXT,
    severity   TEXT,
    message    TEXT,
    seen       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_unseen ON alerts (seen) WHERE seen = FALSE;
