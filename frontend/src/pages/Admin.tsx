import React from 'react';
import { useStore } from '../store/useStore';
import { FileText, Users, Server, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export const Admin: React.FC = () => {
  const { auditTrail, wsStatus, currentUser } = useStore();

  const usersList = [
    { name: 'Dr. Sarah Connor, MD', email: 'dr.connor@icu.org', role: 'Physician / Fellow', status: 'Active (Current User)' },
    { name: 'Nurse Alex Reed, RN', email: 'alex.reed@icu.org', role: 'Lead Triage Nurse', status: 'Active' },
    { name: 'Dr. Marcus Wright, CMO', email: 'marcus.wright@icu.org', role: 'Chief Medical Officer', status: 'Active' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/20 bg-[#141210]/90">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Clinical Governance, Security & Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable append-only record of all early-warning alerts, clinical acknowledgments, and platform operations.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>ALL AUDIT SUITES ACTIVE</span>
        </div>
      </div>

      {/* Users & Infrastructure Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Roles */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl space-y-3 border border-amber-500/20 bg-[#141210]/90">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2 flex items-center space-x-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span>Authorized Clinical Accounts & Active Roles</span>
          </h3>

          <div className="divide-y divide-slate-800/80">
            {usersList.map((u, i) => (
              <div key={i} className="py-2.5 flex justify-between items-center text-xs font-mono">
                <div>
                  <p className="text-slate-100 font-bold">{u.name}</p>
                  <p className="text-[11px] text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.name.includes(currentUser.full_name) 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {u.role}
                  </span>
                  <span className="text-emerald-400 text-[11px]">{u.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Server & Database Health */}
        <div className="glass-panel p-4 rounded-xl space-y-3 border border-amber-500/20 bg-[#141210]/90">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2 flex items-center space-x-2">
            <Server className="w-4 h-4 text-amber-400" />
            <span>Platform Telemetry Health</span>
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">FastAPI Engine:</span>
              <span className="text-emerald-400 font-bold">Operational (v1.0.0)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">PhysioNet Cohort:</span>
              <span className="text-amber-300 font-bold">Set A & B Loaded (240 Pts)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">ML Model Pipelines:</span>
              <span className="text-emerald-400 font-bold">LGBM + GRU-D + DANN</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">WebSocket Ward Stream:</span>
              <span className={`font-bold ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                {wsStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Acknowledgment Audit Log Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-amber-500/20 bg-[#141210]/90">
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs font-mono text-slate-300">
          <span className="flex items-center space-x-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Clinical Sepsis Alert Acknowledgment Log ({auditTrail.length} Recorded Events)</span>
          </span>
          <span className="text-slate-500 text-[11px]">Auto-saved to audit repository</span>
        </div>

        <table className="w-full text-xs font-mono text-left">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Audit ID</th>
              <th className="p-3">Bed & Alert</th>
              <th className="p-3">Clinician Sign-off</th>
              <th className="p-3">Action Taken</th>
              <th className="p-3">Clinical Rationale</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {auditTrail.map((entry) => (
              <tr key={entry.id} className="hover:bg-amber-950/20 transition">
                <td className="p-3 text-orange-400 font-bold">{entry.id}</td>
                <td className="p-3 text-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                      Bed {entry.bed_number}
                    </span>
                    <span className="text-slate-400 text-[10px]">{entry.patient_code}</span>
                  </div>
                </td>
                <td className="p-3 text-slate-200 font-medium">{entry.clinician_name}</td>
                <td className="p-3 text-emerald-300">{entry.action_taken}</td>
                <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">{entry.notes}</td>
                <td className="p-3 text-right text-slate-400 flex items-center justify-end space-x-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{entry.timestamp}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
