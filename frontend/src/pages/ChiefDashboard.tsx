import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Building2, Activity, ShieldAlert, Radar, GitCompare, 
  FileText, UploadCloud, Bot, Shield, CheckCircle2, TrendingUp, Users
} from 'lucide-react';
import { DecisionManifold3D } from '../components/3d/DecisionManifold3D';

export const ChiefDashboard: React.FC = () => {
  const { patients, alerts, policy, drift } = useStore();

  const totalPatients = patients.length;
  const criticalCount = patients.filter(p => p.status === 'critical' || p.risk >= 0.40).length;
  const cautionCount = patients.filter(p => p.status === 'caution' || (p.risk >= 0.20 && p.risk < 0.40)).length;
  const avgRisk = patients.reduce((acc, p) => acc + p.risk, 0) / Math.max(1, totalPatients);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#1E1B18]/90 via-[#161412]/90 to-[#0C0B0A]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 glow-ember">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Building2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-display text-white">
                Hospital Chief Executive & Clinical Governance Dashboard
              </h1>
              <span className="bg-amber-950 text-amber-400 border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 rounded">
                Chief View
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Ward census, alarm fatigue governance, cross-hospital calibration drift, and clinical compliance.
            </p>
          </div>
        </div>

        <NavLink
          to="/assistant"
          className="px-3.5 py-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:text-white text-xs font-mono transition flex items-center space-x-1.5"
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>Executive AI Query</span>
        </NavLink>
      </div>

      {/* High-Level Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono uppercase">
            <span>Ward Sepsis Prevalence</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-display text-white mt-1">
            {((criticalCount / Math.max(1, totalPatients)) * 100).toFixed(0)}%
          </p>
          <p className="text-[11px] text-amber-400 font-mono mt-0.5">{criticalCount} Critical of {totalPatients} Beds</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono uppercase">
            <span>Mean Ward Sepsis Risk</span>
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-display text-orange-400 mt-1">
            {(avgRisk * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-stone-400 font-mono mt-0.5">Calibrated probability baseline</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono uppercase">
            <span>Alarm Budget Compliance</span>
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-display text-emerald-400 mt-1">
            {policy.alarms_per_patient_day} / pt-day
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Below 1.0 false alarm ceiling</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono uppercase">
            <span>Population Drift Status</span>
            <Radar className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-display uppercase text-emerald-400 mt-1">
            {drift.overall_status}
          </p>
          <p className="text-[11px] text-stone-400 font-mono mt-0.5">Max PSI: {drift.max_psi} (Stable)</p>
        </div>
      </div>

      {/* Main Governance Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Spatial Decision Manifold (3D) */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-xl border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                Ward Sepsis Risk Surface & Operating Point (3D Manifold)
              </h2>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                Evaluates decision boundary across vital sign trajectories against the alarm persistence filter.
              </p>
            </div>
            <NavLink
              to="/policy"
              className="text-xs font-mono text-amber-400 hover:text-amber-300"
            >
              Policy Simulator &rarr;
            </NavLink>
          </div>

          <div className="h-64 w-full rounded-xl overflow-hidden bg-[#0C0B0A] border border-stone-800">
            <DecisionManifold3D sbp={110} lactate={2.4} risk={avgRisk} threshold={policy.risk_threshold} />
          </div>
        </div>

        {/* Right Column: Executive Governance Actions & Links */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="border-b border-stone-800 pb-3">
            <h2 className="text-sm font-bold text-white font-display">
              Administrative Navigation & Modules
            </h2>
            <p className="text-[11px] text-stone-400 font-mono mt-0.5">
              Authoritative management controls and system inspection:
            </p>
          </div>

          <div className="space-y-2.5">
            <NavLink
              to="/upload"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <UploadCloud className="w-4 h-4 text-orange-400 group-hover:scale-110 transition" />
                <div>
                  <span className="text-xs font-bold text-white font-mono block">Dataset Ingestion Library</span>
                  <span className="text-[10px] text-stone-400 font-mono">Upload, inspect and validate clinical data (.psv, .csv)</span>
                </div>
              </div>
              <span className="text-stone-500 text-xs font-mono">&rarr;</span>
            </NavLink>

            <NavLink
              to="/scoreboard"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <GitCompare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                <div>
                  <span className="text-xs font-bold text-white font-mono block">Model Arena & Benchmark Matrix</span>
                  <span className="text-[10px] text-stone-400 font-mono">AUROC, AUPRC, utility score comparisons</span>
                </div>
              </div>
              <span className="text-stone-500 text-xs font-mono">&rarr;</span>
            </NavLink>

            <NavLink
              to="/drift"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <Radar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                <div>
                  <span className="text-xs font-bold text-white font-mono block">Sensor & Demographic Drift Radar</span>
                  <span className="text-[10px] text-stone-400 font-mono">PSI & KS test population distribution shifts</span>
                </div>
              </div>
              <span className="text-stone-500 text-xs font-mono">&rarr;</span>
            </NavLink>

            <NavLink
              to="/admin"
              className="flex items-center justify-between p-3 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition group"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
                <div>
                  <span className="text-xs font-bold text-white font-mono block">Clinical Audit Trail & Compliance</span>
                  <span className="text-[10px] text-stone-400 font-mono">Review sign-offs, action logs, and timestamps</span>
                </div>
              </div>
              <span className="text-stone-500 text-xs font-mono">&rarr;</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
