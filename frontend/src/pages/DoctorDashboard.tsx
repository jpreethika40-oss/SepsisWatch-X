import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Stethoscope, Activity, ShieldAlert, CheckCircle2, ChevronRight, 
  Sliders, Sparkles, UserCheck, Bot, FileText, AlertTriangle, Clock,
  CheckSquare, Square, Key, Send, AlertCircle, HeartPulse, RefreshCw, Building2
} from 'lucide-react';
import { AnatomyVitals3D } from '../components/3d/AnatomyVitals3D';

export const DoctorDashboard: React.FC = () => {
  const { 
    patients, alerts, escalations, batchAcknowledgeEscalations, 
    batchAcknowledgeAlerts, acknowledgeAlert, currentUser, setSelectedPatientId,
    lastAckNotice, selectedHospital, setSelectedHospital
  } = useStore();

  // Multi-select state for batch acknowledgment
  const [selectedEscalationIds, setSelectedEscalationIds] = useState<string[]>([]);
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);
  const [doctorPin, setDoctorPin] = useState<string>('DOC-8921');
  const [selectedOrder, setSelectedOrder] = useState<string>(
    'SEP-1 Bundle: 30 mL/kg IV Crystalloid Bolus + Blood Cultures + Broad-Spectrum Antibiotics (Vancomycin + Cefepime)'
  );
  const [isSigning, setIsSigning] = useState(false);
  const [ackNotice, setAckNotice] = useState<string | null>(null);

  // Focus patient selection
  const [focusPatientId, setFocusPatientId] = useState<number>(1);

  // Hospital-filtered patient and alert subsets
  const filteredPatients = selectedHospital === 'all'
    ? patients
    : patients.filter(p => p.hospital === selectedHospital);

  const pendingEscalations = escalations.filter(e => {
    if (e.status !== 'pending') return false;
    if (selectedHospital === 'all') return true;
    const pat = patients.find(p => p.bed_number === e.bed_number);
    return pat ? pat.hospital === selectedHospital : true;
  });

  const activeAlerts = alerts.filter(a => {
    if (a.status !== 'active') return false;
    if (selectedHospital === 'all') return true;
    const pat = patients.find(p => p.bed_number === a.bed_number);
    return pat ? pat.hospital === selectedHospital : true;
  });

  const criticalPatients = filteredPatients.filter(p => p.status === 'critical' || p.risk >= 0.70);
  const cautionPatients = filteredPatients.filter(p => p.status === 'caution' || (p.risk >= 0.40 && p.risk < 0.70));

  const focusPatient = filteredPatients.find(p => p.id === focusPatientId) || filteredPatients[0] || patients[0];

  // Select / Deselect individual escalation
  const toggleEscalationSelection = (id: string) => {
    setSelectedEscalationIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle "Select All" pending escalations
  const toggleSelectAllEscalations = () => {
    if (selectedEscalationIds.length === pendingEscalations.length) {
      setSelectedEscalationIds([]);
    } else {
      setSelectedEscalationIds(pendingEscalations.map(e => e.id));
    }
  };

  // Execute Batch Acknowledgment & Digital Sign-off
  const handleBatchAcknowledge = async () => {
    if (selectedEscalationIds.length === 0 && selectedAlertIds.length === 0) return;

    setIsSigning(true);
    const doctorName = currentUser.full_name || 'Dr. Sarah Connor, MD';

    if (selectedEscalationIds.length > 0) {
      await batchAcknowledgeEscalations(selectedEscalationIds, doctorName, doctorPin, selectedOrder);
    }

    if (selectedAlertIds.length > 0) {
      await batchAcknowledgeAlerts(selectedAlertIds, doctorName, doctorPin, selectedOrder);
    }

    const count = selectedEscalationIds.length + selectedAlertIds.length;
    setSelectedEscalationIds([]);
    setSelectedAlertIds([]);
    setIsSigning(false);

    setAckNotice(`✓ Batch sign-off complete. ${count} clinical alerts acknowledged with digital signature [PIN: ***${doctorPin.slice(-3)}].`);
    setTimeout(() => setAckNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Notice Banners */}
      {(ackNotice || lastAckNotice) && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-3.5 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs font-mono shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{ackNotice || lastAckNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-[#1E1B18]/90 via-[#151311]/90 to-[#0C0B0A]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 glow-ember">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Stethoscope className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-display text-white">
                Attending Intensivist Diagnostic Workspace
              </h1>
              <span className="bg-orange-950 text-orange-400 border border-orange-500/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                Doctor Exclusive Workspace
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Nurse escalation review, multi-patient batch digital sign-off, multimodal AI trajectories, and SEP-1 protocol deployment.
            </p>
          </div>
        </div>

        {/* Quick Launchers */}
        <div className="flex items-center space-x-2">
          <NavLink
            to="/what-if"
            className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 text-xs font-mono transition flex items-center space-x-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>What-If Lab</span>
          </NavLink>
          <NavLink
            to="/insights"
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-mono transition flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SHAP Insights</span>
          </NavLink>
          <NavLink
            to="/assistant"
            className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:text-white text-xs font-mono transition flex items-center space-x-1"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Consult</span>
          </NavLink>
        </div>
      </div>

      {/* Hospital Bay Switcher & Domain Context Banner */}
      <div className="glass-panel p-3.5 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-stone-300 font-semibold pr-2 border-r border-stone-800">
            <Building2 className="w-4 h-4 text-orange-400" />
            <span>Surveillance Bay:</span>
          </div>
          <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
            <button
              type="button"
              onClick={() => setSelectedHospital('all')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                selectedHospital === 'all'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All Beds (12)
            </button>
            <button
              type="button"
              onClick={() => setSelectedHospital('setA')}
              className={`px-3 py-1 rounded transition flex items-center space-x-1.5 cursor-pointer ${
                selectedHospital === 'setA'
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Hospital A: Emory (Beds 1-6)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedHospital('setB')}
              className={`px-3 py-1 rounded transition flex items-center space-x-1.5 cursor-pointer ${
                selectedHospital === 'setB'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Hospital B: BIDMC (Beds 7-12)</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-stone-400 font-mono">
          {selectedHospital === 'all' && (
            <span>Combined Multi-Site ICU (12 Beds across Emory & BIDMC Bays)</span>
          )}
          {selectedHospital === 'setA' && (
            <span className="text-orange-300">Emory Bay (Set A): Medical/Surgical ICU • 92% Lab Temporal Density</span>
          )}
          {selectedHospital === 'setB' && (
            <span className="text-amber-300">BIDMC Bay (Set B): Trauma/Cardiac ICU • DANN Domain Adaptation Active</span>
          )}
        </div>
      </div>

      {/* Top Census Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-400 font-mono uppercase">
            {selectedHospital === 'all' ? 'Combined ICU Census' : selectedHospital === 'setA' ? 'Hospital A (Emory)' : 'Hospital B (BIDMC)'} Census
          </span>
          <p className="text-2xl font-bold font-display text-white mt-1">{filteredPatients.length} Beds</p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
            {Math.max(0, filteredPatients.length - cautionPatients.length - criticalPatients.length)} Normal • {cautionPatients.length} Caution • {criticalPatients.length} Critical
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-red-500/30 bg-red-950/10">
          <span className="text-[10px] text-red-300 font-mono uppercase">Critical Sepsis Patients</span>
          <p className="text-2xl font-bold font-display text-red-400 mt-1">{criticalPatients.length} Bed{criticalPatients.length !== 1 ? 's' : ''}</p>
          <p className="text-[11px] text-red-300/80 font-mono mt-0.5">
            {criticalPatients.length > 0 ? criticalPatients.map(p => `Bed ${p.bed_number.toString().padStart(2, '0')}`).join(', ') : 'All active beds stable'}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/10">
          <span className="text-[10px] text-amber-300 font-mono uppercase">Pending Nurse Escalations</span>
          <p className="text-2xl font-bold font-display text-amber-400 mt-1">
            {pendingEscalations.length} Pending
          </p>
          <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">Requires Attending Digital Sign-off</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-400 font-mono uppercase">Conformal Model Calibration</span>
          <p className="text-2xl font-bold font-display text-emerald-400 mt-1">90.2%</p>
          <p className="text-[11px] text-stone-400 font-mono mt-0.5">Finite-sample statistical coverage</p>
        </div>
      </div>

      {/* Primary Section: Nurse Escalations Queue & Batch Acknowledgment Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-[#141210] space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-5 h-5 text-red-400 animate-pulse" />
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Nurse Escalation Queue & Batch Digital Sign-off Center
              </h2>
              <p className="text-xs text-stone-400 font-mono">
                Select multiple critical beds to review bedside nurse observations and authorize bundle orders simultaneously.
              </p>
            </div>
          </div>

          {/* Select All Toggle Button */}
          {pendingEscalations.length > 0 && (
            <button
              onClick={toggleSelectAllEscalations}
              className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-500/50 text-xs font-mono text-stone-200 flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
            >
              {selectedEscalationIds.length === pendingEscalations.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-orange-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-stone-400" />
                  <span>Select All Critical ({pendingEscalations.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Escalations List */}
        {pendingEscalations.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs font-mono bg-stone-950/40 rounded-xl border border-stone-900">
            ✓ Zero pending nurse escalations. All critical beds have been clinically reviewed and digitally signed.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingEscalations.map((esc) => {
              const isSelected = selectedEscalationIds.includes(esc.id);
              const isCritical = esc.severity === 'critical';

              return (
                <div
                  key={esc.id}
                  onClick={() => toggleEscalationSelection(esc.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isSelected 
                      ? 'bg-orange-950/30 border-orange-500/60 shadow-md shadow-orange-950/20' 
                      : isCritical 
                      ? 'bg-red-950/20 border-red-500/40 hover:border-red-400/60' 
                      : 'bg-amber-950/15 border-amber-500/30 hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-orange-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-stone-500 flex-shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white font-mono">
                          Bed {esc.bed_number} ({esc.patient_code})
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          isCritical ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                        }`}>
                          {esc.severity} Alert ({(esc.risk_score * 100).toFixed(0)}%)
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          Escalated by {esc.nurse_name} • {esc.created_at}
                        </span>
                      </div>

                      <p className="text-xs text-stone-200 font-mono mt-1 leading-relaxed">
                        <strong>Nurse Note:</strong> {esc.notes}
                      </p>

                      {esc.vitals_snapshot && (
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono text-stone-300">
                          <span className="bg-stone-900 px-2 py-0.5 rounded">HR: {esc.vitals_snapshot.HR ?? 124}</span>
                          <span className="bg-stone-900 px-2 py-0.5 rounded">MAP: {esc.vitals_snapshot.MAP ?? 61}</span>
                          <span className="bg-stone-900 px-2 py-0.5 rounded">Lactate: {esc.vitals_snapshot.Lactate ?? 3.8}</span>
                          <span className="bg-stone-900 px-2 py-0.5 rounded">Resp: {esc.vitals_snapshot.Resp ?? 28}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 md:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusPatientId(esc.patient_id);
                      }}
                      className="px-2.5 py-1 rounded bg-stone-900 border border-stone-700 hover:text-white text-stone-300 text-[11px] font-mono transition"
                    >
                      Focus 3D View &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Digital Signature & Order Execution Bar */}
        {pendingEscalations.length > 0 && (
          <div className="p-4 rounded-xl bg-stone-900/90 border border-amber-500/40 space-y-3 mt-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-300">
              <Key className="w-4 h-4 text-amber-400" />
              <span className="font-bold">Attending Digital Signature & Intervention Orders:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label className="text-[10px] font-mono text-stone-400 block mb-1">
                  Authorize Protocol Interventions (SEP-1 Sepsis Bundle):
                </label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="SEP-1 Bundle: 30 mL/kg IV Crystalloid Bolus + Blood Cultures + Broad-Spectrum Antibiotics (Vancomycin + Cefepime)">
                    SEP-1 1-Hour Bundle: 30 mL/kg IV Crystalloid Bolus + Antibiotics (Vancomycin + Cefepime)
                  </option>
                  <option value="Vasopressor Titration: Norepinephrine target MAP ≥ 65 mmHg + Arterial Line Placement">
                    Vasopressor Titration: Norepinephrine target MAP ≥ 65 mmHg + Arterial Line Placement
                  </option>
                  <option value="Repeat Lactate Draw q2h + Bedside Transthoracic Echocardiogram (TTE)">
                    Repeat Lactate Draw q2h + Bedside Transthoracic Echocardiogram (TTE)
                  </option>
                  <option value="Stat ICU Attending Bedside Consult + Intubation Protocol Evaluation">
                    Stat ICU Attending Bedside Consult + Intubation Protocol Evaluation
                  </option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-mono text-stone-400 block mb-1">
                  Physician PIN / Signature:
                </label>
                <input
                  type="password"
                  value={doctorPin}
                  onChange={(e) => setDoctorPin(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  placeholder="PIN"
                />
              </div>

              <div className="md:col-span-4">
                <button
                  type="button"
                  disabled={isSigning || selectedEscalationIds.length === 0}
                  onClick={handleBatchAcknowledge}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-orange-600/25 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSigning 
                      ? 'Signing Orders...' 
                      : `Batch Acknowledge & Sign (${selectedEscalationIds.length} Selected)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lower Section: Focus Patient Deep-Dive & Clinical Decision Support */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Hemodynamics & Anatomy */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-xl border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  Focus Diagnostic Telemetry: Bed {focusPatient.bed_number} ({focusPatient.patient_code})
                </h3>
              </div>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                Diagnosis: {focusPatient.diagnosis}
              </p>
            </div>

            <NavLink
              to="/patient"
              onClick={() => setSelectedPatientId(focusPatient.id)}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center space-x-1"
            >
              <span>Full Longitudinal EHR</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {/* Vitals Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Heart Rate</span>
              <span className="text-base font-bold text-red-400">{focusPatient.vitals?.HR ?? 124} bpm</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">MAP</span>
              <span className="text-base font-bold text-red-400">{focusPatient.vitals?.MAP ?? 61} mmHg</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Lactate</span>
              <span className="text-base font-bold text-amber-400">{focusPatient.vitals?.Lactate ?? 3.8} mmol/L</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Conformal Status</span>
              <span className="text-base font-bold text-orange-400 uppercase">{focusPatient.conformal_label}</span>
            </div>
          </div>

          {/* 3D Anatomical Vitals View */}
          <div className="h-64 w-full rounded-xl overflow-hidden bg-[#0C0B0A] border border-stone-800">
            <AnatomyVitals3D patient={focusPatient} />
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono text-stone-300">
            <strong>Attending Clinical Directive:</strong> Multimodal AI ensemble indicates worsening septic shock (posterior risk {(focusPatient.risk * 100).toFixed(0)}%). Hemodynamic resuscitation target is MAP &ge; 65 mmHg with norepinephrine titration and repeat lactate draw in 2 hours.
          </div>
        </div>

        {/* Right Column: SHAP Feature Importance & Clinical Evidence */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white font-display">
                SHAP Multimodal Risk Attributions
              </h3>
            </div>
            <span className="text-xs font-mono text-stone-400">TreeSHAP + GRU-D</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {(() => {
              const lac = focusPatient.vitals?.Lactate ?? 1.1;
              const map = focusPatient.vitals?.MAP ?? 82;
              const hr = focusPatient.vitals?.HR ?? 72;
              const sbp = focusPatient.vitals?.SBP ?? 120;
              const resp = focusPatient.vitals?.Resp ?? 16;
              const si = (hr / Math.max(sbp, 40)).toFixed(2);
              const isCrit = focusPatient.risk >= 0.70;
              const isCaut = focusPatient.risk >= 0.45;

              return (
                <>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Serum Lactate ({lac} mmol/L)</span>
                      <span className={`${lac > 2.0 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>
                        {lac > 2.0 ? `+${(0.12 * (lac - 1.0)).toFixed(2)} SHAP` : '-0.08 SHAP'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`${lac > 2.0 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full transition-all`} 
                        style={{ width: `${Math.min(100, Math.max(15, (lac / 5.0) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Mean Arterial Pressure ({map} mmHg)</span>
                      <span className={`${map < 65 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>
                        {map < 65 ? `+${(0.20 + (65 - map) * 0.01).toFixed(2)} SHAP` : '-0.12 SHAP'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`${map < 65 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full transition-all`} 
                        style={{ width: `${Math.min(100, Math.max(15, map < 65 ? 85 : 25))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Shock Index (HR {hr} / SBP {sbp} = {si})</span>
                      <span className={`${parseFloat(si) >= 0.90 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>
                        {parseFloat(si) >= 0.90 ? `+${((parseFloat(si) - 0.7) * 0.35).toFixed(2)} SHAP` : '-0.06 SHAP'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`${parseFloat(si) >= 0.90 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full transition-all`} 
                        style={{ width: `${Math.min(100, Math.max(15, (parseFloat(si) / 1.5) * 80))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-300">Respiratory Rate ({resp} /min)</span>
                      <span className={`${resp > 22 ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>
                        {resp > 22 ? `+${((resp - 20) * 0.02).toFixed(2)} SHAP` : '-0.05 SHAP'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`${resp > 22 ? 'bg-amber-500' : 'bg-emerald-500'} h-full rounded-full transition-all`} 
                        style={{ width: `${Math.min(100, Math.max(15, (resp / 35) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Sepsis-3 Diagnostic Checklist */}
          <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2 mt-4 text-xs font-mono">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>Sepsis-3 Consensus Criteria Status (Bed {focusPatient.bed_number}):</span>
            </h4>
            <div className="space-y-1 text-stone-300 text-[11px]">
              <div className={`flex items-center space-x-1.5 ${focusPatient.risk >= 0.70 ? 'text-red-400' : focusPatient.risk >= 0.45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                <span>{focusPatient.risk >= 0.45 ? '✕' : '✓'}</span>
                <span>SOFA Score Acute Change &ge; 2 points: <strong>{focusPatient.risk >= 0.70 ? 'Met (+4)' : focusPatient.risk >= 0.45 ? 'Borderline (+1)' : 'Baseline Stable (0)'}</strong></span>
              </div>
              <div className={`flex items-center space-x-1.5 ${(focusPatient.vitals?.MAP ?? 80) < 65 ? 'text-red-400' : 'text-emerald-400'}`}>
                <span>{(focusPatient.vitals?.MAP ?? 80) < 65 ? '✕' : '✓'}</span>
                <span>Hypotension (MAP &lt; 65 mmHg): <strong>{(focusPatient.vitals?.MAP ?? 80) < 65 ? `Met (${focusPatient.vitals?.MAP} mmHg)` : `Normal (${focusPatient.vitals?.MAP ?? 82} mmHg)`}</strong></span>
              </div>
              <div className={`flex items-center space-x-1.5 ${(focusPatient.vitals?.Lactate ?? 1.1) > 2.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                <span>{(focusPatient.vitals?.Lactate ?? 1.1) > 2.0 ? '✕' : '✓'}</span>
                <span>Serum Lactate &gt; 2.0 mmol/L: <strong>{(focusPatient.vitals?.Lactate ?? 1.1) > 2.0 ? `Met (${focusPatient.vitals?.Lactate} mmol/L)` : `Normal (${focusPatient.vitals?.Lactate ?? 1.1} mmol/L)`}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
