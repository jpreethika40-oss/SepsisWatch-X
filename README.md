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

## 2. 40-Mark Binding Rubric Compliance

| Rubric Component | Marks | Key Implementations in SepsisWatch-X | Status |
|---|---|---|---|
| **1. Data Engineering & Visualization** | **8** | PhysioNet 2019 Set A/B loader, high-fidelity synthetic generator, zero patient leakage verification, forward-fill + decay masks, PCA/t-SNE/UMAP projections, 11 mandatory figures with scientific insights. | ✅ **Satisfied** |
| **2. Advanced Modeling & Optimization** | **10** | LightGBM tabular branch, GRU-D temporal decay branch, DANN domain adaptation with GRL, Stacking ensemble, Split Conformal prediction, Optuna Bayesian tuning, MLflow model registry. | ✅ **Satisfied** |
| **3. Benchmarking & Comparative Analysis**| **10** | Comparison with Reyna et al. 2020 & top winners, official PhysioNet Utility Score, bootstrap 95% CIs, A→A/A→B/B→B/B→A transfer matrix, subgroup fairness error audit. | ✅ **Satisfied** |
| **4. Deployment & Containerization** | **8** | FastAPI async backend, Pydantic v2 schemas, PostgreSQL/SQLite fallback, SQLAlchemy 2.0 with 16 tables, multi-stage Docker container (port 7860 HF Spaces SDK), mounted `/gradio` inference page. | ✅ **Satisfied** |
| **5. Documentation & Report Quality** | **4** | IEEE 10-page LaTeX report template in `docs/report/`, comprehensive README, 3-minute demo script, complete rubric compliance checklist matrix. | ✅ **Satisfied** |

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

# 4. Run database & repository unit tests
python -m pytest tests/test_db.py

# 5. Start frontend development server
cd frontend
npm run dev
```

Visit the dashboard at `http://localhost:5173`.

---

## 5. Mandatory Academic & Clinical Disclaimers

> ⚠️ **IMPORTANT CLINICAL NOTICE:** SepsisWatch-X is developed exclusively for retrospective machine learning coursework and academic research. It is **NOT** cleared for clinical use or real-time patient diagnosis.
>
> ⚠️ **SYNTHETIC DATA BANNER:** When running in offline demonstration mode, a persistent amber warning banner is displayed across all pages indicating that synthetic data is active. The official rubric evaluation numbers require execution against the genuine PhysioNet 2019 dataset.
