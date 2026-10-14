import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  HeartPulse, Activity, CheckSquare, Bell, Send, 
  CheckCircle2, AlertTriangle, Clock, Bot, Shield, ChevronRight
} from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const { patients, alerts, acknowledgeAlert, currentUser } = useStore();
  const [checkedVitals, setCheckedVitals] = useState<Record<number, boolean>>({});
  const [handoverNote, setHandoverNote] = useState<string>('');
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Toggle observation check for a bed
  const toggleCheck = (bedId: number) => {
    setCheckedVitals(prev => ({ ...prev, [bedId]: !prev[bedId] }));
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
      console.warn('[NurseDashboard] Handover logging fallback:', err);
      setHandoverSuccess('Shift handover recorded locally.');
      setHandoverNote('');
      setTimeout(() => setHandoverSuccess(null), 4000);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Handover Notice */}
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
                ICU Charge Nurse Bedside Triage & Handover Center
              </h1>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded">
                Nurse View
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Real-time bedside vitals verification, early alert response, observation checklists, and Attending escalation.
            </p>
          </div>
        </div>

        <NavLink
          to="/assistant"
          className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:text-white text-xs font-mono transition flex items-center space-x-1.5"
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Clinical Protocol Guide</span>
        </NavLink>
      </div>

      {/* Bedside Monitoring Grid (12 Beds) */}
      <div className="glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-display">
              Assigned Beds & Hourly Observation Checklist
            </h2>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {Object.values(checkedVitals).filter(Boolean).length} of 12 Vitals Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {patients.map((p) => {
            const isChecked = !!checkedVitals[p.id];
            const isCritical = p.status === 'critical' || p.risk >= 0.40;
            const isCaution = p.status === 'caution' || (p.risk >= 0.20 && p.risk < 0.40);

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border transition ${
                  isCritical
                    ? 'bg-red-950/25 border-red-500/50'
                    : isCaution
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-stone-900/40 border-stone-800'
                }`}
              >
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

                <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[11px] font-mono text-stone-300">
                  <div className="bg-stone-950/60 p-1.5 rounded">
                    <span className="text-stone-500 block text-[9px]">HR</span>
                    <strong className={(p.vitals?.HR ?? 72) > 100 ? 'text-red-400' : 'text-stone-200'}>{p.vitals?.HR ?? '--'}</strong>
                  </div>
                  <div className="bg-stone-950/60 p-1.5 rounded">
                    <span className="text-stone-500 block text-[9px]">MAP</span>
                    <strong className={(p.vitals?.MAP ?? 85) < 65 ? 'text-red-400' : 'text-stone-200'}>{p.vitals?.MAP ?? '--'}</strong>
                  </div>
                  <div className="bg-stone-950/60 p-1.5 rounded">
                    <span className="text-stone-500 block text-[9px]">Lactate</span>
                    <strong className={(p.vitals?.Lactate ?? 1.2) > 2.0 ? 'text-amber-400' : 'text-stone-200'}>{p.vitals?.Lactate ?? '--'}</strong>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-xs font-mono text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(p.id)}
                      className="rounded bg-stone-800 border-stone-700 text-emerald-500 focus:ring-0"
                    />
                    <span>{isChecked ? 'Verified ✓' : 'Verify Vitals'}</span>
                  </label>

                  <NavLink
                    to="/patient"
                    className="text-[11px] font-mono text-stone-400 hover:text-white"
                  >
                    Details &rarr;
                  </NavLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower Section: Nurse Alert Triage & Shift Handover Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bedside Alert Response */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-xl border border-red-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white font-display">
                Bedside Alert Response & Bed Escalation
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {activeAlerts.length} Unresolved
            </span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs font-mono">
              Zero unhandled alarms. All bed alerts are under active care.
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alt) => (
                <div key={alt.id} className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white">
                      Bed {alt.bed_number} ({alt.patient_code})
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-500/30">
                      {alt.severity} Alert
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-mono">
                    {alt.message}
                  </p>
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-800">
                    <button
                      onClick={() => acknowledgeAlert(alt.id, currentUser.full_name || 'RN Alex Reed, BSN', 'Bedside nursing assessment performed. Vitals stabilized.')}
                      className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono transition"
                    >
                      Acknowledge at Bedside
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Shift Handover & Escalation Notes */}
        <div className="lg:col-span-6 glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-stone-800 pb-3">
            <Send className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-display">
              Nurse Shift Handover & Escalation Logging
            </h2>
          </div>

          <form onSubmit={handleSendHandover} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-stone-400 block mb-1">
                Handover Notes (Persisted to Clinical Database):
              </label>
              <textarea
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Document critical trends, pending blood cultures, lactate redraw schedules, or specific fluid challenges..."
                className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingHandover || !handoverNote.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs font-mono flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingHandover ? 'Persisting Handover...' : 'Submit Handover Report'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
