#!/bin/bash
# ==============================================================================
# SepsisWatch-X — AWS EC2 Automated Deployment Script
# Automatically installs Docker, clones repository, builds container image,
# and starts the full-stack FastAPI + React 3D platform on Port 80.
# ==============================================================================

set -e

echo "--> [1/5] Updating packages and installing Docker & Git..."
sudo apt-get update -y
sudo apt-get install -y docker.io git curl

echo "--> [2/5] Enabling and starting Docker daemon..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

echo "--> [3/5] Pulling SepsisWatch-X repository..."
if [ -d "SepsisWatch-X" ]; then
    cd SepsisWatch-X
    git pull origin main
else
    git clone https://github.com/jpreethika40-oss/SepsisWatch-X.git
    cd SepsisWatch-X
fi

echo "--> [4/5] Building production Docker container..."
sudo docker build -t sepsiswatch-x:latest .

echo "--> [5/5] Launching container on Port 80..."
sudo docker stop sepsiswatch-container 2>/dev/null || true
sudo docker rm sepsiswatch-container 2>/dev/null || true

sudo docker run -d \
    --name sepsiswatch-container \
    --restart unless-stopped \
    -p 80:8000 \
    -e PORT=8000 \
    -e GEMINI_API_KEY="${GEMINI_API_KEY:-}" \
    sepsiswatch-x:latest

echo ""
echo "=================================================================="
echo "  SepsisWatch-X Platform successfully deployed on AWS EC2!"
echo "  Access live at: http://$(curl -s http://checkip.amazonaws.com)/"
echo "=================================================================="
