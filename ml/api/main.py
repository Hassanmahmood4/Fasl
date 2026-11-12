"""Fasl model API.

    uvicorn ml.api.main:app --reload          # from the repo root
"""

import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError

from .chat import router as chat_router
from .model import WheatModel
from . import gate, tts
from .report import build_report, urdu_summary

MAX_BYTES = 10 * 1024 * 1024

app = FastAPI(title="Fasl wheat model", version="0.1.0")

# Comma-separated list of allowed website origins, e.g. "https://fasl.vercel.app".
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])

app.include_router(chat_router)
app.include_router(tts.router)

model = WheatModel()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model_version": model.config["model_version"]}


@app.post("/predict")
async def predict(image: UploadFile = File(...)) -> dict:
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is larger than 10 MB.")
    try:
        rejected = gate.check(data)
        if rejected:
            return {"status": "unclear", "reason": rejected.reason, "message": rejected.message}
        stage, health_head = model.predict(data)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File is not a readable image.")
    report = build_report(stage, health_head, model.threshold)
    if "crop" in report:
        report["urduAudioUrl"] = tts.register(urdu_summary(stage, health_head), "ur")
    return report
