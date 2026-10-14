"""
Hugging Face Spaces Entrypoint for SepsisWatch-X.
Provides compatibility across both Docker and Python/Gradio Spaces.
Runs the unified FastAPI + React 3D Dashboard + Gradio Workbench + REST API.
"""

import os
import uvicorn
from backend.app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)
