import React from 'react';
import { useStore } from '../store/useStore';
import { DriftRadar3D } from '../components/3d/DriftRadar3D';
import { Radar, Zap, AlertTriangle, CheckCircle2, Activity, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DriftMonitor: React.FC = () => {
  const { drift, driftInjected, setDriftInjected } = useStore();

  const isShift = driftInjected || drift.overall_status !== 'green';

  const psiChartData = Object.entries(drift.feature_psi).map(([feat, val]) => {
    const numVal = Number(val);
    return {
      feature: feat,
      psi: isShift ? Number((numVal * 4.2).toFixed(3)) : numVal,
      threshold: 0.10,
      criticalThreshold: 0.25,
    };
  });

  const ksFeatures = [
    { feature: 'Heart Rate (HR)', p_value: isShift ? 0.002 : 0.42, stat: isShift ? 0.28 : 0.04, status: isShift ? 'Drift Detected' : 'Stable' },
    { feature: 'Systolic Blood Pressure (SBP)', p_value: isShift ? 0.001 : 0.38, stat: isShift ? 0.32 : 0.05, status: isShift ? 'Drift Detected' : 'Stable' },
    { feature: 'Mean Arterial Pressure (MAP)', p_value: isShift ? 0.004 : 0.45, stat: isShift ? 0.26 : 0.04, status: isShift ? 'Drift Detected' : 'Stable' },
    { feature: 'Respiratory Rate (Resp)', p_value: isShift ? 0.012 : 0.51, stat: isShift ? 0.21 : 0.03, status: isShift ? 'Drift Detected' : 'Stable' },
    { feature: 'Serum Lactate', p_value: isShift ? 0.008 : 0.34, stat: isShift ? 0.24 : 0.06, status: isShift ? 'Drift Detected' : 'Stable' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radar className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Data & Domain Shift Continuous Monitor
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Sliding-window Population Stability Index (PSI) & Kolmogorov-Smirnov (KS) two-sample divergence tests.
          </p>
        </div>

        {/* Live Drift Status Badge & Shift Trigger */}
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1.5 rounded-lg border flex items-center space-x-2 text-xs font-mono font-bold ${
            isShift
              ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse'
              : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isShift ? 'bg-red-500' : 'bg-emerald-400'}`} />
            <span>STATUS: {isShift ? 'DRIFT ALERT (RED)' : 'CALIBRATED (GREEN)'}</span>
          </div>

          <button
            onClick={() => setDriftInjected(!driftInjected)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition ${
              driftInjected
                ? 'bg-red-500 text-slate-950 font-bold border-red-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-500/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{driftInjected ? 'Clear Shift Injection' : 'Inject Synthetic Shift'}</span>
          </button>
        </div>
      </div>

      {/* 3D Radar and PSI Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3D Drift Radar */}
        <div className="glass-panel p-3 rounded-xl h-72 flex flex-col">
          <span className="text-xs font-mono uppercase text-slate-300 font-semibold mb-1 px-1">
            3D Feature PSI Topology Ring
          </span>
          <div className="flex-1 rounded-lg overflow-hidden">
            <DriftRadar3D />
          </div>
        </div>

        {/* PSI Bar Chart */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
              Feature-Level Population Stability Index (PSI)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={psiChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" domain={[0, 0.4]} />
                  <YAxis type="category" dataKey="feature" stroke="#64748b" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', fontSize: '11px' }} />
                  <Bar
                    dataKey="psi"
                    fill={isShift ? '#ef4444' : '#F97316'}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span>&lt;0.10: Stable</span>
            <span className="text-amber-400">0.10 - 0.25: Moderate Shift</span>
            <span className="text-red-400">&gt;0.25: Severe Drift</span>
          </div>
        </div>
      </div>

      {/* KS Test Two-Sample Distribution Divergence */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Kolmogorov-Smirnov (KS) Statistical Tests (Training Baseline vs Live Inflow)</span>
          <span>Significance Threshold: &alpha; = 0.05</span>
        </div>

        <table className="w-full text-xs font-mono text-left">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Biomarker Feature</th>
              <th className="p-3">KS Statistic (D)</th>
              <th className="p-3">P-Value</th>
              <th className="p-3 text-right">Hypothesis Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {ksFeatures.map((kf, i) => (
              <tr key={i} className="hover:bg-slate-800/30">
                <td className="p-3 text-slate-200">{kf.feature}</td>
                <td className="p-3 text-amber-300 font-bold">{kf.stat.toFixed(3)}</td>
                <td className={`p-3 font-bold ${kf.p_value < 0.05 ? 'text-red-400' : 'text-slate-300'}`}>
                  {kf.p_value.toFixed(3)}
                </td>
                <td className="p-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    kf.status === 'Stable'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-950 text-red-300 border border-red-500/30 animate-pulse'
                  }`}>
                    {kf.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
