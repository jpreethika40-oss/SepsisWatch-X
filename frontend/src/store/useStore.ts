import { create } from 'zustand';
import { Patient, Alert, PolicyConfig, DriftReport } from '../types';

interface AppState {
  // Clinical ward state
  patients: Patient[];
  selectedPatientId: number | null;
  alerts: Alert[];
  unreadAlertCount: number;
  
  // Simulator state
  isSimRunning: boolean;
  simSpeed: number;
  currentSimHour: number;
  driftInjected: boolean;
  
  // Policy & Drift
  policy: PolicyConfig;
  drift: DriftReport;
  
  // App Preferences & Modes
  isSyntheticData: boolean;
  is2DMode: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light';
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  commandPaletteOpen: boolean;
  
  // Actions
  setSelectedPatientId: (id: number | null) => void;
  setPatients: (patients: Patient[]) => void;
  updatePatientRisk: (id: number, risk: number, hour: number, conformal: 'no_sepsis' | 'sepsis' | 'uncertain') => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: number) => void;
  setSimRunning: (running: boolean) => void;
  setSimSpeed: (speed: number) => void;
  setCurrentSimHour: (hour: number) => void;
  setDriftInjected: (injected: boolean) => void;
  setPolicy: (policy: PolicyConfig) => void;
  setDrift: (drift: DriftReport) => void;
  setIs2DMode: (is2D: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setWsStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

const INITIAL_PATIENTS: Patient[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  patient_code: `p_${i % 2 === 0 ? 'A' : 'B'}_${(i + 1).toString().padStart(5, '0')}`,
  hospital: i % 2 === 0 ? 'setA' : 'setB',
  age: 50 + (i * 3) % 35,
  gender: i % 2,
  unit1: i % 2 === 0 ? 1 : 0,
  unit2: i % 2 === 0 ? 0 : 1,
  hosp_adm_time: -12.0 - (i * 2),
  is_active: true,
  bed_number: i + 1,
  current_hour: 4,
  risk: i === 2 ? 0.88 : i === 6 ? 0.58 : 0.12 + (i * 0.03),
  calibrated_prob: i === 2 ? 0.84 : i === 6 ? 0.55 : 0.11 + (i * 0.03),
  conformal_label: i === 2 ? 'sepsis' : i === 6 ? 'uncertain' : 'no_sepsis',
  status: i === 2 ? 'critical' : i === 6 ? 'caution' : 'normal',
}));

const INITIAL_ALERTS: Alert[] = [
  {
    id: 1,
    patient_id: 3,
    patient_code: 'p_A_00003',
    bed_number: 3,
    hour: 4,
    severity: 'critical',
    risk_score: 0.88,
    status: 'active',
    lead_time_hours: 4.5,
    message: 'Persistent Tachycardia (HR 124) + MAP Drop (62 mmHg). Model uncertainty: Low (Conformal: Sepsis).',
    created_at: '2 min ago'
  },
  {
    id: 2,
    patient_id: 7,
    patient_code: 'p_B_00007',
    bed_number: 7,
    hour: 4,
    severity: 'moderate',
    risk_score: 0.58,
    status: 'active',
    lead_time_hours: 5.2,
    message: 'Subtle lactate elevation (2.4 mmol/L) with borderline WBC. Model uncertainty: High (Conformal: Uncertain).',
    created_at: '8 min ago'
  }
];

export const useStore = create<AppState>((set) => ({
  patients: INITIAL_PATIENTS,
  selectedPatientId: 3, // Default to Bed 3 (the critical alert patient)
  alerts: INITIAL_ALERTS,
  unreadAlertCount: 2,
  
  isSimRunning: false,
  simSpeed: 1,
  currentSimHour: 4,
  driftInjected: false,
  
  policy: {
    version: 'v1.0.0-tuned',
    risk_threshold: 0.45,
    persistence_hours: 2,
    cooldown_hours: 6,
    max_alarms_per_patient: 4,
    estimated_sensitivity: 0.84,
    alarms_per_patient_day: 0.92,
  },
  
  drift: {
    overall_status: 'green',
    max_psi: 0.042,
    hospital_shift_detected: false,
    feature_psi: {
      HR: 0.031,
      SBP: 0.042,
      MAP: 0.038,
      Resp: 0.025,
      Temp: 0.019,
      Lactate: 0.035,
      WBC: 0.028,
    },
    ks_stats: {
      HR: { p_value: 0.42, stat: 0.04 },
      SBP: { p_value: 0.38, stat: 0.05 },
    },
    sample_size: 240,
    updated_at: 'Just now'
  },
  
  isSyntheticData: true,
  is2DMode: false,
  soundEnabled: false,
  theme: 'dark',
  wsStatus: 'connected',
  commandPaletteOpen: false,
  
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setPatients: (patients) => set({ patients }),
  updatePatientRisk: (id, risk, hour, conformal) => set((state) => ({
    patients: state.patients.map((p) =>
      p.id === id
        ? {
            ...p,
            risk,
            calibrated_prob: risk * 0.96,
            current_hour: hour,
            conformal_label: conformal,
            status: risk >= 0.7 ? 'critical' : risk >= 0.4 ? 'caution' : 'normal'
          }
        : p
    )
  })),
  setAlerts: (alerts) => set({ alerts, unreadAlertCount: alerts.filter(a => a.status === 'active').length }),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
    unreadAlertCount: state.unreadAlertCount + 1
  })),
  acknowledgeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a),
    unreadAlertCount: Math.max(0, state.unreadAlertCount - 1)
  })),
  setSimRunning: (isSimRunning) => set({ isSimRunning }),
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  setCurrentSimHour: (currentSimHour) => set({ currentSimHour }),
  setDriftInjected: (driftInjected) => set({ driftInjected }),
  setPolicy: (policy) => set({ policy }),
  setDrift: (drift) => set({ drift }),
  setIs2DMode: (is2DMode) => set({ is2DMode }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
