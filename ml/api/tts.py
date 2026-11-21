"""Text-to-speech with Microsoft Edge neural voices (same voice as the sample clips).

    POST /tts                      { text, language: "en" | "ur" } -> audio/mpeg
    GET  /audio?language=&text=    the same, as a link (the report's urduAudioUrl)

Serverless instances share no memory, so nothing here depends on an earlier request;
the in-memory cache only saves repeat work on a warm instance.
"""

import hashlib
from collections import OrderedDict
from typing import Literal
from urllib.parse import urlencode

import edge_tts
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

VOICES = {"ur": "ur-PK-UzmaNeural", "en": "en-US-AriaNeural"}  # both female
CACHE_SIZE = 256

router = APIRouter()
_audio: OrderedDict[str, bytes] = OrderedDict()  # key -> mp3


def _key(text: str, language: str) -> str:
    return hashlib.sha256(f"{language}:{text}".encode()).hexdigest()[:24]


def _remember(store: OrderedDict, key: str, value) -> None:
    store[key] = value
    store.move_to_end(key)
    while len(store) > CACHE_SIZE:
        store.popitem(last=False)


async def synthesize(text: str, language: str) -> bytes:
    key = _key(text, language)
    if key in _audio:
        _audio.move_to_end(key)
        return _audio[key]
    chunks = []
    try:
        async for chunk in edge_tts.Communicate(text, VOICES[language]).stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
    except Exception:
        raise HTTPException(status_code=502, detail="Speech service is unavailable.")
    if not chunks:
        raise HTTPException(status_code=502, detail="Speech service returned no audio.")
    mp3 = b"".join(chunks)
    _remember(_audio, key, mp3)
    return mp3


def audio_url(text: str, language: str) -> str:
    """Relative URL that makes the audio on demand. It carries the text itself, so any server instance can answer it."""
    return "/api/audio?" + urlencode({"language": language, "text": text})


def _mp3(data: bytes) -> Response:
    # The URL holds the full text, so a clip never changes: let Vercel's CDN keep it and skip the speech service.
    return Response(content=data, media_type="audio/mpeg",
                    headers={"Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable"})


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    language: Literal["en", "ur"]


@router.post("/tts")
async def tts(req: TtsRequest) -> Response:
    return _mp3(await synthesize(req.text, req.language))


@router.get("/audio")
async def audio(
    text: str = Query(min_length=1, max_length=3000),
    language: Literal["en", "ur"] = "ur",
) -> Response:
    return _mp3(await synthesize(text, language))
