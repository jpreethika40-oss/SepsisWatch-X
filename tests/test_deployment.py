"""
Unit and Integration Tests for SepsisWatch-X Containerization & Deployment:
- Dockerfile syntax, multi-stage structure, and port 7860 adherence
- docker-compose.yml YAML validation and volume persistence
- .dockerignore exclusions
- Cloud deployment scripts (deploy_hf.sh, deploy_gcp.sh)
- Production frontend distribution bundle
"""

import os
from pathlib import Path
import yaml
import pytest


REPO_ROOT = Path(__file__).parent.parent


def test_dockerfile_structure():
    dockerfile_path = REPO_ROOT / "Dockerfile"
    assert dockerfile_path.exists(), "Dockerfile must exist at repository root."

    content = dockerfile_path.read_text(encoding="utf-8")
    # Verify multi-stage build
    assert "FROM node:" in content, "Dockerfile must include Node.js frontend builder stage."
    assert "FROM python:" in content, "Dockerfile must include Python runtime stage."
    assert "AS frontend-builder" in content, "Frontend stage must be named frontend-builder."
    
    # Verify port 7860 for Hugging Face Spaces / Cloud Run
    assert "7860" in content, "Dockerfile must configure port 7860."
    assert "EXPOSE 7860" in content, "Dockerfile must explicitly expose port 7860."

    # Verify non-root user UID 1000 for Hugging Face Spaces security standard
    assert "useradd -m -u 1000 user" in content or "USER user" in content, (
        "Dockerfile must configure user with UID 1000."
    )

    # Verify Healthcheck and CMD
    assert "HEALTHCHECK" in content, "Dockerfile must configure a container HEALTHCHECK."
    assert "uvicorn backend.app.main:app" in content, "Dockerfile CMD must launch backend.app.main:app."


def test_docker_compose_validity():
    compose_path = REPO_ROOT / "docker-compose.yml"
    assert compose_path.exists(), "docker-compose.yml must exist at repository root."

    content = compose_path.read_text(encoding="utf-8")
    data = yaml.safe_load(content)

    assert "services" in data, "docker-compose.yml must define services."
    assert "app" in data["services"], "docker-compose.yml must define 'app' service."

    app_svc = data["services"]["app"]
    assert "ports" in app_svc, "app service must map ports."
    # Check port 7860
    has_7860 = any("7860" in str(p) for p in app_svc["ports"])
    assert has_7860, "app service must expose port 7860."

    # Check persistence volumes
    assert "volumes" in app_svc, "app service must specify persistent volumes."
    has_data_vol = any("data" in str(v) for v in app_svc["volumes"])
    assert has_data_vol, "app service must persist ./data volume."


def test_dockerignore_exclusions():
    dockerignore_path = REPO_ROOT / ".dockerignore"
    assert dockerignore_path.exists(), ".dockerignore must exist at repository root."

    content = dockerignore_path.read_text(encoding="utf-8")
    assert ".venv" in content, ".dockerignore must exclude .venv."
    assert "frontend/node_modules" in content, ".dockerignore must exclude frontend/node_modules."
    assert "__pycache__" in content, ".dockerignore must exclude __pycache__."


def test_deployment_scripts():
    deploy_hf = REPO_ROOT / "scripts" / "deploy_hf.sh"
    deploy_gcp = REPO_ROOT / "scripts" / "deploy_gcp.sh"

    assert deploy_hf.exists(), "scripts/deploy_hf.sh must exist."
    assert deploy_gcp.exists(), "scripts/deploy_gcp.sh must exist."

    hf_content = deploy_hf.read_text(encoding="utf-8")
    assert "huggingface.co/spaces" in hf_content, "deploy_hf.sh must target Hugging Face Spaces."
    assert "7860" in hf_content, "deploy_hf.sh must verify port 7860."

    gcp_content = deploy_gcp.read_text(encoding="utf-8")
    assert "gcloud run deploy" in gcp_content, "deploy_gcp.sh must run gcloud run deploy."
    assert "7860" in gcp_content, "deploy_gcp.sh must configure port 7860."


def test_frontend_dist_assets():
    dist_dir = REPO_ROOT / "frontend" / "dist"
    index_html = dist_dir / "index.html"
    assets_dir = dist_dir / "assets"

    assert dist_dir.exists(), "frontend/dist must exist from npm run build."
    assert index_html.exists(), "frontend/dist/index.html must exist."
    assert assets_dir.exists(), "frontend/dist/assets must exist."
    
    html_content = index_html.read_text(encoding="utf-8")
    assert "<div id=\"root\">" in html_content or "<div id='root'>" in html_content, (
        "index.html must contain root mount div."
    )
