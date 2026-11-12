# Hugging Face Space (Docker SDK). Build context is the Space repo root, laid out
# as described in deploy/README.md: api/, config/, models/ and this Dockerfile.
FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH" PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY --chown=user api/ ml/api/
COPY --chown=user config/ ml/config/
COPY --chown=user models/ ml/models/

# Set ALLOWED_ORIGINS as a Space variable, e.g. https://your-site.vercel.app
EXPOSE 7860
CMD ["uvicorn", "ml.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
