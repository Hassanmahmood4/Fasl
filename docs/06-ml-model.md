# 06 — ML Model, Training and API

## Goal

One model that takes a crop photo and returns the crop type, growth stage, and health status, served through a FastAPI endpoint the website calls.

## Scope

Start with wheat only, then add crops one at a time.

| Phase | Crops |
|---|---|
| 1 | Wheat |
| 2 | Rice |
| 3 | Cotton, Mango |

## Architecture

```
Photo -> backbone (EfficientNet-B0 or MobileNetV3, ImageNet pretrained)
           |-- Head 1: crop type
           |-- Head 2: growth / ripeness stage
           |-- Head 3: health / disease
                  |
     rules + template (or small LLM) -> report text (English) + Urdu audio
```

- Transfer learning: freeze the backbone first, then fine-tune the top layers.
- Multi-task loss: sum of cross-entropy losses for the three heads.
- The model decides the facts. The text step only phrases them and never adds new claims.
- Confidence threshold: below 0.6 on any head, return a "retake photo" response.
- Explainability: Grad-CAM heatmap from the last convolutional layer.

## Classes (wheat, phase 1)

- Growth stage: Tillering, Booting, Heading, Grain filling, Ripe
- Health: Healthy, Leaf rust, Yellow (stripe) rust, Powdery mildew

## Data

| Need | Sources |
|---|---|
| Disease | PlantVillage (lab photos), PlantDoc (field photos), CGIAR wheat rust dataset |
| Growth stage / readiness | Scarce for wheat; label our own images (a few hundred per stage) |

- Mix lab and field photos so the model works on real phone pictures.
- Augmentation: random crop, flip, rotation, colour jitter, blur.
- Split: 70 / 15 / 15 train / val / test, stratified by class.
- Record dataset sizes; they feed `metrics.json`.

## Training (Google Colab, free GPU)

- PyTorch + `timm`
- Image size 224, batch size 32, AdamW, cosine learning-rate schedule
- Early stopping on validation loss
- Log every epoch: train/val accuracy and loss

## Outputs from the notebook

1. `fasl_model.onnx`
2. `metrics.json` in the format defined in `04-model-performance.md`
3. matplotlib plots: training curves, confusion matrices, per-class scores (for slides)

## API (FastAPI)

### `POST /predict`

- Input: `multipart/form-data` with `image`
- Output: the `Report` shape defined in `03-demo.md`

```json
{
  "crop": { "name": "Wheat", "confidence": 0.96 },
  "stage": { "index": 4, "name": "Grain filling", "total": 5, "confidence": 0.88 },
  "readiness": { "ready": false, "daysLeft": [10, 14] },
  "health": { "status": "disease", "disease": "Leaf rust", "severity": "moderate", "location": "Lower leaves", "confidence": 0.81 },
  "actions": ["...", "..."],
  "heatmapUrl": "...",
  "urduAudioUrl": "..."
}
```

- Low confidence: `{ "status": "unclear", "message": "Photo unclear. Retake it closer, in daylight." }`

### `GET /health`

Returns `{ "ok": true }`.

### Notes

- Run inference with `onnxruntime` (CPU is fine).
- Enable CORS for the website domain.
- Readiness days: rule-based estimate from stage + confidence, clearly labelled as an estimate.
- Urdu audio: text-to-speech on the generated Urdu summary.
- Deploy on Hugging Face Spaces or Render (free tier).

## Folder

```
ml/
  notebooks/train_wheat.ipynb
  api/main.py
  api/model/fasl_model.onnx
  api/requirements.txt
```

## Acceptance checklist

- [ ] Notebook trains and exports ONNX + metrics.json + plots
- [ ] `/predict` returns the Report shape
- [ ] Low-confidence response works
- [ ] Grad-CAM heatmap returned
- [ ] Deployed and reachable from the website
