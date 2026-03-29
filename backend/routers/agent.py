"""
Proxy for Anthropic API calls — avoids CORS issues from browser.
Frontend calls /api/agent/chat instead of api.anthropic.com directly.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from config import settings

router = APIRouter()

class AgentRequest(BaseModel):
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 1500
    messages: list
    tools: list | None = None

@router.post("/chat")
async def agent_chat(req: AgentRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    body = {
        "model": req.model,
        "max_tokens": req.max_tokens,
        "messages": req.messages,
    }
    if req.tools:
        body["tools"] = req.tools

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
            },
            json=body,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()
