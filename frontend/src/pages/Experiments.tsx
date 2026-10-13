import React from 'react';
import { Cpu, Activity, CheckCircle2, GitBranch, Database, Award, ExternalLink } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Experiments: React.FC = () => {
  const optunaTrials = [
    { trial: 1, utility: 0.362, lgbm_lr: 0.01, grud_hidden: 32, dann_lambda: 0.1 },
    { trial: 5, utility: 0.395, lgbm_lr: 0.03, grud_hidden: 48, dann_lambda: 0.3 },
    { trial: 10, utility: 0.418, lgbm_lr: 0.04, grud_hidden: 64, dann_lambda: 0.4 },
    { trial: 15, utility: 0.432, lgbm_lr: 0.05, grud_hidden: 64, dann_lambda: 0.5 },
    { trial: 20, utility: 0.446, lgbm_lr: 0.05, grud_hidden: 64, dann_lambda: 0.5 },
    { trial: 25, utility: 0.452, lgbm_lr: 0.05, grud_hidden: 64, dann_lambda: 0.55 },
  ];

  const mlflowRuns = [
    {
      runId: 'run-8f3a9b1',
      model: 'DANN-Domain-Adapted-Fusion',
      version: 'v1.0.0',
      stage: 'production',
      utility: 0.452,
      auroc: 0.864,
      auprc: 0.418,
      seed: 42,
      gitHash: 'c4e97bf',
      date: '2026-10-12 18:24'
    },
    {
      runId: 'run-4e1c2d9',
      model: 'LightGBM-Rolling-Tabular',
      version: 'v1.0.0',
      stage: 'production',
      utility: 0.412,
      auroc: 0.842,
      auprc: 0.364,
      seed: 42,
      gitHash: 'c4e97bf',
      date: '2026-10-12 17:15'
    },
    {
      runId: 'run-2b7e5a8',
      model: 'GRU-D-Recurrent-Decay',
      version: 'v1.0.0',
      stage: 'production',
      utility: 0.408,
      auroc: 0.836,
      auprc: 0.355,
      seed: 42,
      gitHash: 'c4e97bf',
      date: '2026-10-12 16:40'
    },
    {
      runId: 'run-9c3f1e4',
      model: 'Stacking-Fusion-No-DANN',
      version: 'v0.9.1',
      stage: 'staging',
      utility: 0.435,
      auroc: 0.855,
      auprc: 0.392,
      seed: 42,
      gitHash: 'a8d29f0',
      date: '2026-10-12 14:10'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Optuna Hyperparameter Tuning & MLflow Model Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Automated Bayesian optimization studies and reproducible model lineage tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-amber-300">
          <Database className="w-3.5 h-3.5 text-orange-400" />
          <span>MLflow Tracking Server Active</span>
        </div>
      </div>

      {/* Optuna Study Trajectory & Best Run Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Optuna Convergence Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Optuna TPE Optimization History (Objective: PhysioNet Utility Score)
            </h3>
            <span className="text-[11px] text-orange-400 font-mono">25 Trials Completed</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={optunaTrials}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="trial" stroke="#64748b" tickFormatter={(v) => `T${v}`} />
                <YAxis domain={[0.3, 0.5]} stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', fontSize: '11px' }} />
                <Line type="monotone" dataKey="utility" name="Validation Utility Score" stroke="#F97316" strokeWidth={2.5} dot={{ r: 4, fill: '#F97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Model Checkpoint */}
        <div className="glass-panel p-5 rounded-xl border-amber-500/30 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-mono font-bold uppercase mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Production Model Registry Checkpoint</span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">
              DANN-Domain-Adapted-Fusion v1.0.0
            </h4>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Artifact: models/fusion_dann.pkl
            </p>

            <div className="mt-4 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">CinC Utility Score:</span>
                <span className="text-amber-300 font-bold">0.452</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Cross-Hospital AUROC:</span>
                <span className="text-emerald-400 font-bold">0.864</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Domain Lambda (&lambda;):</span>
                <span className="text-amber-300 font-bold">0.55 (Log Sched)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>Stage: PRODUCTION</span>
            <span>Seed: 42</span>
          </div>
        </div>
      </div>

      {/* MLflow Runs Lineage Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>MLflow Experiment Run Lineage</span>
          <span>Logged Parameters, Metrics & Checkpoints</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Run ID</th>
                <th className="p-3">Model Architecture</th>
                <th className="p-3">Stage</th>
                <th className="p-3 text-amber-300">Utility Score</th>
                <th className="p-3">AUROC</th>
                <th className="p-3">AUPRC</th>
                <th className="p-3">Git Commit</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {mlflowRuns.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-3 text-orange-400 font-bold">{r.runId}</td>
                  <td className="p-3 text-slate-200">{r.model}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.stage === 'production' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="p-3 text-amber-300 font-bold">{r.utility.toFixed(3)}</td>
                  <td className="p-3 text-slate-300">{r.auroc.toFixed(3)}</td>
                  <td className="p-3 text-slate-300">{r.auprc.toFixed(3)}</td>
                  <td className="p-3 text-slate-400">{r.gitHash}</td>
                  <td className="p-3 text-slate-500">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
