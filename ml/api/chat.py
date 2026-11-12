"""Crop assistant chat, answered by a Groq-hosted LLM.

Contract (lib/assistant/api.ts):
    POST /chat  { message, language: "en" | "ur", report, history: [{role, text, language}] }
    ->          { reply }
"""

import json
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from groq import APIConnectionError, APIStatusError, AsyncGroq, RateLimitError
from pydantic import BaseModel, Field

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_HISTORY_TURNS = 20

router = APIRouter()
_client: AsyncGroq | None = None


def client() -> AsyncGroq:
    global _client
    if _client is None:
        if not os.getenv("GROQ_API_KEY"):
            raise HTTPException(status_code=503, detail="Assistant is not configured (GROQ_API_KEY missing).")
        _client = AsyncGroq()
    return _client


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)
    language: Literal["en", "ur"] = "en"


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "ur"]
    report: dict
    history: list[Turn] = []


class ChatReply(BaseModel):
    reply: str


LANGUAGE_RULE = {
    "en": "Reply in simple English.",
    "ur": "Reply only in Urdu, written in Urdu (Nastaliq/Arabic) script. Never use Roman Urdu or English sentences.",
}


def system_prompt(report: dict, language: str) -> str:
    return (
        "You are Fasl, a crop assistant for agriculture officers and farmers in Pakistan. "
        "You help them understand one crop scan report produced by Fasl's image model and decide what to do next.\n\n"
        "Rules:\n"
        "- Base answers on the report below. Do not invent numbers, disease names, severity, dates or yields "
        "that the report does not contain. If the report doesn't say, say so plainly.\n"
        "- The report comes from an image model and can be wrong. For any disease or spraying decision, advise "
        "confirming with the local agriculture extension officer before using chemicals; never give pesticide doses.\n"
        "- If asked about something unrelated to crops or farming, politely bring the conversation back to the crop.\n"
        "- Keep answers short: 2 to 5 sentences, practical, no markdown, no emojis. The reply may be read aloud.\n"
        f"- {LANGUAGE_RULE[language]}\n\n"
        f"Crop scan report (JSON):\n{json.dumps(report, ensure_ascii=False)}"
    )


@router.post("/chat", response_model=ChatReply)
async def chat(req: ChatRequest) -> ChatReply:
    messages = [{"role": "system", "content": system_prompt(req.report, req.language)}]
    messages += [{"role": t.role, "content": t.text} for t in req.history[-MAX_HISTORY_TURNS:]]
    messages.append({"role": "user", "content": req.message})

    try:
        completion = await client().chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=2000,  # gpt-oss reasons before answering; leave room for both
            **({"reasoning_effort": "low"} if MODEL.startswith("openai/gpt-oss") else {}),
        )
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Assistant is busy. Try again in a moment.")
    except APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not reach the assistant service.")
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Assistant service error ({e.status_code}).")

    reply = (completion.choices[0].message.content or "").strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Assistant returned an empty answer.")
    return ChatReply(reply=reply)
