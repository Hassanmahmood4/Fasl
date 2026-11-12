# Fasl ML: wheat health and growth stage

Two EfficientNet-B0 classifiers (timm, ImageNet-pretrained) packed into one ONNX file, served by FastAPI.

## Layout

```
ml/
  notebooks/
    01_collect_and_clean.ipynb  # merge public datasets, map labels, fix/resize, dedupe (pHash), drop blurry, split 70/15/15
    02_train.ipynb              # train health + stage models, evaluate on test set, export ONNX + metrics.json + labels.json
  models/fasl_wheat.onnx        # input "image" [N,3,224,224]; outputs "stage", "health" (logits)
  config/labels.json            # class order, image size, normalisation, confidence threshold
  metrics/training_metrics.json # raw export from 02_train.ipynb
  scripts/to_web_metrics.py     # converts it to public/metrics.json (the shape in lib/metrics.ts)
  schemas/report.schema.json    # /predict response, mirrors lib/demo/types.ts
  api/                          # FastAPI: GET /health, POST /predict
  deploy/                       # Hugging Face Space (Docker) files
  requirements.txt              # notebook dependencies
```

Datasets and the cleaned image folder (`fasl_clean/`) are not committed. The notebooks run on Kaggle
with the source datasets attached; the list of sources is in `metrics/training_metrics.json`.

## Results (held-out test set, model `fasl-wheat-v0.1`)

| Head | Classes | Test images | Accuracy | Macro F1 |
|---|---|---|---|---|
| Health | healthy, brown rust, yellow rust, stem rust, septoria, loose smut, powdery mildew, not wheat | 1,491 | 96.7% | 0.942 |
| Growth stage | vegetative, flowering, grain filling, ripening | 71 | 90.1% | 0.938 |

- The stage test set is small (71 images, only 2 vegetative), so treat its numbers as rough.
- Weakest health class: stem rust (F1 0.76, 45 test images).
- CPU inference: about 20 ms per image.

## Run the API

From the repo root:

```bash
pip install -r ml/api/requirements.txt
uvicorn ml.api.main:app --reload --port 8000
```

Then set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`.
`ALLOWED_ORIGINS` (comma-separated) controls CORS; it defaults to `http://localhost:3000`.

`POST /predict` returns `{"status": "unclear", ...}` when the photo is not wheat or either head is
below the 0.6 confidence threshold. Otherwise it returns the Report shape. The model does not predict
severity, lesion location or days to harvest, so those fields are left out; `readiness.ready` is true
only for the ripening stage.

## Update the website metrics

After retraining, copy the new export to `ml/metrics/training_metrics.json`, then:

```bash
python ml/scripts/to_web_metrics.py
```

The website's headline accuracy and F1 are the health head's test numbers.
