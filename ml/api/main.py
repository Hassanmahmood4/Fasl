"""Fasl model API.

    uvicorn ml.api.main:app --reload          # from the repo root
"""

import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError

from .chat import router as chat_router
from .model import Head, WheatModel
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

# v0.3 calls many clean green or golden ears loose smut. Loose smut always shows black spores,
# so without them the result is read as healthy (the two classes the model mixes up).
SMUT_MIN_DARK = 0.015


def check_smut(health: Head, data: bytes) -> Head:
    if health.probs["loose_smut"] < 0.05 or gate.smut_colour(data) >= SMUT_MIN_DARK:
        return health
    probs = dict(health.probs)
    probs["healthy"] += probs["loose_smut"]
    probs["loose_smut"] = 0.0
    labels = model.config["health"]
    best = max(probs, key=probs.get)
    return Head(best, labels.index(best), probs[best], probs)


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
        health_head = check_smut(health_head, data)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File is not a readable image.")
    report = build_report(stage, health_head, model.threshold)
    if "crop" in report:
        stage_sure = stage.confidence >= model.threshold
        report["urduAudioUrl"] = tts.register(urdu_summary(stage, health_head, stage_sure), "ur")
    return report
