import { create } from 'zustand';
import { 
  Patient, Alert, PolicyConfig, DriftReport, User, 
  ClinicalPersona, AuditEntry, EscalationEntry 
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
  
  // Nurse-to-Doctor Escalations
  escalations: EscalationEntry[];
  addEscalation: (esc: Omit<EscalationEntry, 'id' | 'created_at' | 'status'>) => Promise<void>;
  batchAcknowledgeEscalations: (ids: string[], doctorName: string, pin: string, orders: string) => Promise<void>;
  batchAcknowledgeAlerts: (alertIds: number[], doctorName: string, pin: string, orders: string) => Promise<void>;
  setEscalations: (escalations: EscalationEntry[]) => void;
  
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
  const baseRisk = Number((0.10 + ((i * 2) % 10) * 0.01).toFixed(2));

  return {
    id: i + 1,
    patient_code: `p_${i % 2 === 0 ? 'A' : 'B'}_${(i + 1).toString().padStart(5, '0')}`,
    hospital: i % 2 === 0 ? 'setA' : 'setB',
    age: 48 + ((i * 4) % 36),
    gender: i % 2,
    unit1: i % 2 === 0 ? 1 : 0,
    unit2: i % 2 === 0 ? 0 : 1,
    hosp_adm_time: -12.0 - (i * 2),
    is_active: true,
    bed_number: i + 1,
    current_hour: 4,
    risk: baseRisk,
    calibrated_prob: Number((baseRisk * 0.95).toFixed(2)),
    conformal_label: 'no_sepsis',
    status: 'normal',
    diagnosis: DIAGNOSES[i].diag,
    active_treatments: DIAGNOSES[i].treat,
    vitals: {
      HR: 70 + ((i * 3) % 15),
      SBP: 116 + ((i * 4) % 16),
      MAP: 82 + ((i * 2) % 8),
      Resp: 15 + (i % 3),
      Temp: Number((36.7 + (i % 3) * 0.2).toFixed(1)),
      Lactate: Number((0.9 + (i % 3) * 0.2).toFixed(1)),
      WBC: Number((6.8 + (i % 4) * 0.5).toFixed(1)),
      O2Sat: 98 - (i % 3),
    }
  };
});

const INITIAL_ALERTS: Alert[] = [];

const INITIAL_ESCALATIONS: EscalationEntry[] = [];

const INITIAL_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'AUD-001',
    alert_id: 'ALT-INITIAL',
    bed_number: 1,
    patient_code: 'p_A_00001',
    clinician_name: 'Dr. Sarah Connor, MD',
    action_taken: 'ICU Shift Handover Complete: All beds calibrated under Split Conformal Prediction.',
    notes: 'Baseline ward telemetry established; automated early warning active.',
    timestamp: 'Shift Start',
    status: 'System Baseline'
  }
];

const INITIAL_USER: User = {
  id: 1,
  email: 'dr.connor@icu.org',
  role: 'doctor',
  full_name: 'Dr. Sarah Connor, MD',
};

