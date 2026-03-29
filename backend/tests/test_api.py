"""backend/tests/test_api.py — Smoke tests"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

# Mock asyncpg pool before importing app
import sys
mock_db = MagicMock()
mock_db.connect = AsyncMock()
mock_db.disconnect = AsyncMock()
mock_db.fetchval = AsyncMock(return_value=1)
mock_db.fetch    = AsyncMock(return_value=[])

with patch("services.db.db", mock_db):
    from main import app

client = TestClient(app)

def test_health():
    with patch("main.db", mock_db):
        resp = client.get("/health")
        assert resp.status_code == 200

def test_rsi_calculation():
    from routers.ml import compute_rsi
    closes = [10,11,10.5,12,11,13,12.5,14,13,15,14,16,15,17,16]
    assert 0 <= compute_rsi(closes, 14) <= 100

def test_bollinger_bands():
    from routers.ml import compute_bollinger
    bb = compute_bollinger(list(range(20, 40)), 20)
    assert bb["upper"] > bb["middle"] > bb["lower"]

def test_macd_structure():
    from routers.ml import compute_macd
    macd = compute_macd([float(i) + (i%3)*0.5 for i in range(30)])
    assert "macd" in macd and "crossover" in macd
