#!/usr/bin/env bash
# =============================================================================
# SepsisWatch-X: Hugging Face Spaces Deployment Script
# Rubric Item 4: Cloud Deployment via Docker SDK (Port 7860)
# =============================================================================

set -e

echo "======================================================================"
echo "  SepsisWatch-X - Hugging Face Spaces Deployment"
echo "======================================================================"

if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy_hf.sh <hf-username>/<space-name>"
    echo "Example: ./scripts/deploy_hf.sh preethika/sepsiswatch-x"
    exit 1
fi

SPACE_REPO="$1"
REMOTE_URL="https://huggingface.co/spaces/${SPACE_REPO}"

echo "--> Target Hugging Face Space: ${REMOTE_URL}"

# 1. Verify Dockerfile exists and configures port 7860
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found in root directory."
    exit 1
fi

echo "--> Verifying Docker port configuration (7860)..."
if grep -q "7860" Dockerfile; then
    echo "✅ Port 7860 verified in Dockerfile."
else
    echo "⚠️ Warning: Port 7860 not explicitly detected in Dockerfile."
fi

# 2. Check or add Hugging Face remote
if git remote | grep -q "hf"; then
    echo "--> Updating existing 'hf' git remote..."
    git remote set-url hf "${REMOTE_URL}"
else
    echo "--> Adding 'hf' git remote..."
    git remote add hf "${REMOTE_URL}"
fi

# 3. Check git status
echo "--> Checking git repository cleanliness..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Working directory contains uncommitted changes. Committing..."
    git add .
    git commit -m "chore(deploy): prepare files for Hugging Face Spaces deployment"
fi

# 4. Push to Hugging Face Spaces
echo "--> Pushing main branch to Hugging Face Spaces..."
git push hf main --force

echo ""
echo "======================================================================"
echo "✅ Deployment initiated successfully!"
echo "   View Space build and runtime logs at:"
echo "   https://huggingface.co/spaces/${SPACE_REPO}"
echo "======================================================================"