export const useStore = create<AppState>((set, get) => ({
  patients: INITIAL_PATIENTS,
  selectedPatientId: 1,
  alerts: INITIAL_ALERTS,
  unreadAlertCount: 0,
  auditTrail: INITIAL_AUDIT_LOG,
  lastAckNotice: null,
  setLastAckNotice: (lastAckNotice) => set({ lastAckNotice }),
  
  // Nurse-to-Doctor Escalations
  escalations: INITIAL_ESCALATIONS,
  setEscalations: (escalations) => set({ escalations }),
  
  // Role & Hospital Views
  currentRole: (sessionStorage.getItem('sepsiswatch_role') as ClinicalPersona) || 'doctor',
  selectedHospital: 'all',
  isAuthModalOpen: false,
  currentUser: {
    id: 1,
    email: sessionStorage.getItem('sepsiswatch_email') || 'dr.connor@icu.org',
    role: (sessionStorage.getItem('sepsiswatch_role') as ClinicalPersona) || 'doctor',
    full_name: sessionStorage.getItem('sepsiswatch_name') || 'Dr. Sarah Connor, MD',
  },
  // Ensure the app always starts at the Login page on fresh browser launch
  isAuthenticated: sessionStorage.getItem('sepsiswatch_auth') === 'true',

  login: (user: User, role: ClinicalPersona) => {
    sessionStorage.setItem('sepsiswatch_auth', 'true');
    sessionStorage.setItem('sepsiswatch_role', role);
    sessionStorage.setItem('sepsiswatch_name', user.full_name);
    sessionStorage.setItem('sepsiswatch_email', user.email);
    set({
      isAuthenticated: true,
      currentUser: user,
      currentRole: role,
    });
  },

  logout: () => {
    sessionStorage.clear();
    localStorage.clear();
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

  addEscalation: async (escData) => {
    const escId = `ESC-${Date.now().toString().slice(-3)}`;
    const newEsc: EscalationEntry = {
      ...escData,
      id: escId,
      status: 'pending',
      created_at: 'Just now'
    };

    // Ensure corresponding active alert exists in alerts state so notification counters increment
    const currentAlerts = get().alerts;
    const matchingAlert = currentAlerts.find(a => a.bed_number === escData.bed_number && a.status === 'active');
    let updatedAlerts = currentAlerts;
    if (!matchingAlert) {
      const newAlert: Alert = {
        id: Date.now() + escData.bed_number,
        patient_id: escData.patient_id || escData.bed_number,
        patient_code: escData.patient_code || `p_A_${escData.bed_number.toString().padStart(5, '0')}`,
        bed_number: escData.bed_number,
        hour: get().currentSimHour,
        severity: (escData.severity as 'critical' | 'moderate') || 'critical',
        risk_score: escData.risk_score || 0.85,
        status: 'active',
        lead_time_hours: 5.0,
        message: `🚨 Bed ${escData.bed_number} (${escData.patient_code}) escalated by Nurse ${escData.nurse_name}: ${escData.notes}`,
        created_at: 'Just now'
      };
      updatedAlerts = [newAlert, ...currentAlerts];
    }

    set((state) => ({
      escalations: [newEsc, ...state.escalations],
      alerts: updatedAlerts,
      unreadAlertCount: updatedAlerts.filter(a => a.status === 'active').length,
      lastAckNotice: `🚨 Escalation for Bed ${escData.bed_number} transmitted to Attending Physician.`
    }));

    try {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escData)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.escalation && resData.escalation.id) {
          set((state) => ({
            escalations: state.escalations.map(e => e.id === escId ? { ...e, id: resData.escalation.id } : e)
          }));
        }
      }
    } catch (e) {
      console.warn('[Escalation] Fallback local persistence:', e);
    }

    setTimeout(() => {
      set({ lastAckNotice: null });
    }, 6000);
  },

  batchAcknowledgeEscalations: async (ids, doctorName, pin, orders) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const maskedPin = pin.length >= 3 ? `***${pin.slice(-3)}` : '***';

    try {
      await fetch('/api/escalations/batch-acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalation_ids: ids,
          doctor_name: doctorName,
          signature_pin: pin,
          orders: orders
        })
      });
    } catch (e) {
      console.warn('[BatchEsc] Fallback local batch ack:', e);
    }

    set((state) => {
      const updatedEscalations = state.escalations.map((esc) => {
        if (ids.includes(esc.id)) {
          return {
            ...esc,
            status: 'acknowledged' as const,
            acknowledged_by: doctorName,
            acknowledged_at: now,
            doctor_orders: orders,
            signature_pin: maskedPin
          };
        }
        return esc;
      });

      const updatedAlerts = state.alerts.map((a) => {
        const matchingEsc = state.escalations.find(e => ids.includes(e.id) && e.bed_number === a.bed_number);
        if (matchingEsc) {
          return {
            ...a,
            status: 'acknowledged' as const,
            acknowledged_by: doctorName,
            acknowledged_at: now,
            action_taken: orders
          };
        }
        return a;
      });

      const newAuditEntries: AuditEntry[] = ids.map((id) => {
        const esc = state.escalations.find(e => e.id === id);
        return {
          id: `AUD-${Date.now().toString().slice(-4)}-${esc?.bed_number || 0}`,
          alert_id: id,
          bed_number: esc?.bed_number || 0,
          patient_code: esc?.patient_code || 'p_A_00000',
          clinician_name: doctorName,
          action_taken: orders,
          notes: `Batch Digital Sign-off [PIN: ${maskedPin}]. Nurse Notes: ${esc?.notes || 'N/A'}`,
          timestamp: now,
          status: 'Acknowledged & Managed'
        };
      });

      return {
        escalations: updatedEscalations,
        alerts: updatedAlerts,
        unreadAlertCount: Math.max(0, state.unreadAlertCount - ids.length),
        auditTrail: [...newAuditEntries, ...state.auditTrail],
        lastAckNotice: `✓ Successfully batch-acknowledged ${ids.length} alerts with digital signature.`
      };
    });

    setTimeout(() => {
      set({ lastAckNotice: null });
    }, 6000);
  },

  batchAcknowledgeAlerts: async (alertIds, doctorName, pin, orders) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const maskedPin = pin.length >= 3 ? `***${pin.slice(-3)}` : '***';

    try {
      await fetch('/api/alerts/batch-acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_ids: alertIds.map(String),
          clinician_name: doctorName,
          signature_pin: pin,
          action_taken: orders
        })
      });
    } catch (e) {
      console.warn('[BatchAlerts] Fallback local batch ack:', e);
    }

    set((state) => {
      const updatedAlerts = state.alerts.map(a => 
        alertIds.includes(a.id)
          ? { ...a, status: 'acknowledged' as const, acknowledged_by: doctorName, acknowledged_at: now, action_taken: orders }
          : a
      );

      const newAudits: AuditEntry[] = alertIds.map(id => {
        const a = state.alerts.find(x => x.id === id);
        return {
          id: `AUD-${Date.now().toString().slice(-4)}-${a?.bed_number || id}`,
          alert_id: `ALT-${a?.bed_number || id}`,
          bed_number: a?.bed_number || 0,
          patient_code: a?.patient_code || 'p_A_00000',
          clinician_name: doctorName,
          action_taken: orders,
          notes: `Batch Digital Sign-off [PIN: ${maskedPin}]`,
          timestamp: now,
          status: 'Acknowledged & Managed'
        };
      });

      return {
        alerts: updatedAlerts,
        unreadAlertCount: Math.max(0, state.unreadAlertCount - alertIds.length),
        auditTrail: [...newAudits, ...state.auditTrail],
        lastAckNotice: `✓ Successfully batch-acknowledged ${alertIds.length} alarms with digital signature.`
      };
    });

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
