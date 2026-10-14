"""
Hugging Face Spaces Entrypoint for SepsisWatch-X.
Compatible with free Gradio SDK (No Card Needed), Docker SDK, and standalone Python.
Runs the unified FastAPI + React 3D Dashboard + Gradio Workbench + REST API.
"""

import os
import uvicorn
import gradio as gr
from backend.app.main import app
from backend.app.gradio_app import build_gradio_app

# Expose Gradio demo instance for Hugging Face Spaces Gradio runner
demo = build_gradio_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    # Uvicorn serves FastAPI at 0.0.0.0:7860, which includes:
    # - React 3D Dashboard at /
    # - Interactive Gradio Workbench at /gradio
    # - REST APIs at /api
    # - Real-time WebSocket at /ws
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
