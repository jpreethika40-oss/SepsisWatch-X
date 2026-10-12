# SepsisWatch-X: Cross-Hospital, Explainable, Uncertainty-Aware ICU Sepsis Early-Warning System

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.10-red.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-emerald.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-purple.svg)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)

> **One-Line System Definition:** A hybrid LightGBM and GRU-D stacked ensemble with domain-adversarial training (DANN), conformal uncertainty bounds, and alarm-budget control for cross-hospital sepsis early warning.

---

## 1. System Overview

SepsisWatch-X monitors intensive care unit (ICU) patients continuously hour-by-hour, predicting sepsis onset several hours ahead of clinical criteria (Sepsis-3) while maintaining robustness under cross-hospital deployment shifts.

```
                           +----------------------------------------------+
                           |  Raw Hourly ICU Telemetry (40 Biomarkers)    |
                           +-----------------------+----------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             | Rolling Feature Eng  |                              | Temporal GRU-D Net   |
             | 6h/12h mean/min/max  |                              | Values + Decay Mask  |
             +----------+-----------+                              +----------+-----------+
                        |                                                     |
             +----------v-----------+                              +----------v-----------+
             |   LightGBM Branch    |                              | GRL Head (DANN)      |
             |   Tabular GBDT       |                              | Invariant Manifold   |
             +----------+-----------+                              +----------+-----------+
                        |                                                     |
                        +--------------------------+--------------------------+
                                                   |
                                     +-------------v-------------+
                                     | Stacking Meta-Learner     |
                                     | Isotonic Recalibration    |
                                     +-------------+-------------+
                                                   |
                                     +-------------v-------------+
                                     | Split Conformal Bounds    |
                                     | 90% Coverage (S/NS/Uncert)|
                                     +-------------+-------------+
                                                   |
                                     +-------------v-------------+
                                     | Alarm Budget Controller   |
                                     | tau=0.45, k=2h, cool=6h   |
                                     +-------------+-------------+
                                                   |
                               +-------------------v-------------------+
                               |  Interactive 3D Clinical Dashboard   |
                               |  14 Pages • Three.js Ward • R3F       |
                               +---------------------------------------+
```

---


## 3. Dashboard Architecture: 14 Multi-Page Views & 5 3D Scenes

The frontend is built on **React 18 + Vite + TypeScript + Tailwind CSS + Three.js (@react-three/fiber & @react-three/drei) + Recharts + Zustand**.

### Interactive 3D Scenes:
1. **3D ICU Ward Floorplan (`Ward3D.tsx`):** Isometric 12-bed ward bay with risk elevation pillars, pulsing crimson alert rings, holographic uncertain tags, camera orbit/pan/zoom, and double-click to drill down into EHR.
2. **3D Risk Landscape (`RiskLandscape3D.tsx`):** Dynamic surface topology across time (hours 1-24), patients (beds 1-12), and risk height.
3. **3D Embedding Cloud (`EmbeddingCloud3D.tsx`):** Latent space point cloud of 500 patient-hours with an animated morph between *Before DANN* (domain gap) and *After DANN* (invariant manifold).
4. **3D Drift Radar (`DriftRadar3D.tsx`):** Rotating sensor ring encoding per-feature Population Stability Index (PSI) with vibration alerts under drift.
5. **3D Scoreboard (`Scoreboard3D.tsx`):** Dual-pillar comparison bars contrasting in-hospital vs cross-hospital performance drops.

