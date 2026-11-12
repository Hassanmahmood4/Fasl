---
title: Fasl Wheat Model
sdk: docker
app_port: 7860
pinned: false
---

# Fasl wheat model API (Hugging Face Space)

This folder holds the files for a Docker Space that serves `ml/api`.

## Publish

1. Create a new Space on Hugging Face, SDK: Docker.
2. Clone it, then copy these into the Space repo root:

   ```
   ml/deploy/Dockerfile   -> Dockerfile
   ml/deploy/README.md    -> README.md      (keeps the Space settings above)
   ml/api/                -> api/
   ml/config/             -> config/
   ml/models/             -> models/        (fasl_wheat.onnx, tracked with git lfs)
   ```

3. In the Space settings, add the variable `ALLOWED_ORIGINS` with the website's address.
4. Push. When the Space is running, set `NEXT_PUBLIC_API_URL` on Vercel to
   `https://<user>-<space>.hf.space` and redeploy the website.

## Check it

```bash
curl https://<user>-<space>.hf.space/health
curl -F image=@wheat.jpg https://<user>-<space>.hf.space/predict
```
