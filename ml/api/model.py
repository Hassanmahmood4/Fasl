"""ONNX inference for the wheat model (two heads: stage and health)."""

import io
import json
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
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


BLUR_LIMIT = 20.0  # Laplacian variance at 512px. Blurred sample: ~1; softest real sample: ~96.


def is_blurry(data: bytes) -> bool:
    """A real sharpness check, so "retake it" means the photo itself is the problem."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("L")
    img.thumbnail((512, 512))
    a = np.asarray(img, dtype=np.float32)
    lap = 4 * a[1:-1, 1:-1] - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:]
    return float(lap.var()) < BLUR_LIMIT


def load_config() -> dict:
    """Class order, image size and threshold. Cheap: does not load the model."""
    return json.loads(LABELS_PATH.read_text(encoding="utf-8"))


class WheatModel:
    def __init__(self) -> None:
        import onnxruntime as ort  # heavy; only needed once a photo is scanned

        self.config = load_config()
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
        x = (x - self.mean) / self.std
        # The photo and its mirror image. Averaging both steadies the answer a little.
        # (Crops were tried too and made it worse: the model was trained on whole, padded photos.)
        return np.stack([x, x[:, :, ::-1]]).astype(np.float32)

    def _head(self, logits: np.ndarray, labels: list[str]) -> Head:
        p = np.mean([softmax(row) for row in logits], axis=0)
        i = int(p.argmax())
        return Head(labels[i], i, float(p[i]), {l: float(v) for l, v in zip(labels, p)})

    def predict(self, data: bytes) -> tuple[Head, Head]:
        stage, health = self.session.run(["stage", "health"], {"image": self.preprocess(data)})
        return self._head(stage, self.config["growth_stage"]), self._head(health, self.config["health"])
