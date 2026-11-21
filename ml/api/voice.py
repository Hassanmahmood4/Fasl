"""Speech to text for the crop assistant's mic, with Groq-hosted Whisper.

Browser speech recognition only works in Chrome and Edge (and Urdu barely), so the site records a
short clip itself and sends it here instead. Works the same in every browser.

    POST /transcribe   multipart: audio (webm, ogg, mp4/m4a, wav), language "en" | "ur"  ->  { text }
"""

import os
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from groq import APIConnectionError, APIStatusError, RateLimitError
from pydantic import BaseModel

from .chat import client

MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
MAX_BYTES = 4 * 1024 * 1024  # under Vercel's 4.5 MB request limit; 30 s of speech is ~0.3 MB
EXTENSIONS = {"webm": "webm", "ogg": "ogg", "mp4": "m4a", "m4a": "m4a", "mpeg": "mp3", "wav": "wav", "x-wav": "wav"}
# A few words in the clip's language steer Whisper toward farming terms and the right script.
PROMPTS = {
    "en": "A question about a wheat crop: rust, smut, septoria, harvest, spray, fertiliser.",
    "ur": "گندم کی فصل کے بارے میں سوال: کنگی، کانگیاری، کٹائی، سپرے، کھاد۔",
}

router = APIRouter()


class Transcript(BaseModel):
    text: str


@router.post("/transcribe", response_model=Transcript)
async def transcribe(
    audio: UploadFile = File(...),
    language: Literal["en", "ur"] = Form("en"),
) -> Transcript:
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="No audio received.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too long. Keep it under 30 seconds.")
    subtype = (audio.content_type or "audio/webm").split("/")[-1].split(";")[0]
    name = f"speech.{EXTENSIONS.get(subtype, 'webm')}"
    try:
        result = await client().audio.transcriptions.create(
            file=(name, data),
            model=MODEL,
            language=language,
            prompt=PROMPTS[language],
            response_format="json",
            temperature=0.0,
        )
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Voice input is busy. Please try again in a moment.")
    except APIConnectionError:
        raise HTTPException(status_code=502, detail="Speech service is unavailable.")
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Speech service error ({e.status_code}).")
    return Transcript(text=(result.text or "").strip())
