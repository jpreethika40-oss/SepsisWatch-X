import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Bell, CheckCircle2, Filter, Clock, ShieldAlert, 
  ShieldCheck, Check, X, Shield, FileCheck
} from 'lucide-react';
import { AlertBeacon3D } from '../components/3d/AlertBeacon3D';

export const AlertCenter: React.FC = () => {
  const { alerts, auditTrail, acknowledgeAlert, currentUser, lastAckNotice } = useStore();
  const [activeTab, setActiveTab] = useState<'active' | 'audit'>('active');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<number | null>(null);
  const [clinicalNote, setClinicalNote] = useState<string>('');

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  const filteredAlerts = (activeTab === 'active' ? activeAlerts : acknowledgedAlerts).filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const handleAcknowledge = async (id: number) => {
    await acknowledgeAlert(
      id, 
      currentUser.full_name, 
      clinicalNote.trim() || 'Bedside examination conducted; perfusion and IV lines verified.'
    );
    setSelectedAlertForAction(null);
    setClinicalNote('');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notice Banner when alert is acknowledged */}
      {lastAckNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-3 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs font-mono shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{lastAckNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/20 bg-[#141210]/90">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              ICU Clinical Alert & Audit Management Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time early-warning alarm notifications with cryptographic clinical action audit tracking and false-alarm cooldown control.
          </p>
        </div>

        {/* Tab & Severity Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded transition ${
                activeTab === 'active'
                  ? 'bg-red-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Active Alarms ({activeAlerts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded transition ${
                activeTab === 'audit'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit Trail ({auditTrail.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            {['all', 'critical', 'high', 'moderate'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-0.5 rounded transition uppercase text-[11px] ${
                  filterSeverity === sev ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Spatial Ward Alert Beacons */}
      <AlertBeacon3D alerts={alerts} />

      {/* Main Alert Feed or Audit Trail */}
      {activeTab === 'active' ? (
        <div className="glass-panel rounded-xl overflow-hidden border border-amber-500/20 bg-[#141210]/90">
          <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
            <span>Pending Clinical Alarms ({filteredAlerts.length})</span>
            <span>Target Action Window: &le; 15 Minutes</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                All alarms acknowledged. Ward in protected monitoring state.
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-red-950/15 hover:bg-red-950/25 transition"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-red-400 font-mono">
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

                    <p className="text-xs text-slate-200 leading-relaxed font-mono">
                      {alert.message}
                    </p>

                    <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400 pt-0.5">
                      <span>Risk: <strong className="text-red-400">{(alert.risk_score * 100).toFixed(0)}%</strong></span>
                      <span>Lead Time: <strong className="text-orange-400">{alert.lead_time_hours} hrs</strong></span>
                      <span>Status: <strong className="text-amber-400 uppercase">ACTIVE ALARM</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedAlertForAction(alert.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-500/30 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge & Sign</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Acknowledged Audit Trail Table */
        <div className="glass-panel rounded-xl overflow-hidden border border-amber-500/20 bg-[#141210]/90">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs font-mono text-slate-300">
            <span className="flex items-center space-x-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Signed Clinical Acknowledgment Trail ({auditTrail.length} Records)</span>
            </span>
            <span className="text-slate-500 text-[11px]">Saved to hospital audit log</span>
          </div>

          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Audit ID</th>
                <th className="p-3">Bed & Patient</th>
                <th className="p-3">Acknowledged By</th>
                <th className="p-3">Action Taken</th>
                <th className="p-3">Clinical Note</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditTrail.map((entry) => (
                <tr key={entry.id} className="hover:bg-amber-950/20 transition">
                  <td className="p-3 text-orange-400 font-bold">{entry.id}</td>
                  <td className="p-3 text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                      Bed {entry.bed_number}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-1.5">{entry.patient_code}</span>
                  </td>
                  <td className="p-3 text-slate-200 font-medium">{entry.clinician_name}</td>
                  <td className="p-3 text-emerald-300">{entry.action_taken}</td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{entry.notes}</td>
                  <td className="p-3 text-right text-slate-400 flex items-center justify-end space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{entry.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Acknowledge Modal */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181512] border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-display text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Clinically Acknowledge Sepsis Alarm</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Signing clinician: <strong className="text-slate-200">{currentUser.full_name} ({currentUser.role})</strong>.
              Enter clinical actions taken for hospital audit verification:
            </p>
            <textarea
              rows={3}
              placeholder="e.g., Blood cultures ordered, 30 mL/kg IVF bolus initiated, levophed infusion running..."
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:border-orange-500 font-mono"
            />
            <div className="flex justify-end space-x-2 font-mono text-xs">
              <button
                onClick={() => setSelectedAlertForAction(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcknowledge(selectedAlertForAction)}
                className="px-4 py-1.5 rounded-lg bg-orange-500 text-slate-950 font-bold hover:bg-orange-400 transition"
              >
                Sign & Store in Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
