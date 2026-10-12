#!/usr/bin/env bash
# =============================================================================
# SepsisWatch-X: Google Cloud Run Deployment Script
# Rubric Item 4: Cloud Deployment via Serverless Container (Port 7860)
# =============================================================================

set -e

SERVICE_NAME="sepsiswatch-x"
REGION="${GCP_REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

echo "======================================================================"
echo "  SepsisWatch-X - Google Cloud Run Deployment"
echo "======================================================================"

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Google Cloud Project ID not set."
    echo "   Please set GCP_PROJECT_ID or run: gcloud config set project <PROJECT_ID>"
    exit 1
fi

echo "--> Target Project: ${PROJECT_ID}"
echo "--> Target Region:  ${REGION}"
echo "--> Service Name:   ${SERVICE_NAME}"

# Verify gcloud authentication
if ! gcloud auth print-access-token >/dev/null 2>&1; then
    echo "❌ Error: gcloud authentication token expired or missing."
    echo "   Please run: gcloud auth login"
    exit 1
fi

# Build and deploy directly via Cloud Build and Cloud Run
echo "--> Deploying ${SERVICE_NAME} to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --source . \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --port 7860 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 5 \
    --allow-unauthenticated \
    --set-env-vars "PORT=7860,HOST=0.0.0.0,PYTHONUNBUFFERED=1"

echo ""
echo "======================================================================"
echo "✅ Cloud Run deployment complete!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --project "${PROJECT_ID}" --format 'value(status.url)')
echo "   Live URL: ${SERVICE_URL}"
echo "   Dashboard: ${SERVICE_URL}/"
echo "   Gradio:    ${SERVICE_URL}/gradio"
echo "   API Docs:  ${SERVICE_URL}/docs"
echo "======================================================================"
