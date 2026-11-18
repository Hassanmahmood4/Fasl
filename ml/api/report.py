"""Turn model outputs into the website's Report shape (lib/demo/types.ts).

The model decides the facts; this module only phrases them. Severity, location
and days-to-harvest are not predicted by the model, so they are left out.
"""

from .model import Head

STAGE_NAMES = {
    "vegetative": "Vegetative",
    "flowering": "Flowering",
    "grain_filling": "Grain filling",
    "ripening": "Ripening",
}

DISEASE_NAMES = {
    "brown_rust": "Brown (leaf) rust",
    "yellow_rust": "Yellow (stripe) rust",
    "stem_rust": "Stem rust",
    "septoria": "Septoria leaf blotch",
    "loose_smut": "Loose smut",
    "powdery_mildew": "Powdery mildew",
}

CONFIRM = "Confirm the diagnosis with your local agriculture extension officer before spraying."

DISEASE_ACTIONS = {
    "brown_rust": ["Check nearby plants for orange-brown pustules on the leaves.", CONFIRM],
    "yellow_rust": ["Check nearby plants for yellow stripes of pustules along the leaves.", CONFIRM],
    "stem_rust": ["Check stems and leaf sheaths for dark red-brown pustules.", CONFIRM],
    "septoria": ["Check lower leaves for brown blotches with small dark specks.", CONFIRM],
    "loose_smut": ["Mark affected plants; use certified, treated seed next season.", CONFIRM],
    "powdery_mildew": ["Check for white powdery patches on leaves and stems.", CONFIRM],
}

UNCLEAR = {"status": "unclear", "message": "Photo unclear. Retake it closer, in daylight."}

STAGE_UNSURE = (
    "The growth stage is uncertain from this photo. Photograph the whole plant, including the ear, "
    "to check harvest readiness."
)

# Urdu, for the spoken summary. Stage names are in the form used before "میں ہے".
STAGE_UR = {
    "vegetative": "ابتدائی بڑھوتری کے مرحلے",
    "flowering": "پھول آنے کے مرحلے",
    "grain_filling": "دانہ بننے کے مرحلے",
    "ripening": "پکنے کے مرحلے",
}

DISEASE_UR = {
    "brown_rust": "بھوری کنگی",
    "yellow_rust": "پیلی کنگی",
    "stem_rust": "تنے کی کالی کنگی",
    "septoria": "سپٹوریا کے دھبوں",
    "loose_smut": "کانگیاری",
    "powdery_mildew": "سفوفی پھپھوندی",
}


def urdu_summary(stage: Head, health: Head, stage_sure: bool = True) -> str:
    parts = ["یہ گندم کی فصل ہے۔"]
    if stage_sure:
        parts.append(f"فصل {STAGE_UR[stage.label]} میں ہے۔")
    else:
        parts.append("اس تصویر سے فصل کا مرحلہ یقینی طور پر معلوم نہیں ہو سکا۔")
    if health.label == "healthy":
        parts.append("فصل صحت مند ہے، کوئی بیماری نظر نہیں آئی۔ ہر ہفتے کھیت کا معائنہ کرتے رہیں۔")
    else:
        parts.append(f"فصل میں {DISEASE_UR[health.label]} کی علامات نظر آئی ہیں۔")
        parts.append("اسپرے کرنے سے پہلے اپنے مقامی محکمہ زراعت کے افسر سے تصدیق ضرور کریں۔")
    if not stage_sure:
        parts.append("کٹائی کا وقت جانچنے کے لیے بالی سمیت پورے پودے کی تصویر لیں۔")
    elif stage.label == "ripening":
        parts.append("فصل پک رہی ہے۔ جب دانے سخت اور خشک ہو جائیں تو کٹائی کا انتظام کریں۔")
    else:
        parts.append("فصل ابھی کٹائی کے لیے تیار نہیں ہے۔")
    return " ".join(parts)


def build_report(stage: Head, health: Head, threshold: float) -> dict:
    if health.label == "not_wheat":
        return UNCLEAR
    # Health is the main finding; without it the report is not useful.
    if health.confidence < threshold:
        return UNCLEAR

    # An unsure stage still gives a report, but never a harvest call.
    stage_sure = stage.confidence >= threshold
    healthy = health.label == "healthy"
    ripe = stage_sure and stage.label == "ripening"

    actions: list[str] = []
    if healthy:
        actions.append("No disease detected. Keep checking the field weekly.")
    else:
        actions.extend(DISEASE_ACTIONS[health.label])
    if not stage_sure:
        actions.append(STAGE_UNSURE)
    elif ripe:
        actions.append("The crop is ripening. Plan harvest once grains are hard and dry.")

    report: dict = {
        "crop": {"name": "Wheat", "confidence": round(1.0 - health.probs["not_wheat"], 4)},
        "stage": {
            "index": stage.index + 1,
            "name": STAGE_NAMES[stage.label],
            "total": len(STAGE_NAMES),
            "confidence": round(stage.confidence, 4),
        },
        "readiness": {"ready": ripe},
        "health": {"status": "healthy" if healthy else "disease", "confidence": round(health.confidence, 4)},
        "actions": actions,
    }
    if not healthy:
        report["health"]["disease"] = DISEASE_NAMES[health.label]
    return report
