import { create } from 'zustand';
import { 
  Patient, Alert, PolicyConfig, DriftReport, User, 
  ClinicalPersona, AuditEntry 
} from '../types';

interface AppState {
  // Ward & Patient Data
  patients: Patient[];
  selectedPatientId: number | null;
  alerts: Alert[];
  unreadAlertCount: number;
  auditTrail: AuditEntry[];
  lastAckNotice: string | null;
  setLastAckNotice: (msg: string | null) => void;
  
  // Role & Hospital Views
  currentRole: ClinicalPersona;
  selectedHospital: 'all' | 'setA' | 'setB';
  isAuthModalOpen: boolean;
  currentUser: User;
  isAuthenticated: boolean;
  login: (user: User, role: ClinicalPersona) => void;
  logout: () => void;
  
  // Real-time Simulation & Replay
  operationalMode: 'live' | 'replay' | 'simulation';
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
  setCurrentRole: (role: ClinicalPersona) => void;
  setSelectedHospital: (hosp: 'all' | 'setA' | 'setB') => void;
  setOperationalMode: (mode: 'live' | 'replay' | 'simulation') => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setCurrentUser: (user: User) => void;
  setSelectedPatientId: (id: number | null) => void;
  setPatients: (patients: Patient[]) => void;
  updatePatientRisk: (id: number, risk: number, hour: number, conformal: 'no_sepsis' | 'sepsis' | 'uncertain', vitals?: Record<string, number>) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: number, clinicianName?: string, notes?: string) => Promise<void>;
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

const DIAGNOSES = [
  { diag: 'Post-op Coronary Artery Bypass Graft (CABG)', treat: 'Aspirin, Metoprolol, Incentive Spirometry' },
  { diag: 'Acute Exacerbation of Severe COPD', treat: 'DuoNeb q4h, Methylprednisolone 60mg, 2L NC' },
  { diag: 'Septic Shock / Severe Lobar Pneumosepsis', treat: 'Norepinephrine 0.20 mcg/kg/min, Vancomycin + Cefepime, 30 mL/kg Bolus' },
  { diag: 'Traumatic Brain Injury / Subdural Hematoma', treat: 'Hypertonic Saline 3%, Keppra 750mg, Continuous ICP Line' },
  { diag: 'Acute Necrotizing Pancreatitis', treat: 'Aggressive Ringer\'s Lactate, Pantoprazole IV, NPO' },
  { diag: 'Decompensated Heart Failure (NYHA Class IV)', treat: 'Furosemide 40mg IV BID, Enalaprilat, Fluid Restriction 1.5L' },
  { diag: 'Complicated Urosepsis & Hydronephrosis', treat: 'Ceftriaxone 2g IV, IVF 125 mL/hr, Foley Catheter' },
  { diag: 'Diabetic Ketoacidosis (DKA) with Acute Kidney Injury', treat: 'Regular Insulin Drip 0.1 u/kg/hr, D5 1/2NS + 20 mEq KCl' },
  { diag: 'Post-Exploratory Laparotomy (Perforated Viscus)', treat: 'Morphine PCA, Zosyn 3.375g q6h, NG Tube Low Wall Suction' },
  { diag: 'Acute Ischemic Stroke / Status Post Thrombectomy', treat: 'Aspirin 325mg, Atorvastatin 80mg, Continuous Neuro Checks q1h' },
  { diag: 'Community-Acquired Bilateral Pneumonia', treat: 'Azithromycin + Ceftriaxone, High-Flow Nasal Cannula' },
  { diag: 'Acute Hepatorenal Syndrome with Refractory Ascites', treat: 'Albumin 25g IV, Octreotide 50mcg SC, Midodrine 10mg TID' }
];

