# Fasl (فصل)

Know your crop from one photo. A web app for Pakistani agricultural departments such as NARC, built with Next.js (App Router), TypeScript, Tailwind CSS, GSAP and Motion.

- `/` is the website.
- `/dashboard` is the working dashboard: upload or take a photo, get a report.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Connecting the model

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the model service. On Vercel, add it as an environment variable. It is read at build time, so restart or redeploy afterwards.
2. Allow the website's domain in the service's CORS settings.
3. The service must provide:
   - `GET /health`, returning any 2xx. The dashboard uses it to show "Model online".
   - `POST /predict`, taking `multipart/form-data` with an `image` field.

`/predict` returns this shape (`lib/demo/types.ts`):

```json
{
  "crop": { "name": "Wheat", "confidence": 0.96 },
  "stage": { "index": 4, "name": "Grain filling", "total": 5, "confidence": 0.88 },
  "readiness": { "ready": false, "daysLeft": [10, 14] },
  "health": { "status": "disease", "disease": "Leaf rust", "severity": "moderate", "location": "Lower leaves", "confidence": 0.81 },
  "actions": ["...", "..."],
  "urduAudioUrl": "/audio/abc.mp3"
}
```

- `stage.index` counts from 1: Tillering, Booting, Heading, Grain filling, Ripe.
- `urduAudioUrl` may be relative to the service. Without it, the audio button is disabled.
- Return `{ "status": "unclear" }` for a photo the model can't read. Any confidence below 0.6 also shows the "Photo unclear" screen.
- Requests time out after 30 seconds.

## Before going live

- **Metrics:** replace `public/metrics.json` with the training export. Without its `placeholder` field, the real numbers appear and the "Placeholder data" tag goes away.
- **Footer:** fill in the `[BRACKETED]` values in `components/footer/Footer.tsx`.
- **Urdu audio:** have a native speaker check the sample files in `public/samples/`.

## Demo tip

Press `U` on the dashboard's photo picker to show the "Photo unclear" screen on purpose. Sample photos work with no model connected.

Photo credits are in `public/samples/CREDITS.md`.
