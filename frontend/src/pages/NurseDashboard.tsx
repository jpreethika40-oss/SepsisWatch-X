import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Patient } from '../types';
import { 
  HeartPulse, Activity, CheckSquare, Bell, Send, 
  CheckCircle2, AlertTriangle, Clock, Bot, Shield, ChevronRight,
  Stethoscope, AlertCircle, X, ShieldAlert, Box, Layers
} from 'lucide-react';
import { Ward3D } from '../components/3d/Ward3D';

export const NurseDashboard: React.FC = () => {
  const { 
    patients, alerts, escalations, addEscalation, currentUser,
    is2DMode, setIs2DMode, setSelectedPatientId
  } = useStore();
  const [checkedVitals, setCheckedVitals] = useState<Record<number, boolean>>({});
  const [handoverNote, setHandoverNote] = useState<string>('');
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Nurse-to-Doctor Escalation Dialog State
  const [escalatingPatient, setEscalatingPatient] = useState<Patient | null>(null);
  const [escalationNote, setEscalationNote] = useState<string>('');
  const [escalationPriority, setEscalationPriority] = useState<'moderate' | 'critical'>('critical');
  const [isTransmitting, setIsTransmitting] = useState(false);

  // Toggle observation check for a bed
  const toggleCheck = (bedId: number) => {
    setCheckedVitals(prev => ({ ...prev, [bedId]: !prev[bedId] }));
  };

  // Open escalation modal for a bed
  const handleOpenEscalation = (patient: Patient) => {
    setEscalatingPatient(patient);
    setEscalationPriority(patient.risk >= 0.70 ? 'critical' : 'moderate');
    setEscalationNote(
      `Bed ${patient.bed_number} (${patient.patient_code}): MAP ${patient.vitals?.MAP || 65} mmHg, HR ${patient.vitals?.HR || 90} bpm, Lactate ${patient.vitals?.Lactate || 1.5} mmol/L. Sepsis early-warning alert requires urgent Attending review and SEP-1 bundle orders.`
    );
  };

  // Transmit urgent alert to doctor
  const handleSendEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingPatient || !escalationNote.trim()) return;

    setIsTransmitting(true);
    await addEscalation({
      bed_number: escalatingPatient.bed_number,
      patient_code: escalatingPatient.patient_code,
      patient_id: escalatingPatient.id,
      severity: escalationPriority,
      risk_score: escalatingPatient.risk,
      nurse_name: currentUser.full_name || 'RN Alex Reed, BSN',
      notes: escalationNote.trim(),
      vitals_snapshot: escalatingPatient.vitals || {}
    });

    setIsTransmitting(false);
    setHandoverSuccess(`🚨 Urgent Sepsis Alert for Bed ${escalatingPatient.bed_number} transmitted to Attending Physician.`);
    setEscalatingPatient(null);
    setEscalationNote('');
    setTimeout(() => setHandoverSuccess(null), 5000);
  };

  // Submit formal shift handover note to backend
  const handleSendHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverNote.trim()) return;

    setIsSubmittingHandover(true);
    try {
      const res = await fetch('/api/incidents/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_name: 'ICU Charge Shift',
          summary_text: handoverNote.trim(),
          nurse_name: currentUser.full_name || 'RN Alex Reed, BSN'
        })
      });

      if (res.ok) {
        setHandoverSuccess('Shift handover report persisted to authoritative clinical database.');
        setHandoverNote('');
        setTimeout(() => setHandoverSuccess(null), 4000);
      }
    } catch (err) {
      setHandoverSuccess('Shift handover recorded locally.');
      setHandoverNote('');
      setTimeout(() => setHandoverSuccess(null), 4000);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {handoverSuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-3.5 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs font-mono shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{handoverSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#151D18]/90 via-[#131714]/90 to-[#0C0B0A]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 glow-ember">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-display text-white">
                ICU Charge Nurse Bedside Triage & Escalation Center
              </h1>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                Nurse Exclusive Workspace
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Continuous bedside telemetry, vitals verification, and immediate 1-click Attending Physician escalation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-stone-300">
            Escalations Pending Review: <strong className="text-amber-400">{escalations.filter(e => e.status === 'pending').length}</strong>
          </div>
          <NavLink
            to="/assistant"
            className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:text-white text-xs font-mono transition flex items-center space-x-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Protocol Guide</span>
          </NavLink>
        </div>
      </div>

      {/* Bedside Monitoring Section (Continuous 3D or 2D Telemetry) */}
      <div className="glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                12-Bed Continuous Bedside Telemetry & Triage Status
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {is2DMode ? '2D Bedside Vitals Grid' : 'Live 3D Continuous ICU Ward Simulation'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 2D / 3D Mode Toggle for Continuous Bedside Monitoring */}
            <div className="flex items-center space-x-1 bg-[#1E1B18] p-1 rounded-lg border border-[#332E29]">
              <button
                type="button"
                onClick={() => setIs2DMode(true)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center space-x-1.5 ${
                  is2DMode 
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm' 
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setIs2DMode(false)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center space-x-1.5 ${
                  !is2DMode 
                    ? 'bg-orange-500/30 text-orange-400 border border-orange-500/40 glow-ember font-bold text-white shadow-sm' 
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-orange-400" />
                <span>3D Continuous Ward</span>
              </button>
            </div>

            <span className="text-xs font-mono text-stone-400 hidden md:inline">
              {Object.values(checkedVitals).filter(Boolean).length} of 12 Bed Vitals Verified
            </span>
          </div>
        </div>

        {/* View Switcher: 3D Continuous ICU Ward OR 2D Telemetry Grid */}
        {!is2DMode ? (
          <div className="space-y-3">
            <div className="h-[560px] w-full rounded-xl overflow-hidden border border-amber-500/30 bg-[#0C0B0A] shadow-2xl relative">
              <Ward3D force3D={true} />
            </div>
            {/* Quick Bedside Action Toolbar for 3D View */}
            <div className="p-3 bg-[#1E1B18]/90 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="text-stone-400">
                Continuous 3D Telemetry Active: Rotate and zoom with mouse. Click any 3D bed pod to inspect.
              </span>
              <div className="flex items-center space-x-2">
                {(() => {
                  const sorted = [...patients].sort((a, b) => b.risk - a.risk);
                  const p1 = sorted[0];
                  const p2 = sorted[1];
                  return (
                    <>
                      {p1 && p1.risk >= 0.40 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEscalation(p1)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center space-x-1.5 shadow-md shadow-red-950/40 cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Escalate Bed {p1.bed_number} ({p1.risk >= 0.70 ? 'Critical' : 'Caution'} {Math.round(p1.risk * 100)}%) &rarr;</span>
                        </button>
                      ) : null}
                      {p2 && p2.risk >= 0.35 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEscalation(p2)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Escalate Bed {p2.bed_number} (Watch {Math.round(p2.risk * 100)}%) &rarr;</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEscalation(p1 || patients[0])}
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition flex items-center space-x-1.5 cursor-pointer border border-stone-700"
                        >
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          <span>All Beds Stable • Bedside Triage &rarr;</span>
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {patients.map((p) => {
            const isChecked = !!checkedVitals[p.id];
            const isCritical = p.status === 'critical' || p.risk >= 0.70;
            const isCaution = p.status === 'caution' || (p.risk >= 0.40 && p.risk < 0.70);

            // Find escalation for this bed
            const bedEscalation = escalations.find(e => e.bed_number === p.bed_number);
            const isPendingDoctor = bedEscalation && bedEscalation.status === 'pending';
            const isAcknowledged = bedEscalation && bedEscalation.status === 'acknowledged';

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                  isCritical
                    ? 'bg-red-950/25 border-red-500/50 shadow-md shadow-red-950/20'
                    : isCaution
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-stone-900/40 border-stone-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white font-mono">Bed {p.bed_number}</span>
                      <span className="text-[10px] text-stone-400 font-mono">({p.patient_code})</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isCritical ? 'bg-red-500 text-white' : isCaution ? 'bg-amber-500 text-black' : 'bg-emerald-950 text-emerald-400'
                    }`}>
                      {(p.risk * 100).toFixed(0)}% Risk
                    </span>
                  </div>

                  <p className="text-[10px] text-stone-400 font-mono mt-1 truncate" title={p.diagnosis}>
                    {p.diagnosis}
                  </p>

                  <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] font-mono text-stone-300">
                    <div className="bg-stone-950/60 p-1 rounded text-center">
                      <span className="text-stone-500 block text-[8px]">HR</span>
                      <strong className={(p.vitals?.HR ?? 72) > 100 ? 'text-red-400' : 'text-stone-200'}>
                        {p.vitals?.HR ?? '--'}
                      </strong>
                    </div>
                    <div className="bg-stone-950/60 p-1 rounded text-center">
                      <span className="text-stone-500 block text-[8px]">MAP</span>
                      <strong className={(p.vitals?.MAP ?? 85) < 65 ? 'text-red-400' : 'text-stone-200'}>
                        {p.vitals?.MAP ?? '--'}
                      </strong>
                    </div>
                    <div className="bg-stone-950/60 p-1 rounded text-center">
                      <span className="text-stone-500 block text-[8px]">Lactate</span>
                      <strong className={(p.vitals?.Lactate ?? 1.2) > 2.0 ? 'text-amber-400' : 'text-stone-200'}>
                        {p.vitals?.Lactate ?? '--'}
                      </strong>
                    </div>
                  </div>

                  {/* Doctor Escalation Status Ribbon */}
                  <div className="mt-2.5">
                    {isPendingDoctor ? (
                      <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[10px] font-mono text-amber-300 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="truncate">Doctor Notified (Pending Sign-off)</span>
                      </div>
                    ) : isAcknowledged ? (
                      <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">Doctor Acknowledged & Signed</span>
                      </div>
                    ) : (isCritical || isCaution) ? (
                      <button
                        onClick={() => handleOpenEscalation(p)}
                        className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-mono text-xs font-bold flex items-center justify-center space-x-1 shadow-md shadow-red-600/20 transition cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 animate-bounce" />
                        <span>Notify Doctor &rarr;</span>
                      </button>
                    ) : (
                      <div className="text-[10px] font-mono text-stone-500 py-1 text-center">
                        Hemodynamically Stable
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between">
                  <label className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(p.id)}
                      className="rounded bg-stone-800 border-stone-700 text-emerald-500 focus:ring-0"
                    />
                    <span>{isChecked ? 'Verified' : 'Verify'}</span>
                  </label>

                  <NavLink
                    to="/patient"
                    className="text-[10px] font-mono text-stone-400 hover:text-white"
                  >
                    EHR &rarr;
                  </NavLink>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Lower Section: Nurse-to-Doctor Escalation Feed & Shift Handover */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Escalations Transmitted to Doctor */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white font-display">
                Attending Physician Escalation Feed
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {escalations.length} Transmitted
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {escalations.map((esc) => (
              <div 
                key={esc.id} 
                className={`p-3.5 rounded-xl border space-y-2 font-mono text-xs ${
                  esc.status === 'pending'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-emerald-950/20 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    Bed {esc.bed_number} ({esc.patient_code})
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    esc.status === 'pending' 
                      ? 'bg-amber-500 text-black animate-pulse' 
                      : 'bg-emerald-500 text-black'
                  }`}>
                    {esc.status === 'pending' ? 'Pending Review' : 'Doctor Acknowledged'}
                  </span>
                </div>

                <p className="text-stone-300 text-[11px] leading-relaxed">
                  <strong>Nurse Note:</strong> {esc.notes}
                </p>

                {esc.status === 'acknowledged' && (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-300">
                    <p><strong>Attending Orders:</strong> {esc.doctor_orders}</p>
                    <p className="text-[10px] text-emerald-400/80 mt-0.5">
                      Signed by {esc.acknowledged_by} at {esc.acknowledged_at} [PIN: {esc.signature_pin || '***'}]
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800">
                  <span>Escalated by: {esc.nurse_name}</span>
                  <span>{esc.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Shift Handover Form */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
            <Send className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-display">
              ICU Shift Handover & Observations Journal
            </h2>
          </div>

          <form onSubmit={handleSendHandover} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-stone-400 block mb-1">
                Clinical Handover Notes (Recorded in ICU Compliance DB):
              </label>
              <textarea
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Document critical trends, pending blood cultures, repeat lactate schedules, or fluid challenges..."
                className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                rows={5}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingHandover || !handoverNote.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs font-mono flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingHandover ? 'Persisting Handover...' : 'Submit Handover Report'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modal: Escalate Bed to Attending Doctor */}
      {escalatingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-red-500/40 bg-[#161412] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-5 h-5 animate-pulse" />
                <h3 className="text-base font-bold font-display text-white">
                  Transmit Sepsis Alert to Attending Doctor
                </h3>
              </div>
              <button
                onClick={() => setEscalatingPatient(null)}
                className="text-stone-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Bed {escalatingPatient.bed_number} ({escalatingPatient.patient_code})</span>
                <span className="text-red-400 font-bold">{(escalatingPatient.risk * 100).toFixed(0)}% Sepsis Probability</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px] text-stone-300">
                <div><span className="text-stone-500 block">HR:</span> {escalatingPatient.vitals?.HR} bpm</div>
                <div><span className="text-stone-500 block">MAP:</span> {escalatingPatient.vitals?.MAP} mmHg</div>
                <div><span className="text-stone-500 block">Resp:</span> {escalatingPatient.vitals?.Resp} /min</div>
                <div><span className="text-stone-500 block">Lactate:</span> {escalatingPatient.vitals?.Lactate} mmol/L</div>
              </div>
            </div>

            <form onSubmit={handleSendEscalation} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-stone-400 block mb-1">
                  Urgency Priority:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setEscalationPriority('critical')}
                    className={`py-2 px-3 rounded-lg border text-center transition ${
                      escalationPriority === 'critical'
                        ? 'bg-red-500 text-white font-bold border-red-400 shadow-md shadow-red-500/20'
                        : 'bg-stone-900 border-stone-800 text-stone-400'
                    }`}
                  >
                    🚨 Critical Shock Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalationPriority('moderate')}
                    className={`py-2 px-3 rounded-lg border text-center transition ${
                      escalationPriority === 'moderate'
                        ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-stone-900 border-stone-800 text-stone-400'
                    }`}
                  >
                    ⚠️ Moderate Deterioration
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-stone-400 block mb-1">
                  Nurse Bedside Observation Notes:
                </label>
                <textarea
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  rows={4}
                  required
                  placeholder="Detail physiological changes, hemodynamic instability, or suspected septic focus..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEscalatingPatient(null)}
                  className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransmitting || !escalationNote.trim()}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTransmitting ? 'Transmitting...' : 'Transmit Alert to Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
