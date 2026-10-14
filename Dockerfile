# Multi-stage Dockerfile for SepsisWatch-X
# Optimized for Railway, Render, and Local Docker Containers
# Architecture:
#   Stage 1: Node.js 20 build environment for React 18 + Three.js 3D dashboard
#   Stage 2: Python 3.11-slim production runtime with FastAPI backend, ML models, and Gradio workbench

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend
# -----------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Python Runtime
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# System dependencies for scientific computing (OpenMP for LightGBM, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user with UID 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install Python dependencies (CPU-optimized PyTorch wheel + requirements)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend, trained ML models, config, data, and scripts
COPY --chown=user:user backend/ /app/backend/
COPY --chown=user:user models/ /app/models/
COPY --chown=user:user config/ /app/config/
COPY --chown=user:user results/ /app/results/
COPY --chown=user:user data/ /app/data/
COPY --chown=user:user scripts/ /app/scripts/
COPY --chown=user:user app.py /app/app.py

# Copy compiled frontend distribution from Stage 1
COPY --from=frontend-builder --chown=user:user /app/frontend/dist /app/frontend/dist

# Ensure writable directories for SQLite, datasets, and results
RUN mkdir -p /app/data /app/results && chown -R user:user /app

# Switch to non-root user
USER user

# Expose default application port 8000 and 7860
EXPOSE 8000
EXPOSE 7860

# Health check using dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start FastAPI application serving React 3D Dashboard at /, REST APIs at /api, and Gradio at /gradio
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
