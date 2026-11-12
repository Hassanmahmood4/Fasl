"""Checks a photo before the model sees it.

The model's not_wheat class was trained only on other crops' leaves, so it has never
seen people, rooms or objects and calls them wheat. These cheap checks catch the common
cases (low resolution, blur, faces, almost no plant colour) and say why.
Retraining with varied not_wheat photos is the real fix; see ml/README.md.
"""

import io
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps

MIN_SIDE = 200          # pixels on the short side; the model reads 224x224
BLUR_MIN = 15.0         # Laplacian variance, same limit as the cleaning notebook
MIN_PLANT_COLOUR = 0.25 # share of pixels with green-to-golden plant colours

_faces = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


@dataclass
class Rejection:
    reason: str
    message: str


LOW_RES = Rejection("low_resolution", "Photo is too small. Use the full-size photo from your camera.")
BLURRY = Rejection("blurry", "Photo is blurry. Hold the phone still and retake it in daylight.")
NOT_CROP = Rejection("not_crop", "This doesn't look like a crop photo. Take a photo of the wheat plants, filling the frame.")


def _blur(gray: Image.Image) -> float:
    g = np.asarray(gray.resize((256, 256)), dtype=np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    return float(lap.var())


def _plant_colour(img: Image.Image) -> float:
    hsv = np.asarray(img.resize((224, 224)).convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0] * 360 / 255
    sat = hsv[..., 1] / 255
    val = hsv[..., 2] / 255
    return float(((hue >= 25) & (hue <= 150) & (sat >= 0.18) & (val >= 0.15)).mean())


def _has_face(gray: Image.Image) -> bool:
    w, h = gray.size
    scale = 512 / max(w, h)
    g = np.asarray(gray.resize((max(1, int(w * scale)), max(1, int(h * scale)))))
    side = int(0.12 * min(g.shape))
    return len(_faces.detectMultiScale(g, scaleFactor=1.1, minNeighbors=6, minSize=(side, side))) > 0


def check(data: bytes) -> Rejection | None:
    """None if the photo can go to the model, otherwise why not."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    if min(img.size) < MIN_SIDE:
        return LOW_RES
    gray = img.convert("L")
    if _blur(gray) < BLUR_MIN:
        return BLURRY
    if _has_face(gray) or _plant_colour(img) < MIN_PLANT_COLOUR:
        return NOT_CROP
    return None