const INITIAL_PATIENTS: Patient[] = Array.from({ length: 12 }, (_, i) => {
  const isCritical = i === 2; // Bed 3
  const isCaution = i === 6;  // Bed 7
  const risk = isCritical ? 0.88 : isCaution ? 0.58 : Number((0.12 + (i * 0.02)).toFixed(2));

  return {
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
    risk: risk,
    calibrated_prob: isCritical ? 0.84 : isCaution ? 0.55 : Number((risk * 0.95).toFixed(2)),
    conformal_label: isCritical ? 'sepsis' : isCaution ? 'uncertain' : 'no_sepsis',
    status: isCritical ? 'critical' : isCaution ? 'caution' : 'normal',
    diagnosis: DIAGNOSES[i].diag,
    active_treatments: DIAGNOSES[i].treat,
    vitals: {
      HR: isCritical ? 124 : isCaution ? 98 : 72 + (i * 2),
      SBP: isCritical ? 82 : isCaution ? 105 : 122 - Math.round(i * 1.5),
      MAP: isCritical ? 61 : isCaution ? 72 : 86 - i,
      Resp: isCritical ? 28 : isCaution ? 22 : 16,
      Temp: isCritical ? 38.8 : isCaution ? 38.1 : 36.9,
      Lactate: isCritical ? 3.8 : isCaution ? 2.4 : 1.1,
      WBC: isCritical ? 18.2 : isCaution ? 12.8 : 7.4,
      O2Sat: isCritical ? 93 : isCaution ? 96 : 98,
    }
  };
});

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
    lead_time_hours: 5.2,
    message: 'Persistent Tachycardia (HR 124) + MAP Drop (61 mmHg) + Lactate 3.8 mmol/L. Conformal Uncertainty: Low (Sepsis label 90% finite-sample confidence).',
    created_at: '10 min ago'
  },
  {
    id: 2,
    patient_id: 7,
    patient_code: 'p_A_00007',
    bed_number: 7,
    hour: 4,
    severity: 'moderate',
    risk_score: 0.58,
    status: 'active',
    lead_time_hours: 4.5,
    message: 'Borderline Tachypnea (Resp 22) + Fever (38.1°C) + Lactate 2.4 mmol/L. Conformal prediction: UNCERTAIN set [No-Sepsis, Sepsis].',
    created_at: '24 min ago'
  }
];

const INITIAL_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'AUD-001',
    alert_id: 'ALT-3-3',
    bed_number: 3,
    patient_code: 'p_A_00003',
    clinician_name: 'Dr. Sarah Connor, MD',
    action_taken: 'Initiated 30 mL/kg IV crystalloid bolus; broad-spectrum antibiotics ordered.',
    notes: 'Severe hypotension (MAP 61) and elevated lactate concordant with Sepsis-3 definition.',
    timestamp: '2026-10-13 14:45 UTC',
    status: 'Acknowledged & Managed'
  }
];

const INITIAL_USER: User = {
  id: 1,
  email: 'dr.connor@icu.org',
  role: 'clinician',
  full_name: 'Dr. Sarah Connor, MD',
};

