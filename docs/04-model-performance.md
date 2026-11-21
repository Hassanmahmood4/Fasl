# 04 — Model Performance

## Goal

Show judges the model is real and well trained, with interactive charts built from the actual training run.

Section id: `performance`

## Copy

Section label: `The model`

Heading: "How well does the model see?"

Sub-line: "Trained on [IMAGES] crop images across [CLASSES] classes. Here's how it performs."

## Stat tiles (row above the charts)

| Tile | Value |
|---|---|
| Overall accuracy | `[ACCURACY]` |
| Macro F1 score | `[F1]` |
| Images trained on | `[IMAGES]` |
| Average prediction time | `[LATENCY] ms` |

## Charts

> Current site: only the confusion matrix is shown. Training curves and per-class scores were removed; the sections below describe them in case they come back (see git history). `metrics.json` keeps the same shape.

### 1. Training curves (line chart)

- Tabs: Accuracy / Loss
- Series: training vs validation, x-axis = epoch
- Training line `wheat` `#E3C07E`, validation line `wheat-deep` `#B8893D` (dashed, so they differ beyond colour)
- Tooltip on hover shows the epoch and both values

### 2. Confusion matrix (heatmap)

- Rows = true label, columns = predicted label
- Classes, e.g.: Healthy, Leaf rust, Yellow rust, Powdery mildew (and growth stages on a second tab)
- Cell shade from white to `wheat-deep`; show the count or percentage in each cell
- Built as a CSS grid of cells (Recharts has no heatmap)

### 3. Per-class scores (grouped bar chart)

- Precision, recall and F1 for each class
- Three shades of wheat plus a legend; values shown on hover

## Data

All charts read from `public/metrics.json`, exported by the training notebook.

```json
{
  "summary": { "accuracy": 0.0, "f1": 0.0, "images": 0, "classes": 0, "latency_ms": 0 },
  "history": [
    { "epoch": 1, "train_acc": 0.0, "val_acc": 0.0, "train_loss": 0.0, "val_loss": 0.0 }
  ],
  "confusion": {
    "disease": { "labels": ["Healthy", "Leaf rust"], "matrix": [[0, 0], [0, 0]] },
    "stage": { "labels": ["Tillering", "Booting"], "matrix": [[0, 0], [0, 0]] }
  },
  "per_class": [
    { "label": "Healthy", "precision": 0.0, "recall": 0.0, "f1": 0.0 }
  ]
}
```

- Until the model is trained, use a clearly marked placeholder `metrics.json` and show a small "Placeholder data" tag on the section.
- Never hand-type final numbers. Replace the file with the real export.
- Also keep matplotlib versions of these charts in the notebook for slides and reports.

## Style

- White background, black axes and text, light grey gridlines.
- Charts in white cards with a thin `wheat-tint` border.
- Small `WheatStalk` icon beside each chart title.

## Acceptance checklist

- [ ] All charts render from `metrics.json`
- [ ] Tooltips work on hover and tap
- [ ] Placeholder tag shows while data is placeholder
- [ ] Charts resize correctly at 375px
