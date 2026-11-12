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


def build_report(stage: Head, health: Head, threshold: float) -> dict:
    if health.label == "not_wheat":
        return UNCLEAR
    if stage.confidence < threshold or health.confidence < threshold:
        return UNCLEAR

    healthy = health.label == "healthy"
    ripe = stage.label == "ripening"

    actions: list[str] = []
    if healthy:
        actions.append("No disease detected. Keep checking the field weekly.")
    else:
        actions.extend(DISEASE_ACTIONS[health.label])
    if ripe:
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
