"""
config.py — Central config, loaded from environment variables.
Copy .env.example to .env and fill in your values.
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # PostgreSQL — set DATABASE_URL in .env
    # Format: postgresql://user:password@host:5432/dbname
    database_url: str = "postgresql://nexo:nexo@localhost:5432/nexo"
    anthropic_api_key: str = ""
    finbert_model: str = "ProsusAI/finbert"    # HuggingFace model ID
    finbert_device: str = "cpu"                # "cpu" or "cuda"
    lstm_epochs: int = 50
    lstm_lookback: int = 20                    # days of history as input
    isolation_contamination: float = 0.05      # expected anomaly rate
    railway_env: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()

WATCHLIST = [
    "CL=F",   # WTI Crude Oil
    "BZ=F",   # Brent Crude
    "NG=F",   # Natural Gas
    "GC=F",   # Gold
    "SI=F",   # Silver
    "HG=F",   # Copper
]

COMMODITY_META = {
    "CL=F": {"name": "WTI Crude Oil",    "sigma": 0.018, "sector": "Energy"},
    "BZ=F": {"name": "Brent Crude Oil",  "sigma": 0.017, "sector": "Energy"},
    "NG=F": {"name": "Natural Gas",      "sigma": 0.030, "sector": "Energy"},
    "GC=F": {"name": "Gold Futures",     "sigma": 0.010, "sector": "Metals"},
    "SI=F": {"name": "Silver Futures",   "sigma": 0.016, "sector": "Metals"},
    "HG=F": {"name": "Copper Futures",   "sigma": 0.015, "sector": "Metals"},
}
