"""Convert the training export (ml/metrics/training_metrics.json) into the shape
the website reads (public/metrics.json, typed in lib/metrics.ts).

Every number is copied from the training run; nothing is invented.

    python ml/scripts/to_web_metrics.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "ml" / "metrics" / "training_metrics.json"
DST = ROOT / "public" / "metrics.json"


def pretty(label: str) -> str:
    return label.replace("_", " ").capitalize()


def main() -> None:
    m = json.loads(SRC.read_text(encoding="utf-8"))
    health, stage = m["heads"]["health"], m["heads"]["stage"]
    ds = m["dataset"]

    web = {
        "model_version": m["model_version"],
        "summary": {
            # Headline numbers are the health/disease head on its held-out test set.
            "accuracy": health["accuracy"],
            "f1": health["macro_f1"],
            "images": ds["health"]["train"] + ds["stage"]["train"],
            "classes": len(health["labels"]) + len(stage["labels"]),
            "latency_ms": m["inference_ms_cpu"],
        },
        "history": [
            {k: e[k] for k in ("epoch", "train_acc", "val_acc", "train_loss", "val_loss")}
            for e in m["training_curve"]["health"]
        ],
        "confusion": {
            "disease": {"labels": [pretty(l) for l in health["labels"]], "matrix": health["confusion_matrix"]},
            "stage": {"labels": [pretty(l) for l in stage["labels"]], "matrix": stage["confusion_matrix"]},
        },
        "per_class": [
            {"label": pretty(c["label"]), "precision": c["precision"], "recall": c["recall"], "f1": c["f1"]}
            for c in health["per_class"]
        ],
        "stage_summary": {
            "accuracy": stage["accuracy"],
            "f1": stage["macro_f1"],
            "test_images": stage["test_images"],
        },
    }
    DST.write_text(json.dumps(web, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {DST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
