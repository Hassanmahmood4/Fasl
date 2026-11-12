"""ONNX inference for the wheat model (two heads: stage and health)."""

import io
import json
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

ML_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("FASL_MODEL_PATH", ML_DIR / "models" / "fasl_wheat.onnx"))
LABELS_PATH = Path(os.getenv("FASL_LABELS_PATH", ML_DIR / "config" / "labels.json"))


@dataclass
class Head:
    label: str
    index: int
    confidence: float
    probs: dict[str, float]


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


class WheatModel:
    def __init__(self) -> None:
        self.config = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
        self.size = int(self.config["image_size"])
        self.mean = np.array(self.config["mean"], dtype=np.float32).reshape(3, 1, 1)
        self.std = np.array(self.config["std"], dtype=np.float32).reshape(3, 1, 1)
        self.threshold = float(self.config["confidence_threshold"])
        self.session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])

    def preprocess(self, data: bytes) -> np.ndarray:
        """Same as the notebook's eval transform: pad to square with the mean colour, resize, normalise."""
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        w, h = img.size
        s = max(w, h)
        canvas = Image.new("RGB", (s, s), tuple(int(m * 255) for m in self.config["mean"]))
        canvas.paste(img, ((s - w) // 2, (s - h) // 2))
        canvas = canvas.resize((self.size, self.size), Image.BILINEAR)
        x = np.asarray(canvas, dtype=np.float32).transpose(2, 0, 1) / 255.0
        return ((x - self.mean) / self.std)[None].astype(np.float32)

    def _head(self, logits: np.ndarray, labels: list[str]) -> Head:
        p = softmax(logits)
        i = int(p.argmax())
        return Head(labels[i], i, float(p[i]), {l: float(v) for l, v in zip(labels, p)})

    def predict(self, data: bytes) -> tuple[Head, Head]:
        stage, health = self.session.run(["stage", "health"], {"image": self.preprocess(data)})
        return self._head(stage[0], self.config["growth_stage"]), self._head(health[0], self.config["health"])
