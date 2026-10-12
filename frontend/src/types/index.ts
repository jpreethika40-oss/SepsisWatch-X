export type UserRole = 'viewer' | 'clinician' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
}

export interface Patient {
  id: number;
  patient_code: string;
  hospital: 'setA' | 'setB';
  age: number;
  gender: number; // 0: F, 1: M
  unit1: number;
  unit2: number;
  hosp_adm_time: number;
  is_active: boolean;
  bed_number: number;
  current_hour: number;
  risk: number;
  calibrated_prob: number;
  conformal_label: 'no_sepsis' | 'sepsis' | 'uncertain';
  status: 'normal' | 'caution' | 'critical';
}

export interface Observation {
  id: number;
  patient_id: number;
  hour: number;
  vitals: Record<string, number | null>;
  labs: Record<string, number | null>;
  sepsis_true_label: number;
}

export interface TopFeatureExplanation {
  feature: string;
  weight: number;
  value: number;
  direction: 'increases_risk' | 'decreases_risk';
  description?: string;
}

export interface Explanation {
  method: 'shap' | 'integrated_gradients';
  top_features: TopFeatureExplanation[];
  plain_english_text: string;
}

export interface PredictionPoint {
  hour: number;
  risk: number;
  calibrated_prob: number;
  conformal_label: 'no_sepsis' | 'sepsis' | 'uncertain';
  lower_bound: number;
  upper_bound: number;
  lgbm_risk: number;
  grud_risk: number;
  rule_score: number;
  is_alert: boolean;
  is_true_onset: boolean;
  explanation?: Explanation;
}

export interface Alert {
  id: number;
  patient_id: number;
  patient_code: string;
  bed_number: number;
  hour: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  status: 'active' | 'acknowledged' | 'dismissed';
  lead_time_hours?: number;
  message: string;
  created_at: string;
}

export interface PolicyConfig {
  version: string;
  risk_threshold: number;
  persistence_hours: number;
  cooldown_hours: number;
  max_alarms_per_patient: number;
  estimated_sensitivity: number;
  alarms_per_patient_day: number;
}

export interface DriftReport {
  overall_status: 'green' | 'amber' | 'red';
  max_psi: number;
  hospital_shift_detected: boolean;
  feature_psi: Record<string, number>;
  ks_stats: Record<string, { p_value: number; stat: number }>;
  sample_size: number;
  updated_at: string;
}

export interface ModelMetric {
  id: string;
  name: string;
  stage: 'staging' | 'production' | 'archived';
  auroc: number;
  auprc: number;
  utility_score: number;
  f1_score: number;
  latency_ms: number;
}

export interface CrossHospitalScore {
  model_name: string;
  setup_id: string;
  A_to_A: { utility: number; auroc: number; auprc: number; ci: [number, number] };
  A_to_B: { utility: number; auroc: number; auprc: number; ci: [number, number] };
  B_to_B: { utility: number; auroc: number; auprc: number; ci: [number, number] };
  B_to_A: { utility: number; auroc: number; auprc: number; ci: [number, number] };
  transfer_drop_pct: number;
}
