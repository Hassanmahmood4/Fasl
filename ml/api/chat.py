"""Crop assistant chat, answered by a Groq-hosted LLM.

Contract (lib/assistant/api.ts):
    POST /chat  { message, language: "en" | "ur", report, history: [{role, text, language}] }
    ->          { reply }
"""

import json
import os
import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from groq import APIConnectionError, APIStatusError, AsyncGroq, RateLimitError
from pydantic import BaseModel, Field

from .report import DISEASE_NAMES, DISEASE_UR, STAGE_NAMES, STAGE_UR

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
    "ur": (
        "Reply only in Urdu, written in Urdu (Nastaliq/Arabic) script. Never use Roman Urdu, English words, "
        "or English names in brackets after Urdu words."
    ),
}

# Report display names -> the Urdu terms the spoken summary uses (report.py), so chat and audio agree.
STAGE_TERMS_UR = {STAGE_NAMES[k]: v for k, v in STAGE_UR.items()}
DISEASE_TERMS_UR = {DISEASE_NAMES[k]: v for k, v in DISEASE_UR.items()}
STAGE_ORDER_UR = "ابتدائی بڑھوتری، پھول آنا، دانہ بننا، پکنا"

# "(Loose smut)", "(Ripening)": English glosses the model sometimes adds despite the rule.
ENGLISH_GLOSS = re.compile(r"\s*\([A-Za-z][A-Za-z0-9\s.,'\-‐-―]*\)")


def strip_english_glosses(text: str) -> str:
    """Removes bracketed English, innermost first, so "(Brown (leaf) rust)" goes too."""
    while (cleaned := ENGLISH_GLOSS.sub("", text)) != text:
        text = cleaned
    return text.strip()


def localise_report(report: dict) -> dict:
    """The report with stage and disease names in Urdu, so the model has no English name to copy."""
    out = json.loads(json.dumps(report))
    stage, health = out.get("stage"), out.get("health")
    if isinstance(stage, dict) and stage.get("name") in STAGE_TERMS_UR:
        stage["name"] = STAGE_TERMS_UR[stage["name"]]
    if isinstance(health, dict) and health.get("disease") in DISEASE_TERMS_UR:
        health["disease"] = DISEASE_TERMS_UR[health["disease"]]
    return out


def urdu_terms(report: dict) -> str:
    """Urdu names for this report's stage and disease, phrased the way they are used in sentences."""
    lines = [f"Urdu terms to use (stage order: {STAGE_ORDER_UR}):"]
    stage = STAGE_TERMS_UR.get(str(report.get("stage", {}).get("name", "")))
    if stage:
        lines.append(f"- This crop's stage: \"{stage} میں\" (for example: فصل {stage} میں ہے)")
    disease = DISEASE_TERMS_UR.get(str(report.get("health", {}).get("disease", "")))
    if disease:
        lines.append(f"- This crop's disease: {disease}")
    lines.append("- Harvest: کٹائی. Agriculture extension officer: محکمہ زراعت کا افسر")
    return "\n".join(lines)

# Facts about wheat the model's report relies on but doesn't state.
CROP_FACTS = (
    "Wheat growth stages, in order: Vegetative (1), Flowering (2), Grain filling (3), Ripening (4). "
    "Wheat is harvested only after Ripening, once the grains are hard and dry; it is never harvested at "
    "Flowering or Grain filling. The report's stage.index counts from 1 out of stage.total."
)


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
        "- If stage.confidence is below 0.6, the stage is uncertain: say so, and do not give a harvest time.\n"
        "- Keep answers short: 2 to 5 sentences, practical, no markdown, no emojis. The reply may be read aloud.\n"
        f"- {LANGUAGE_RULE[language]}\n\n"
        f"{CROP_FACTS}\n\n"
        + (f"{urdu_terms(report)}\n\n" if language == "ur" else "")
        +
        f"Crop scan report (JSON):\n"
        f"{json.dumps(localise_report(report) if language == 'ur' else report, ensure_ascii=False)}"
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
    if req.language == "ur":
        reply = strip_english_glosses(reply)
    if not reply:
        raise HTTPException(status_code=502, detail="Assistant returned an empty answer.")
    return ChatReply(reply=reply)
