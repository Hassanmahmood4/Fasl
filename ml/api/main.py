"""Fasl model API. Every route lives under /api, the path Vercel routes to this service.

    uvicorn ml.api.main:app --reload          # from the repo root
"""

import os
from functools import lru_cache

from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError

from .chat import router as chat_router
from .model import WheatModel, is_blurry, load_config
from . import tts
from .report import BLURRY, build_report, urdu_summary

MAX_BYTES = 10 * 1024 * 1024

app = FastAPI(title="Fasl wheat model", version="0.1.0")

# Comma-separated list of allowed website origins, e.g. "https://fasl.vercel.app".
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])

api = APIRouter(prefix="/api")
api.include_router(chat_router)
api.include_router(tts.router)

CONFIG = load_config()


@lru_cache(maxsize=1)
def get_model() -> WheatModel:
    """Loads the 32 MB model on the first scan, so chat and voice requests start fast."""
    return WheatModel()


@api.get("/health")
def health() -> dict:
    return {"ok": True, "model_version": CONFIG["model_version"]}


@api.post("/predict")
async def predict(image: UploadFile = File(...)) -> dict:
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 10 MB.")
    try:
        if is_blurry(data):
            return BLURRY
        model = get_model()
        stage, health_head = model.predict(data)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File is not a readable image.")
    report = build_report(stage, health_head, model.threshold)
    if "crop" in report:
        summary = urdu_summary(
            stage,
            health_head,
            stage_sure=not report["stage"].get("uncertain", False),
            health_sure=report["health"]["status"] != "uncertain",
        )
        report["urduAudioUrl"] = tts.audio_url(summary, "ur")
    return report


app.include_router(api)
