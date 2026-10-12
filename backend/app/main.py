"""
FastAPI Application Entrypoint for SepsisWatch-X.
Exposes REST APIs, WebSocket real-time ward telemetry stream,
static figures, and embedded Gradio inference workbench at /gradio.
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import gradio as gr

from backend.app.routers import patients, prediction, policy, drift, scoreboard, stream
from backend.app.services.simulator import simulator
from backend.app.gradio_app import build_gradio_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown."""
    print("--> SepsisWatch-X Backend Initialized.")
    print("    Models: LightGBM, GRU-D, DANN, Stacking Ensemble, Split Conformal.")
    print("    Ward Stream: 12 active beds ready.")
    yield
    print("--> SepsisWatch-X Backend Shutting Down.")


app = FastAPI(
    title="SepsisWatch-X Clinical Early-Warning Platform API",
    description="Cross-hospital, explainable, uncertainty-aware ICU sepsis early-warning platform.",
    version="1.0.0",
    lifespan=lifespan
)

# 1. CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Register API Routers
app.include_router(patients.router)
app.include_router(prediction.router)
app.include_router(policy.router)
app.include_router(drift.router)
app.include_router(scoreboard.router)
app.include_router(stream.router)

# 3. Mount Static Figures Directory for InsightsLab
figures_dir = Path("results/figures")
figures_dir.mkdir(parents=True, exist_ok=True)
app.mount("/figures", StaticFiles(directory=str(figures_dir)), name="figures")

# 4. Mount Embedded Gradio Application at /gradio
try:
    gradio_blocks = build_gradio_app()
    app = gr.mount_gradio_app(app, gradio_blocks, path="/gradio")
except Exception as e:
    print(f"Warning: Could not mount Gradio app: {e}")


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """Healthcheck endpoint returning system, model, and dataset provenance status."""
    synthetic_marker = Path("data/.synthetic_data_active").exists()
    return {
        "status": "healthy",
        "service": "SepsisWatch-X API",
        "version": "1.0.0",
        "synthetic_data_active": synthetic_marker,
        "models": {
            "lgbm": simulator.lgbm is not None,
            "fusion": simulator.fusion is not None,
            "conformal": simulator.conformal is not None,
            "q_hat": getattr(simulator.conformal, "q_hat", 0.08) if simulator.conformal else 0.08
        },
        "ward": {
            "active_beds": len(simulator.beds_state),
            "sim_speed": simulator.sim_speed,
            "current_tick": simulator.current_tick
        }
    }


@app.get("/")
async def root():
    """Root redirect and info summary."""
    return {
        "title": "SepsisWatch-X API",
        "docs_url": "/docs",
        "gradio_url": "/gradio",
        "health_url": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
