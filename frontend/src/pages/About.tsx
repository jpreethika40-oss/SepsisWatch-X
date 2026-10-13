import React from 'react';
import { Info, ShieldAlert, CheckCircle2, Github, ExternalLink, Award, FileText } from 'lucide-react';

export const About: React.FC = () => {
  const platformCapabilities = [
    {
      category: '1. Data Engineering & Clinical Visualizations',
      status: 'Operational',
      details: 'PhysioNet 2019 Set A & B raw loader + synthetic generator. Forward-fill, missingness indicators, GRU-D time-decay, rolling 6h/12h features, PCA/UMAP/t-SNE projections, 11 key analytical figures with scientific insights.'
    },
    {
      category: '2. Advanced Modeling & Pipeline Optimization',
      status: 'Operational',
      details: 'LightGBM, GRU-D, Domain-Adversarial Neural Network (DANN) GRL head, stacking meta-learner, split conformal 90% coverage, Optuna Bayesian tuning, MLflow model registry.'
    },
    {
      category: '3. Benchmarking & Error Analysis',
      status: 'Operational',
      details: 'Reyna et al. 2020 CinC challenge comparison, bootstrap 95% confidence intervals, subgroup error breakdown across age/gender/unit/missingness, fairness audit.'
    },
    {
      category: '4. Deployment & Containerization',
      status: 'Operational',
      details: 'FastAPI async backend with Pydantic v2 schemas, PostgreSQL/SQLite fallback, Dockerfile multi-stage build, docker-compose, Hugging Face Space & Cloud Run deployment scripts.'
    },
    {
      category: '5. Documentation & Reproducibility',
      status: 'Operational',
      details: 'Comprehensive architectural documentation, automated telemetry seeding, 33-test regression suite, and deployment guides.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              About SepsisWatch-X: Model Card & System Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            System architectural specifications, clinical boundaries, and platform capabilities matrix.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700 hover:border-amber-500/40 transition"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
          <a
            href="https://huggingface.co/spaces"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 text-amber-300 text-xs font-mono border border-amber-500/30 hover:bg-orange-500/25 transition glow-ember"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Hugging Face Space</span>
          </a>
        </div>
      </div>

      {/* Mandatory Clinical Disclaimer & Ethical Notice */}
      <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-xl space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-red-300 font-bold uppercase font-mono">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Mandatory Clinical Use Disclaimer & Ethical Research Boundary</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          <strong>Retrospective Research System:</strong> SepsisWatch-X is developed strictly as an academic machine learning research system using retrospective de-identified PhysioNet/CinC 2019 clinical data. It is <strong>NOT</strong> cleared by the FDA or certified for live patient diagnosis, treatment guidance, or clinical decision-making. No claim of superiority over established clinical surveillance solutions (such as TREWS, COMPOSER, or Epic Sepsis Model) is made.
        </p>
        <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
          Domain adaptation is demonstrated between Hospital A (Emory) and Hospital B (BIDMC). Since only two healthcare system domains exist in the public benchmark, domain adversarial gains are evaluated honestly and modestly.
        </p>
      </div>

      {/* Model Card */}
      <div className="glass-panel p-5 rounded-xl space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2">
          Model Card: SepsisWatch-X Core Stack
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-orange-400 font-bold">1. LightGBM Branch</span>
            <p className="text-slate-300">Hand-crafted rolling 6h/12h mean, min, max, slope, shock index, delta vitals.</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-orange-400 font-bold">2. GRU-D Branch</span>
            <p className="text-slate-300">Recurrent architecture with masks, time-since-last-measurement, and exponential decay vectors.</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-orange-400 font-bold">3. DANN Adaptation</span>
            <p className="text-slate-300">Gradient Reversal Layer (GRL) head erasing hospital site signatures in latent space.</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-orange-400 font-bold">4. Split Conformal</span>
            <p className="text-slate-300">Finite-sample mathematically guaranteed 90% coverage prediction sets (Sepsis / No Sepsis / Uncertain).</p>
          </div>
        </div>
      </div>

      {/* System Capabilities Mapping Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs font-mono text-slate-400">
          <span>System Architecture & Capabilities Verification</span>
          <span>Verification Matrix</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {platformCapabilities.map((r, i) => (
            <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-100 font-sans">{r.category}</span>
                <p className="text-slate-400 font-mono leading-relaxed">{r.details}</p>
              </div>
              <div className="flex-shrink-0">
                <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{r.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
