"""Build fasl_wheat.onnx from the training notebook's health.pt and stage.pt.

Use this when the Kaggle notebook ran with Internet off and skipped the ONNX export.

    python ml/scripts/export_onnx.py D:/Fasl/fasl_model

The folder must contain health.pt, stage.pt and labels.json (all from the notebook's Output).
Writes fasl_wheat.onnx into the same folder and checks it against PyTorch.
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import timm
import torch
import torch.nn as nn

ARCH = "efficientnet_b0"


class Combined(nn.Module):
    def __init__(self, stage: nn.Module, health: nn.Module) -> None:
        super().__init__()
        self.stage, self.health = stage, health

    def forward(self, image: torch.Tensor):
        return self.stage(image), self.health(image)


def load(path: Path, num_classes: int) -> nn.Module:
    model = timm.create_model(ARCH, pretrained=False, num_classes=num_classes)
    model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    return model.float().eval()


def main(folder: Path) -> None:
    labels = json.loads((folder / "labels.json").read_text(encoding="utf-8"))
    size = int(labels["image_size"])
    stage = load(folder / "stage.pt", len(labels["growth_stage"]))
    health = load(folder / "health.pt", len(labels["health"]))
    combo = Combined(stage, health).eval()

    out = folder / "fasl_wheat.onnx"
    torch.onnx.export(
        combo, torch.randn(1, 3, size, size), out,
        input_names=["image"], output_names=["stage", "health"],
        dynamic_axes={"image": {0: "n"}, "stage": {0: "n"}, "health": {0: "n"}},
        opset_version=17, dynamo=False,
    )

    sess = ort.InferenceSession(str(out), providers=["CPUExecutionProvider"])
    x = torch.randn(4, 3, size, size)
    with torch.no_grad():
        ts, th = combo(x)
    os_, oh = sess.run(["stage", "health"], {"image": x.numpy()})
    diff = max(float(np.abs(ts.numpy() - os_).max()), float(np.abs(th.numpy() - oh).max()))
    t = time.time()
    for _ in range(20):
        sess.run(None, {"image": x[:1].numpy()})
    ms = (time.time() - t) / 20 * 1000

    print(f"Wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    print(f"Max difference vs PyTorch: {diff:.2e} ({'OK' if diff < 1e-3 else 'TOO LARGE'})")
    print(f"CPU inference per image: {ms:.1f} ms")
    if diff >= 1e-3:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
