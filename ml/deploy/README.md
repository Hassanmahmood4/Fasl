---
title: Fasl Wheat Model
sdk: docker
app_port: 7860
pinned: false
---

# Fasl wheat model API (Hugging Face Space)

This folder holds the files for a Docker Space that serves `ml/api`:
`/predict` (crop report), `/chat` (crop assistant), `/tts` and `/audio/...` (Urdu speech), `/health`.

## Publish the API

1. Create a new Space on Hugging Face, SDK: **Docker**.
2. Clone it, then copy these into the Space repo root:

   ```
   ml/deploy/Dockerfile   -> Dockerfile
   ml/deploy/README.md    -> README.md      (keeps the Space settings above)
   ml/api/                -> api/
   ml/config/             -> config/
   ml/models/             -> models/        (fasl_wheat.onnx, 32 MB: track it with git lfs)
   ```

   ```bash
   git lfs install
   git lfs track "models/*.onnx"
   git add .gitattributes . && git commit -m "Fasl API" && git push
   ```

3. In the Space **Settings**:

   | Name | Type | Value |
   |---|---|---|
   | `GROQ_API_KEY` | **Secret** | your Groq key (never put it in the repo) |
   | `ALLOWED_ORIGINS` | Variable | the website address, e.g. `https://fasl.vercel.app` (comma-separate several) |
   | `GROQ_MODEL` | Variable, optional | default `openai/gpt-oss-120b` |
   | `FASL_MIN_SIDE` | Variable, optional | smallest photo side accepted, default `200` pixels |

4. Push. The build takes a few minutes. Urdu audio uses Microsoft's online Edge voice
   (`ur-PK-UzmaNeural`), so the Space needs outgoing internet, which Spaces have by default.

## Publish the website (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js, root: repo root).
2. Environment variable: `NEXT_PUBLIC_API_URL` = `https://<user>-<space>.hf.space` (no trailing slash).
3. Deploy. Then put the Vercel address into the Space's `ALLOWED_ORIGINS` and restart the Space.

## Check it

```bash
curl https://<user>-<space>.hf.space/health
curl -F image=@wheat.jpg https://<user>-<space>.hf.space/predict
curl -X POST https://<user>-<space>.hf.space/tts -H "Content-Type: application/json" \
     -d '{"text":"Your wheat is ready to harvest.","language":"en"}' -o test.mp3
```

`/health` should report `"model_version": "fasl-wheat-v0.3"`. A free Space sleeps after a while
without visits; the first request after that takes about a minute.
