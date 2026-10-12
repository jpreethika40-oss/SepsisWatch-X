import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Alert } from '../types';
import { 
  Bell, CheckCircle2, XCircle, Filter, Clock, ShieldAlert, 
  AlertTriangle, MessageSquare, Check, X 
} from 'lucide-react';

export const AlertCenter: React.FC = () => {
  const { alerts, acknowledgeAlert } = useStore();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<number | null>(null);
  const [clinicalNote, setClinicalNote] = useState<string>('');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const handleAcknowledge = (id: number) => {
    acknowledgeAlert(id);
    setSelectedAlertForAction(null);
    setClinicalNote('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              ICU Clinical Alert Management Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time early-warning alarm notifications with clinical action audit tracking and false-alarm cooldown control.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          {['all', 'critical', 'high', 'moderate'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded transition uppercase ${
                filterSeverity === sev ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Active Patient Alarms ({filteredAlerts.length})</span>
          <span>Lead-Time Budget: 4-6 Hours Prior to Onset</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No alerts matching the selected filter.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                  alert.status === 'active' ? 'bg-red-950/10 hover:bg-red-950/20' : 'bg-slate-900/40 opacity-70'
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-100 font-mono">
                      BED {alert.bed_number}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({alert.patient_code})
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      alert.severity === 'critical' ? 'bg-red-950 border border-red-500/40 text-red-300' : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {alert.created_at}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400 pt-0.5">
                    <span>Risk: <strong className="text-red-400">{(alert.risk_score * 100).toFixed(0)}%</strong></span>
                    <span>Est. Lead Time: <strong className="text-cyan-400">{alert.lead_time_hours} hrs</strong></span>
                    <span>Status: <strong className={alert.status === 'active' ? 'text-amber-400 uppercase' : 'text-emerald-400 uppercase'}>{alert.status}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {alert.status === 'active' ? (
                    <>
                      <button
                        onClick={() => setSelectedAlertForAction(alert.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono hover:bg-emerald-500/25 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono hover:bg-slate-700 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400 font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acknowledged</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Acknowledge Modal */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-xl p-5 space-y-4 glass-panel">
            <h3 className="text-sm font-bold font-display text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Acknowledge Clinical Sepsis Alarm</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide clinical interventions or actions taken to log in the hospital electronic audit trail.
            </p>
            <textarea
              rows={3}
              placeholder="e.g., Ordered blood cultures, started 30mL/kg crystalloid fluid bolus, alert sent to attending..."
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-500/50"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedAlertForAction(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcknowledge(selectedAlertForAction)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs font-mono"
              >
                Confirm & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
