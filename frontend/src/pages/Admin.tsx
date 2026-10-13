import React, { useState } from 'react';
import { FileText, Shield, Users, Server, CheckCircle2, Activity, Terminal } from 'lucide-react';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'docs'>('audit');

  const auditLogs = [
    { id: 1, action: 'POLICY_UPDATE', user: 'admin@sepsiswatch.org', entity: 'PolicyConfig v1.0.0', ip: '127.0.0.1', time: '10 min ago' },
    { id: 2, action: 'ALERT_ACKNOWLEDGE', user: 'clinician@sepsiswatch.org', entity: 'Alert #1 (Bed 3)', ip: '192.168.1.45', time: '22 min ago' },
    { id: 3, action: 'SIMULATION_SPEED_CHANGE', user: 'admin@sepsiswatch.org', entity: 'Multiplier: 2x', ip: '127.0.0.1', time: '45 min ago' },
    { id: 4, action: 'USER_LOGIN_SUCCESS', user: 'clinician@sepsiswatch.org', entity: 'JWT Session', ip: '192.168.1.45', time: '1 hour ago' },
    { id: 5, action: 'MODEL_REGISTRY_PROMOTION', user: 'admin@sepsiswatch.org', entity: 'DANN Fusion -> PRODUCTION', ip: '127.0.0.1', time: '3 hours ago' },
  ];

  const usersList = [
    { name: 'Dr. Sarah Connor', email: 'admin@sepsiswatch.org', role: 'admin', status: 'Active' },
    { name: 'Dr. Marcus Wright', email: 'clinician@sepsiswatch.org', role: 'clinician', status: 'Active' },
    { name: 'Nurse Alex Reed', email: 'viewer@sepsiswatch.org', role: 'viewer', status: 'Active' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              System Administration, Security & API Workbench
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographic audit logging of all clinical decisions, role-based access control, and platform infrastructure health.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Tabs Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700/80 text-xs font-mono">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition ${
                activeTab === 'audit' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit & Health</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition ${
                activeTab === 'docs' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Interactive API Explorer</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center space-x-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>

      {activeTab === 'docs' ? (
        <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-white h-[760px]">
          <iframe
            src="/docs"
            title="FastAPI Interactive Swagger Docs"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      ) : (
        <>

      {/* Users & Infrastructure Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Roles */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2 flex items-center space-x-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span>Authorized Clinical Accounts & Role-Based Permissions</span>
          </h3>

          <div className="divide-y divide-slate-800/80">
            {usersList.map((u, i) => (
              <div key={i} className="py-2.5 flex justify-between items-center text-xs font-mono">
                <div>
                  <p className="text-slate-100 font-bold">{u.name}</p>
                  <p className="text-[11px] text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === 'admin' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
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
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2 flex items-center space-x-2">
            <Server className="w-4 h-4 text-[#B8B0A4]" />
            <span>Platform Health Telemetry</span>
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">FastAPI Engine:</span>
              <span className="text-emerald-400 font-bold">Healthy (v0.110.0)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-emerald-400 font-bold">SQLAlchemy 2.0 (Async)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Broker:</span>
              <span className="text-orange-400 font-bold">In-Memory / Redis Fallback</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">WebSocket Connections:</span>
              <span className="text-slate-200">1 Active Client</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Electronic Medical Record (EMR) Decision Audit Log</span>
          <span>Immutable Append-Only Record</span>
        </div>

        <table className="w-full text-xs font-mono text-left">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Action Type</th>
              <th className="p-3">Clinical User</th>
              <th className="p-3">Entity Impacted</th>
              <th className="p-3">IP Address</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30">
                <td className="p-3 text-amber-300 font-bold">{log.action}</td>
                <td className="p-3 text-slate-200">{log.user}</td>
                <td className="p-3 text-slate-300">{log.entity}</td>
                <td className="p-3 text-slate-400">{log.ip}</td>
                <td className="p-3 text-right text-slate-500">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};
