# SepsisWatch-X: 3-Minute Clinical Evaluation Demo Script

> **Course Context:** Advanced Machine Learning Lab Project (40 Marks)  
> **Presenter:** Student / Lead Machine Learning & Full-Stack Engineer  
> **Target Audience:** Course Evaluators, Clinical Faculty & Senior Machine Learning Reviewers  
> **Target Duration:** Exactly 3 Minutes (180 Seconds)

---

## ⏱️ Timeline Overview

| Timestamp | Phase | View / Page | Key Speaking Point |
|---|---|---|---|
| **0:00 – 0:30** | The Sepsis Problem & Ward Floorplan | `/` (Command Center) | 3D ICU Ward bay, hourly risk elevation, persistent synthetic banner |
| **0:30 – 1:00** | Uncertainty & Explainability | `/patient` (Patient Detail) | Conformal 90% coverage bands, TreeSHAP & Integrated Gradients |
| **1:00 – 1:30** | Domain Invariance & Cross-Hospital Gap | `/scoreboard` & `/arena` | DANN latent alignment, A→B transfer drop mitigation, Reyna benchmark |
| **1:30 – 2:00** | Alarm-Budget Control & What-If | `/policy` & `/what-if` | Persistence/cooldown trade-off, counterfactual physiology shift |
| **2:00 – 2:30** | Data Drift & Stress-Testing | `/drift` (Drift Monitor) | Real-time PSI & KS-tests, acute shock injection toggle |
| **2:30 – 3:00** | Deployment & Architecture | `/gradio` & Docker | Multi-stage container, port 7860, Hugging Face Spaces SDK |

---

## 🎬 Minute-by-Minute Script

### Minute 0:00 – 0:30 | Introduction & 3D Command Center
- **Action:** Open browser at `http://localhost:5173/` or `http://localhost:7860/`. Orbit the 3D ICU Ward using the mouse.
- **Script:**
  > *"Good morning, evaluators. Sepsis is the leading cause of in-hospital mortality worldwide, where every single hour of delayed antibiotic intervention increases mortality by 7.6%.*
  > *This is SepsisWatch-X: an end-to-end, cross-hospital early-warning platform designed for intensive care units.*
  > *On screen is our dynamic 3D Command Center rendering a 12-bed ward in real time. Notice Bed 3 pulsing with an elevated crimson risk pillar at 0.88 probability, while Bed 7 is tagged with a holographic amber indicator. At the top, you can observe our persistent synthetic data indicator and clinical disclaimer."*

---

### Minute 0:30 – 1:00 | Patient EHR, Conformal Uncertainty & Explainability
- **Action:** Double-click Bed 3 or navigate to `/patient`. Scrub the hour timeline slider to Hour 14. Scroll to the Explainability panel.
- **Script:**
  > *"Clicking Bed 3 drills into the patient's full longitudinal telemetry. Unlike naive classifiers that output uncalibrated probabilities, SepsisWatch-X provides split conformal prediction intervals guaranteeing 90% finite-sample coverage.*
  > *At Hour 14, our calibrated probability is 84%, with a tight non-conformity interval of [0.76, 0.92].*
  > *Crucially, we do not present a black box to intensivists. Below the trajectory, our TreeSHAP breakdown highlights the precise physiological drivers: a rising heart rate of 122 bpm contributes +0.18 to the log-odds, compounded by a widening shock index and dropping MAP. Integrated Gradients across time steps confirm the acute 4-hour temporal deterioration."*

---

### Minute 1:00 – 1:30 | Cross-Hospital Transfer & DANN Domain Adaptation
- **Action:** Navigate to `/scoreboard`, then switch to the 3D Embedding Cloud view.
- **Script:**
  > *"In clinical machine learning, models trained at Hospital A typically suffer severe performance degradation when tested on Hospital B due to differences in lab measurement frequency and EHR protocols.*
  > *On our Cross-Hospital Scoreboard, standard LightGBM drops from a PhysioNet utility score of 0.412 at Hospital A down to 0.284 at Hospital B.*
  > *To conquer this, we implemented a Domain-Adversarial Neural Network (DANN) with a Gradient Reversal Layer. In this 3D latent embedding projection, you can toggle between 'Before DANN'—where the patient distributions are segregated—and 'After DANN', where the invariant representation aligns Hospital A and B. Our DANN fusion preserves a utility score of 0.362 with a 95% bootstrap confidence interval, outperforming the Reyna et al. 2020 benchmark."*

