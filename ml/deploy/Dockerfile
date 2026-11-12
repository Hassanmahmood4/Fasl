# Hugging Face Space (Docker SDK). Build context is the Space repo root, laid out
# as described in deploy/README.md: api/, config/, models/, pyproject.toml and this Dockerfile.
FROM python:3.11-slim

# Dependencies go in as root, into the system Python; the app then runs as a normal user.
COPY pyproject.toml /tmp/pyproject.toml
RUN pip install --no-cache-dir uv && uv pip install --system --no-cache -r /tmp/pyproject.toml

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH" PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user api/ ml/api/
COPY --chown=user config/ ml/config/
COPY --chown=user models/ ml/models/

# Set ALLOWED_ORIGINS as a Space variable, e.g. https://your-site.vercel.app
EXPOSE 7860
CMD ["uvicorn", "ml.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
