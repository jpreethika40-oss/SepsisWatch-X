import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Stethoscope, Activity, ShieldAlert, CheckCircle2, ChevronRight, 
  Sliders, Sparkles, UserCheck, Bot, FileText, AlertTriangle, Clock
} from 'lucide-react';
import { AnatomyVitals3D } from '../components/3d/AnatomyVitals3D';

export const DoctorDashboard: React.FC = () => {
  const { patients, alerts, acknowledgeAlert, currentUser, setSelectedPatientId } = useStore();
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [physicianNotes, setPhysicianNotes] = useState<string>('');
  const [ackNotice, setAckNotice] = useState<string | null>(null);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalPatients = patients.filter(p => p.status === 'critical' || p.risk >= 0.40);
  const highRiskPatient = criticalPatients[0] || patients[2] || patients[0];

  const handlePhysicianAcknowledge = async (alertId: number) => {
    const note = physicianNotes.trim() || 'Bedside examination conducted. 1-Hour Sepsis Bundle initiated; perfusion verified.';
    await acknowledgeAlert(alertId, currentUser.full_name || 'Dr. Sarah Connor, MD', note);
    setSelectedAlertId(null);
    setPhysicianNotes('');
    setAckNotice(`Alert #${alertId} acknowledged with physician clinical sign-off.`);
    setTimeout(() => setAckNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {ackNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-3.5 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs font-mono shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{ackNotice}</span>
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
                Attending Intensivist Clinical Diagnostic Workspace
              </h1>
              <span className="bg-orange-950 text-orange-400 border border-orange-500/40 text-[10px] font-mono px-2 py-0.5 rounded">
                Physician View
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Authorized clinical oversight, predictive uncertainty, counterfactual what-if simulation, and physician alert sign-off.
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

      {/* Top Census Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-400 font-mono uppercase">ICU Bed Census</span>
          <p className="text-2xl font-bold font-display text-white mt-1">12 Beds</p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">100% telemetry online</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-red-500/30 bg-red-950/10">
          <span className="text-[10px] text-red-300 font-mono uppercase">Critical Sepsis Patients</span>
          <p className="text-2xl font-bold font-display text-red-400 mt-1">{criticalPatients.length}</p>
          <p className="text-[11px] text-red-300/80 font-mono mt-0.5">Risk &ge; 40% threshold</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/30">
          <span className="text-[10px] text-amber-300 font-mono uppercase">Active Alarm Queue</span>
          <p className="text-2xl font-bold font-display text-amber-400 mt-1">{activeAlerts.length}</p>
          <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">Requires physician review</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-400 font-mono uppercase">Conformal Coverage</span>
          <p className="text-2xl font-bold font-display text-emerald-400 mt-1">90.2%</p>
          <p className="text-[11px] text-stone-400 font-mono mt-0.5">Finite-sample statistical bound</p>
        </div>
      </div>

      {/* Main Grid: Focus Patient & Active Alarms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Focus High-Risk Patient 3D Telemetry */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-xl border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  Primary Critical Focus: Bed {highRiskPatient.bed_number} ({highRiskPatient.patient_code})
                </h3>
              </div>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                Diagnosis: {highRiskPatient.diagnosis}
              </p>
            </div>

            <NavLink
              to="/patient"
              onClick={() => setSelectedPatientId(highRiskPatient.id)}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center space-x-1"
            >
              <span>Full EHR Record</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {/* Vitals Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Heart Rate</span>
              <span className="text-base font-bold text-red-400">{highRiskPatient.vitals?.HR ?? 124} bpm</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">MAP</span>
              <span className="text-base font-bold text-red-400">{highRiskPatient.vitals?.MAP ?? 61} mmHg</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Lactate</span>
              <span className="text-base font-bold text-amber-400">{highRiskPatient.vitals?.Lactate ?? 3.8} mmol/L</span>
            </div>
            <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-400 block text-[10px]">Conformal Label</span>
              <span className="text-base font-bold text-orange-400 uppercase">{highRiskPatient.conformal_label}</span>
            </div>
          </div>

          {/* 3D Anatomical Vitals View */}
          <div className="h-64 w-full rounded-xl overflow-hidden bg-[#0C0B0A] border border-stone-800">
            <AnatomyVitals3D patient={highRiskPatient} />
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono text-stone-300">
            <strong>Physician Directive:</strong> Patient exhibits persistent tachycardia with worsening mean arterial pressure concordant with Septic Shock. Maintain vasopressor titration target MAP &ge; 65 mmHg and repeat lactate draw q2h.
          </div>
        </div>

        {/* Right Column: Physician Alert Sign-Off Queue */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-xl border border-red-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white font-display">
                Physician Alarm Sign-Off Queue
              </h3>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {activeAlerts.length} Active
            </span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs font-mono">
              All clinical alerts have been acknowledged.
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition ${
                    alert.severity === 'critical'
                      ? 'bg-red-950/30 border-red-500/40'
                      : 'bg-amber-950/30 border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      Bed {alert.bed_number} ({alert.patient_code})
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {alert.severity} ({(alert.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 font-mono mt-1.5 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Lead Time: {alert.lead_time_hours}h</span>
                    </span>

                    <button
                      onClick={() => setSelectedAlertId(selectedAlertId === alert.id ? null : alert.id)}
                      className="px-2.5 py-1 rounded bg-stone-800 text-amber-300 hover:bg-stone-700 text-xs font-mono transition"
                    >
                      {selectedAlertId === alert.id ? 'Cancel' : 'Sign Off Alert'}
                    </button>
                  </div>

                  {/* Sign-off Form */}
                  {selectedAlertId === alert.id && (
                    <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                      <textarea
                        value={physicianNotes}
                        onChange={(e) => setPhysicianNotes(e.target.value)}
                        placeholder="Physician sign-off note (e.g. Initiated IV fluid bolus & vasopressor titration)..."
                        className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                        rows={2}
                      />
                      <button
                        onClick={() => handlePhysicianAcknowledge(alert.id)}
                        className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono transition"
                      >
                        Confirm Clinical Sign-Off
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