### 14 Clinical Pages:
1. **Command Center (`/`):** 3D ward floorplan, live KPI strip, active alert ticker, quick telemetry inspector.
2. **Patient Detail (`/patient`):** Calibrated risk curve with 90% split conformal uncertainty band, true onset marker, multi-stream telemetry, SHAP & Integrated Gradients explanations, hour scrubber, and PDF export.
3. **What-If Lab (`/what-if`):** Sliders for HR, SBP, Temp, Lactate, WBC, Resp, Base Excess with real-time counterfactual risk diff.
4. **Model Arena (`/arena`):** Side-by-side execution of LightGBM, GRU-D, DANN Fusion, and SIRS/qSOFA rules with hospital site recalibration toggle.
5. **Alert Center (`/alerts`):** Live alarm feed, severity filtering (Critical, High, Moderate, Low), and acknowledgement modal with clinical audit notes.
6. **Alarm-Budget Control (`/policy`):** Sliders for threshold ($\tau$), persistence ($k$), cooldown ($c$), and patient cap ($M$) with sensitivity vs false-alarms trade-off curve.
7. **Cross-Hospital Scoreboard (`/scoreboard`):** 3D bars and matrix across A→A, A→B, B→B, B→A with bootstrap 95% CIs.
8. **Drift Monitor (`/drift`):** Traffic light status, 3D radar, PSI bar chart, Kolmogorov-Smirnov (KS) tests, and "Inject Shift" interactive button.
9. **Insights Lab (`/insights`):** Gallery of all 11 rubric figures with one-paragraph scientific insight captions and embedded 3D latent cloud.
10. **Benchmark & Errors (`/benchmark`):** Official CinC 2019 leaderboard comparisons (Reyna et al.) and demographic fairness audit across age, gender, ICU unit, and missingness.
11. **Experiments (`/experiments`):** Optuna Bayesian optimization study history and MLflow model registry runs.
12. **Data Upload (`/upload`):** Drag-and-drop .psv/.csv upload with simulated timeline inference.
13. **Admin (`/admin`):** EMR decision audit trail, user role management, model registry stages, and infrastructure health.
14. **About & Limits (`/about`):** Model card, clinical disclaimer, rubric compliance matrix, and deployment links.

---

## 4. Quickstart: Installation & Local Run

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Setup Environment
```bash
# 1. Activate Python virtual environment
.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On Linux/macOS

# 2. Generate high-fidelity synthetic PhysioNet 2019 dataset (240 patients)
python scripts/make_synthetic.py --patients 120

# 3. Initialize and seed SQLite/PostgreSQL database
python scripts/seed_db.py

# 4. Run the full unit & regression test suite (33 tests across DB, ML models, APIs & deployment)
python -m pytest tests/

# 5. Build and launch the full-stack system locally:
# Option A: Local Python & Node
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
# (In a separate terminal):
cd frontend && npm run dev
# Visit dashboard: http://localhost:5173
# API Docs: http://localhost:8000/docs | Interactive Gradio: http://localhost:8000/gradio

# Option B: Multi-Stage Docker Container (Port 7860, Hugging Face Spaces Compatible)
docker build -t sepsiswatch-x:latest .
docker run -p 7860:7860 sepsiswatch-x:latest
# Visit unified platform: http://localhost:7860

# Option C: Docker Compose
docker compose up --build
```

---

## 5. Cloud Deployment

### A. Hugging Face Spaces (Docker SDK - Port 7860)
Deploy directly using the automated script:
```bash
# Usage: ./scripts/deploy_hf.sh <username>/<space-name>
./scripts/deploy_hf.sh preethika/sepsiswatch-x
```

### B. Google Cloud Run (Serverless Container - Port 7860)
Deploy directly to Google Cloud Run:
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
./scripts/deploy_gcp.sh
```

---

## 5. Mandatory Academic & Clinical Disclaimers

> ⚠️ **IMPORTANT CLINICAL NOTICE:** SepsisWatch-X is developed exclusively for retrospective machine learning coursework and academic research. It is **NOT** cleared for clinical use or real-time patient diagnosis.
>
> ⚠️ **SYNTHETIC DATA BANNER:** When running in offline demonstration mode, a persistent amber warning banner is displayed across all pages indicating that synthetic data is active. The official rubric evaluation numbers require execution against the genuine PhysioNet 2019 dataset.
