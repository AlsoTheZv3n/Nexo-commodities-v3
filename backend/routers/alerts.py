"""routers/alerts.py"""
from fastapi import APIRouter, Query
from services.db import db

router = APIRouter()

@router.get("/")
async def get_alerts(limit: int = Query(50), unseen_only: bool = False):
    if unseen_only:
        rows = await db.fetch(
            "SELECT * FROM alerts WHERE seen=false ORDER BY created_at DESC LIMIT $1", limit)
    else:
        rows = await db.fetch(
            "SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1", limit)
    return {"alerts": rows}

@router.patch("/{alert_id}/seen")
async def mark_seen(alert_id: int):
    await db.execute("UPDATE alerts SET seen=true WHERE id=$1", alert_id)
    return {"ok": True}