---

### Minute 1:30 – 2:00 | Alarm-Budget Optimization & What-If Simulation
- **Action:** Navigate to `/policy`, adjust the persistence slider to 2 hours, and then visit `/what-if`.
- **Script:**
  > *"Alert fatigue kills ICU patients when nurses become desensitized to nuisance alarms. Under Rubric Item 2, we engineered an Alarm-Budget Policy Controller with threshold persistence, a 6-hour refractory cooldown, and a maximum patient alarm cap.*
  > *Here on the policy curve, clinicians can visualize sensitivity versus alarms per patient-day.*
  > *Next, in the What-If Laboratory, physicians can simulate interventions. If we counterfactually restore the patient's mean arterial pressure from 62 to 78 mmHg and administer IV fluids to bring lactate down to 1.6 mmol/L, our meta-learner drops the sepsis risk delta by 34%, confirming therapeutic reversibility."*

---

### Minute 2:00 – 2:30 | Data Drift Monitor & Live Shock Injection
- **Action:** Navigate to `/drift`. Click the **'Inject Acute Shift'** button.
- **Script:**
  > *"Production clinical models must monitor silent data degradation. In our Drift Monitor, we continuously track the Population Stability Index (PSI) and 2-sample Kolmogorov-Smirnov tests against the Hospital A training baseline.*
  > *Currently, all features show green status with PSI under 0.1.*
  > *Let's simulate a sudden clinical protocol drift by clicking 'Inject Acute Shift'. Immediately, the 3D Drift Radar pulses red, the lactate PSI jumps to 0.298, and an automated alert triggers indicating that recalibration is required."*

---

### Minute 2:30 – 3:00 | Production Architecture, Gradio & Evaluation Verification
- **Action:** Navigate to `/gradio`, then show terminal with `pytest` results (33 passed).
- **Script:**
  > *"To ensure maximum clinical accessibility, SepsisWatch-X mounts an embedded Gradio inference workbench at `/gradio`, allowing clinicians to test patients directly from any browser.*
  > *Architecturally, the system is fully containerized in a multi-stage Dockerfile compliant with the Hugging Face Spaces Docker SDK on port 7860.*
  > *Our backend features FastAPI with Pydantic v2 schemas and an asynchronous SQLite/PostgreSQL layer with 16 relational tables.*
  > *Our test suite covers 33 unit and integration tests across data leakage, PyTorch gradients, conformal coverage, REST APIs, and deployment configurations—with 100% passing.*
  > *Thank you, and I look forward to your questions."*

---

## 💡 Anticipated Evaluator Q&A

1. **Q: How did you ensure zero patient leakage across folds?**  
   *A:* "Splits are partitioned strictly at the unique patient identifier (`patient_id`) level via `verify_split_leakage()` in `backend/ml/data_loader.py`. No sequence slices of the same patient ever span both train and test splits."

2. **Q: What is the exact mathematical formulation of the PhysioNet Utility Score?**  
   *A:* "It awards rewards up to +1.0 for true positive alarms between $t_{sepsis}-12$ and $t_{sepsis}-3$, imposes linearly increasing penalties down to -0.05 for missed detections, and levies a -0.05 penalty for false alarms."

3. **Q: How does the Split Conformal prediction ensure coverage?**  
   *A:* "Using calibration non-conformity scores $s_i = 1 - \hat{p}(y_i)$, we calculate the $(1-\alpha)(1 + 1/n)$ quantile $\hat{q}$. By finite-sample conformal theory, the true label falls within the prediction set with probability $\ge 1 - \alpha = 0.90$ without assuming asymptotic normality."
