"""Text-to-speech with Microsoft Edge neural voices (same voice as the sample clips).

    POST /tts                 { text, language: "en" | "ur" } -> audio/mpeg
    GET  /audio/{key}.mp3     report summary audio registered by /predict
"""

import asyncio
import hashlib
from collections import OrderedDict
from typing import Literal

import edge_tts
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

VOICES = {"ur": "ur-PK-UzmaNeural", "en": "en-US-AriaNeural"}  # both female
CACHE_SIZE = 256

router = APIRouter()
_texts: OrderedDict[str, tuple[str, str]] = OrderedDict()  # key -> (text, language)
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


_pending: dict[str, asyncio.Task] = {}


async def _prepare(text: str, language: str) -> None:
    try:
        await synthesize(text, language)
    except HTTPException:
        pass  # GET /audio retries on demand


def register(text: str, language: str) -> str:
    """Remember text, start making its audio in the background, and return its relative URL."""
    key = _key(text, language)
    _remember(_texts, key, (text, language))
    if key not in _audio and key not in _pending:
        task = asyncio.get_running_loop().create_task(_prepare(text, language))
        _pending[key] = task
        task.add_done_callback(lambda _: _pending.pop(key, None))
    return f"/audio/{key}.mp3"


def _mp3(data: bytes) -> Response:
    return Response(content=data, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    language: Literal["en", "ur"]


@router.post("/tts")
async def tts(req: TtsRequest) -> Response:
    return _mp3(await synthesize(req.text, req.language))


@router.get("/audio/{key}.mp3")
async def audio(key: str) -> Response:
    if key in _pending:
        await asyncio.shield(_pending[key])  # already being made: wait for it instead of starting again
    if key in _audio:
        return _mp3(_audio[key])
    if key not in _texts:
        raise HTTPException(status_code=404, detail="Audio expired. Scan the photo again.")
    text, language = _texts[key]
    return _mp3(await synthesize(text, language))