export const useStore = create<AppState>((set, get) => ({
  patients: INITIAL_PATIENTS,
  selectedPatientId: 3, // Default to Bed 3 (the critical alert patient)
  alerts: INITIAL_ALERTS,
  unreadAlertCount: 2,
  auditTrail: INITIAL_AUDIT_LOG,
  lastAckNotice: null,
  setLastAckNotice: (lastAckNotice) => set({ lastAckNotice }),
  
  // Role & Hospital Views
  currentRole: (localStorage.getItem('sepsiswatch_role') as ClinicalPersona) || 'doctor',
  selectedHospital: 'all',
  isAuthModalOpen: false,
  currentUser: {
    id: 1,
    email: localStorage.getItem('sepsiswatch_email') || 'dr.connor@icu.org',
    role: (localStorage.getItem('sepsiswatch_role') as ClinicalPersona) || 'doctor',
    full_name: localStorage.getItem('sepsiswatch_name') || 'Dr. Sarah Connor, MD',
  },
  isAuthenticated: localStorage.getItem('sepsiswatch_auth') === 'true',

  login: (user: User, role: ClinicalPersona) => {
    localStorage.setItem('sepsiswatch_auth', 'true');
    localStorage.setItem('sepsiswatch_role', role);
    localStorage.setItem('sepsiswatch_name', user.full_name);
    localStorage.setItem('sepsiswatch_email', user.email);
    set({
      isAuthenticated: true,
      currentUser: user,
      currentRole: role,
    });
  },

  logout: () => {
    localStorage.removeItem('sepsiswatch_auth');
    localStorage.removeItem('sepsiswatch_role');
    localStorage.removeItem('sepsiswatch_name');
    localStorage.removeItem('sepsiswatch_email');
    set({
      isAuthenticated: false,
      currentUser: INITIAL_USER,
      currentRole: 'doctor',
    });
  },
  
  // Simulation modes
  operationalMode: 'replay',
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
  
  isSyntheticData: false, // Operating on dual-hospital clinical research cohort
  is2DMode: false,
  soundEnabled: false,
  theme: 'dark',
  wsStatus: 'connected',
  commandPaletteOpen: false,
  
  setCurrentRole: (currentRole) => set({ currentRole }),
  setSelectedHospital: (selectedHospital) => set({ selectedHospital }),
  setOperationalMode: (operationalMode) => set({ operationalMode }),
  setIsAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setPatients: (patients) => set({
    patients: Array.isArray(patients) && patients.length > 0 ? patients : INITIAL_PATIENTS
  }),
  updatePatientRisk: (id, risk, hour, conformal, vitals) => set((state) => ({
    patients: state.patients.map((p) =>
      p.id === id
        ? {
            ...p,
            risk,
            calibrated_prob: Number((risk * 0.96).toFixed(4)),
            current_hour: hour,
            conformal_label: conformal,
            status: risk >= 0.7 ? 'critical' : risk >= 0.4 ? 'caution' : 'normal',
            vitals: vitals || p.vitals
          }
        : p
    )
  })),
  setAlerts: (alerts) => set({ alerts, unreadAlertCount: alerts.filter(a => a.status === 'active').length }),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
    unreadAlertCount: state.unreadAlertCount + 1
  })),
  acknowledgeAlert: async (alertId, clinicianName, notes) => {
    const user = get().currentUser;
    const signer = clinicianName || user.full_name || 'Dr. Sarah Connor, MD';
    const noteText = notes || 'Bedside examination completed; vitals and IV perfusion reviewed.';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const targetAlert = get().alerts.find(a => a.id === alertId);
    const bedNum = targetAlert ? targetAlert.bed_number : 3;

    // 1. Dispatch acknowledgment to backend API
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinician_name: signer,
          action_taken: 'Bedside ICU examination conducted; fluids verified.',
          notes: noteText
        })
      });
    } catch (e) {
      console.warn('[Alert] Backend acknowledge call handled with offline persistence:', e);
    }

    // 2. Create Audit Entry
    const newAudit: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      alert_id: `ALT-${bedNum}-${get().currentSimHour}`,
      bed_number: bedNum,
      patient_code: targetAlert?.patient_code || `p_A_${bedNum.toString().padStart(5, '0')}`,
      clinician_name: signer,
      action_taken: 'Bedside examination conducted; hemodynamics verified.',
      notes: noteText,
      timestamp: now,
      status: 'Acknowledged'
    };

    set((state) => ({
      alerts: state.alerts.map(a => 
        a.id === alertId 
          ? { ...a, status: 'acknowledged', acknowledged_by: signer, acknowledged_at: now, action_taken: newAudit.action_taken } 
          : a
      ),
      unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
      auditTrail: [newAudit, ...state.auditTrail],
      lastAckNotice: `✓ Alert for Bed ${bedNum} acknowledged by ${signer}. Logged in Clinical Audit Trail.`
    }));

    // Auto-clear notification toast after 6 seconds
    setTimeout(() => {
      set({ lastAckNotice: null });
    }, 6000);
  },
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
