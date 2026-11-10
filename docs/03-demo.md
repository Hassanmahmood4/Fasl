# 03 — Live Demo: Report Dashboard

> Current site: the working dashboard is at `/dashboard` (`components/dashboard/ScanDashboard.tsx`). The home page section is a preview using a sample result, on a `wheat` background. The download button and heatmap toggle described below were removed at the owner's request.

## Goal

A working preview of the Fasl report, not a screenshot. The user picks a sample photo (or uploads their own), watches it get analysed, and sees the full report dashboard fill in.

Section id: `demo`

## Copy

Section label: `Live demo`

Heading: "See it in action"

Sub-line: "Pick a sample photo or upload your own, and Fasl reads it in seconds."

## Flow

### Step 1 — Choose a photo

- 3 sample cards:
  1. Healthy wheat, ready to harvest
  2. Wheat with leaf rust
  3. Unripe green wheat
- 1 "Upload your own" card (drag and drop or click; JPG/PNG, max 10 MB).

Decision to confirm: use real crop photos here (recommended) or illustrated crops.

### Step 2 — Analyse

- A scanning line sweeps over the photo (about 2s).
- A checklist ticks off in order:
  - Identifying crop
  - Reading growth stage
  - Checking health
  - Writing report

### Step 3 — Report

The dashboard appears, sections filling in one by one.

## Report dashboard layout

### Left: photo panel

- The photo
- Toggle: "Show what the model saw" — overlays the Grad-CAM heatmap on the photo

### Right: report

| Block | Content |
|---|---|
| Crop | Crop name + confidence bar (e.g. Wheat, 96%) |
| Growth stage | 5-step timeline: Tillering, Booting, Heading, Grain filling, Ripe; current stage highlighted in `wheat` |
| Harvest readiness | Large status badge: "Ready to harvest" or "Not ready, about 10–14 days left" |
| Health | "Healthy" or disease name + severity meter (mild / moderate / severe) + where it shows on the plant |
| What to do now | 2–3 short action steps |
| Listen in Urdu | Audio button that reads the summary aloud |
| Download report | Saves the report as a PDF |

### Low-confidence state

If the model's confidence is below 0.6, show instead of the report:
"Photo unclear. Retake it closer, in daylight, with the crop filling the frame." with a "Try another photo" button.

Include this as a 4th hidden test case so it can be demoed on purpose.

## Data

### Report type

```ts
type Report = {
  crop: { name: string; confidence: number };
  stage: { index: number; name: string; total: number; confidence: number };
  readiness: { ready: boolean; daysLeft?: [number, number] };
  health: {
    status: "healthy" | "disease";
    disease?: string;
    severity?: "mild" | "moderate" | "severe";
    location?: string;
    confidence: number;
  };
  actions: string[];
  urduAudioUrl?: string;
  heatmapUrl?: string;
};
```

### Sources

- Samples: pre-saved results in `lib/demo/samples.ts` and images in `public/samples/`. The demo must work offline on stage.
- Upload: `POST /predict` on the FastAPI service (see `06-ml-model.md`). If the API is unreachable, show a friendly error and suggest a sample.
- The values in samples are illustrative and labelled "Sample result" in the UI.

## Style

- Section background: `black`.
- Heading and label: `wheat` text on black.
- Report card: white, 20px radius, black text.
- Badges, bars, active stage: `wheat` fill with black text.
- Severity meter: light to deep wheat; also label the level in text (never colour alone).
- `WheatEdge` stalks frame the left and right edges of the section.

## Acceptance checklist

- [ ] All 3 samples run the full analyse animation and show a report
- [ ] Upload works against the API, with error handling
- [ ] Heatmap toggle works
- [ ] Low-confidence state can be triggered
- [ ] Urdu audio plays
- [ ] PDF download works
- [ ] Responsive: photo panel stacks above the report on mobile
