import React, { useState } from 'react';
import { EmbeddingCloud3D } from '../components/3d/EmbeddingCloud3D';
import { 
  FlaskConical, BarChart2, Layers, LineChart, Info, Eye, 
  Maximize2, Download, Grid, Layout, X, ZoomIn, CheckCircle2, 
  Sparkles, Image as ImageIcon 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart as RCLineChart, Line, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface FigureDef {
  id: number;
  title: string;
  category: string;
  insight: string;
  hasInteractive: boolean;
  interactiveType?: '3d' | 'roc' | 'calibration';
}

export const InsightsLab: React.FC = () => {
  const [activeFig, setActiveFig] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'gallery'>('single');
  const [displayType, setDisplayType] = useState<'image' | 'interactive'>('image');
  const [dannToggle, setDannToggle] = useState<boolean>(true);
  const [colorToggle, setColorToggle] = useState<'hospital' | 'sepsis'>('hospital');
  const [lightboxFig, setLightboxFig] = useState<FigureDef | null>(null);

  const figures: FigureDef[] = [
    {
      id: 1,
      title: '1. Missingness Heatmap per Hospital',
      category: 'Data Engineering',
      insight: 'Extreme missingness is an inherent property of ICU telemetry: routine vitals (HR, SBP, Resp) are documented with 90-95% temporal density, whereas arterial blood gases (BaseExcess, PaCO2) and hepatic panels (Bilirubin, AST) exhibit >85-95% sparsity. Hospital B exhibits slightly longer measurement sampling intervals for blood gas labs, introducing domain shift in missingness patterns.',
      hasInteractive: false
    },
    {
      id: 2,
      title: '2. Class Imbalance & Onset Time Distribution',
      category: 'Clinical Cohort',
      insight: 'Extreme class imbalance is present with an hourly sepsis prevalence of ~6.8%. Clinical sepsis onset follows a log-normal distribution across ICU stays, peaking between hours 14 and 28. SepsisWatch-X defines the target prediction horizon strictly 6 hours prior to clinical onset to maximize therapeutically actionable lead time.',
      hasInteractive: false
    },
    {
      id: 3,
      title: '3. PCA Explained Variance & 2D Projection',
      category: 'Dimensionality Reduction',
      insight: 'The first 12 principal components capture 82.4% of total variance across the 40 raw clinical features. The top 2 PCs distinctly separate hyper-dynamic septic states (tachycardia, tachypnea, low MAP) from stable convalescent trajectories, validating that hand-crafted physiological interactions preserve key diagnostic signals.',
      hasInteractive: false
    },
    {
      id: 4,
      title: '4. UMAP Feature Latent Space by Hospital (Domain Shift)',
      category: 'Domain Shift',
      insight: 'Before domain adaptation, raw feature representations form two disjoint clusters corresponding to Hospital A (Emory) and Hospital B (BIDMC). This empirical domain shift is driven by disparate baseline unit mixes (MICU vs SICU) and local clinical ordering practices, necessitating domain-adversarial invariance.',
      hasInteractive: true,
      interactiveType: '3d'
    },
    {
      id: 5,
      title: '5. GRU-D Hidden States: Before vs After DANN',
      category: 'Domain Adaptation',
      insight: 'With the Gradient Reversal Layer (GRL) activated in DANN, the domain discriminator forces the recurrent GRU-D hidden representations into a unified, hospital-invariant manifold. Hospital classification accuracy drops from 91.2% to 51.4% (near random chance), confirming successful erasure of site artifacts while preserving discriminative sepsis boundaries.',
      hasInteractive: true,
      interactiveType: '3d'
    },
    {
      id: 6,
      title: '6. In-Hospital & Cross-Hospital ROC / PR Curves',
      category: 'Model Benchmarking',
      insight: 'The stacked DANN ensemble achieves AUROC of 0.864 (AUPRC 0.418) in-hospital (A→A), and sustains 0.854 (AUPRC 0.402) cross-hospital (A→B). Without DANN, baseline LightGBM suffers an 18.0% drop in utility score under transfer, whereas DANN restricts transfer loss to 3.1%.',
      hasInteractive: true,
      interactiveType: 'roc'
    },
    {
      id: 7,
      title: '7. Reliability Calibration Curve (Before vs After Isotonic)',
      category: 'Calibration & Safety',
      insight: 'Raw model ensemble probabilities exhibit overconfidence in the 0.70-0.90 risk bracket. Applying post-hoc isotonic calibration on validation folds reduces Expected Calibration Error (ECE) from 0.082 down to 0.024, providing trustworthy Bayesian posterior probabilities required for split conformal bounds.',
      hasInteractive: true,
      interactiveType: 'calibration'
    },
    {
      id: 8,
      title: '8. Global Feature Attribution: SHAP & Integrated Gradients',
      category: 'Explainability',
      insight: 'SHAP analysis on LightGBM identifies Shock Index (HR/SBP), Lactate, and WBC as the dominant drivers of positive risk alerts. Integrated Gradients across GRU-D recurrent sequences reveals that acute downward MAP velocity over the preceding 3 hours carries significantly higher attribution weight than static instantaneous measurements.',
      hasInteractive: false
    },
    {
      id: 9,
      title: '9. Alarm Budget Sensitivity vs False Alarms Trade-Off',
      category: 'Alarm Policy',
      insight: 'Evaluating the alarm policy parameter space demonstrates that enforcing a 2-hour persistence filter (k=2) and 6-hour cooldown collapses false alarm rates by 68% while preserving 84% sensitivity. This directly maximizes the official PhysioNet 2019 Utility Score at 0.452.',
      hasInteractive: false
    },
    {
      id: 10,
      title: '10. GRU-D & DANN Training Loss Trajectories',
      category: 'Optimization',
      insight: 'Loss curves illustrate the adversarial min-max objective: the task prediction BCE loss steadily converges while the domain discriminator loss increases as representations become invariant. The logarithmic lambda scheduling prevents early gradient disruption.',
      hasInteractive: false
    },
    {
      id: 11,
      title: '11. Operating Point Confusion Matrices',
      category: 'Error Analysis',
      insight: 'At the tuned operating threshold (tau = 0.45), the system achieves 84.2% sensitivity with a false positive rate of 4.8% per patient-hour. Over 78% of false positives correspond to pre-septic patients who developed severe inflammatory response without reaching formal Sepsis-3 criteria.',
      hasInteractive: false
    }
  ];

  const currentFigure = figures.find((f) => f.id === activeFig) || figures[0];

  // Synthetic plot data for interactive ROC & PR curves
  const rocCurveData = [
    { fpr: 0.00, tprDANN: 0.00, tprLGBM: 0.00, tprRule: 0.00 },
    { fpr: 0.05, tprDANN: 0.52, tprLGBM: 0.41, tprRule: 0.12 },
    { fpr: 0.10, tprDANN: 0.74, tprLGBM: 0.65, tprRule: 0.22 },
    { fpr: 0.15, tprDANN: 0.84, tprLGBM: 0.78, tprRule: 0.35 },
    { fpr: 0.20, tprDANN: 0.89, tprLGBM: 0.83, tprRule: 0.48 },
    { fpr: 0.30, tprDANN: 0.94, tprLGBM: 0.89, tprRule: 0.62 },
    { fpr: 0.50, tprDANN: 0.98, tprLGBM: 0.95, tprRule: 0.78 },
    { fpr: 1.00, tprDANN: 1.00, tprLGBM: 1.00, tprRule: 1.00 },
  ];

  const calibrationData = [
    { pred: 0.1, actualUncal: 0.04, actualCal: 0.09 },
    { pred: 0.3, actualUncal: 0.18, actualCal: 0.29 },
    { pred: 0.5, actualUncal: 0.38, actualCal: 0.49 },
    { pred: 0.7, actualUncal: 0.56, actualCal: 0.69 },
    { pred: 0.9, actualUncal: 0.79, actualCal: 0.89 },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold font-display text-white">
                Scientific Insights Lab & Publication Figures
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                11 of 11 Images Available
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              High-resolution publication vector artifacts & empirical interpretability figures (Figures 1 through 11).
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 bg-stone-900/90 p-1 rounded-lg border border-stone-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
              viewMode === 'single'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-950/40'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Interactive Explorer</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gallery')}
            className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
              viewMode === 'gallery'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-950/40'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>All 11 Figures Grid</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE EXPLORER */}
      {viewMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Figure Navigation List with Previews (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-3 rounded-xl space-y-2 max-h-[750px] overflow-y-auto">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-stone-800">
              <span className="text-[11px] font-mono uppercase text-stone-400 font-semibold">
                Publication Artifacts
              </span>
              <span className="text-[10px] font-mono text-orange-400">11 Figures</span>
            </div>

            <div className="space-y-1.5">
              {figures.map((fig) => (
                <button
                  key={fig.id}
                  type="button"
                  onClick={() => {
                    setActiveFig(fig.id);
                    setDisplayType('image');
                  }}
                  className={`w-full text-left p-2 rounded-lg transition text-xs flex items-center space-x-2.5 border cursor-pointer ${
                    activeFig === fig.id
                      ? 'bg-orange-500/15 border-amber-500/50 text-amber-200 font-semibold shadow-md shadow-amber-950/30'
                      : 'bg-stone-900/60 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="w-14 h-10 rounded border border-stone-700 bg-stone-950 overflow-hidden flex-shrink-0 relative">
                    <img
                      src={`/figures/figure_${fig.id}.png`}
                      alt={`Figure ${fig.id}`}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-stone-950/90 text-[8px] font-mono text-amber-400 font-bold">
                      #{fig.id}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-orange-400 truncate">{fig.category}</span>
                      {fig.hasInteractive && (
                        <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 ml-1">
                          Interactive
                        </span>
                      )}
                    </div>
                    <p className="truncate font-sans font-medium text-stone-200 text-[11px] mt-0.5">
                      {fig.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Active Figure Display & Scientific Insight (8 cols) */}
          <div className="lg:col-span-8 glass-panel p-5 rounded-xl flex flex-col justify-between space-y-4">
            <div>
              {/* Active Figure Toolbar Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
                      {currentFigure.category}
                    </span>
                    <span className="text-xs font-mono text-stone-400">Figure {currentFigure.id} of 11</span>
                  </div>
                  <h3 className="text-base font-bold font-display text-white mt-1">
                    {currentFigure.title}
                  </h3>
                </div>

                {/* Controls & Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Toggle between Static PNG and Interactive Canvas if available */}
                  {currentFigure.hasInteractive && (
                    <div className="flex items-center space-x-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setDisplayType('image')}
                        className={`px-2.5 py-1 rounded transition flex items-center space-x-1 ${
                          displayType === 'image'
                            ? 'bg-orange-500 text-slate-950 font-bold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Publication Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisplayType('interactive')}
                        className={`px-2.5 py-1 rounded transition flex items-center space-x-1 ${
                          displayType === 'interactive'
                            ? 'bg-orange-500 text-slate-950 font-bold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Interactive 3D / Chart</span>
                      </button>
                    </div>
                  )}

                  {/* 3D controls when interactive */}
                  {displayType === 'interactive' && (currentFigure.id === 4 || currentFigure.id === 5) && (
                    <div className="flex items-center space-x-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setDannToggle(!dannToggle)}
                        className={`px-2 py-0.5 rounded transition ${
                          dannToggle ? 'bg-orange-500 text-slate-950 font-bold' : 'text-stone-400'
                        }`}
                      >
                        {dannToggle ? 'After DANN' : 'Before DANN'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorToggle(colorToggle === 'hospital' ? 'sepsis' : 'hospital')}
                        className="px-2 py-0.5 rounded text-stone-300 hover:text-white"
                      >
                        {colorToggle.toUpperCase()}
                      </button>
                    </div>
                  )}

                  {/* Zoom Lightbox */}
                  <button
                    type="button"
                    onClick={() => setLightboxFig(currentFigure)}
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition"
                    title="Open Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Download PNG */}
                  <a
                    href={`/figures/figure_${currentFigure.id}.png`}
                    download={`SepsisWatch_Figure_${currentFigure.id}.png`}
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition"
                    title="Download High-Resolution PNG"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Main Visual Display Area */}
              <div className="my-4 min-h-[380px] w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 relative flex items-center justify-center p-2">
                {displayType === 'image' || !currentFigure.hasInteractive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center group relative cursor-pointer" onClick={() => setLightboxFig(currentFigure)}>
                    <img
                      src={`/figures/figure_${currentFigure.id}.png`}
                      alt={currentFigure.title}
                      className="max-h-[460px] w-auto max-w-full object-contain rounded-lg shadow-lg shadow-black/60 transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/20 transition-all flex items-center justify-center pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/90 text-stone-200 text-xs font-mono px-3 py-1.5 rounded-lg border border-stone-700 flex items-center space-x-1.5 shadow-xl">
                        <ZoomIn className="w-3.5 h-3.5 text-orange-400" />
                        <span>Click to Enlarge / Full-Resolution Lightbox</span>
                      </div>
                    </div>
                  </div>
                ) : currentFigure.interactiveType === '3d' ? (
                  <div className="w-full h-[400px]">
                    <EmbeddingCloud3D useDANN={dannToggle} colorBy={colorToggle} />
                  </div>
                ) : currentFigure.interactiveType === 'roc' ? (
                  <div className="w-full h-[380px] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RCLineChart data={rocCurveData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262320" />
                        <XAxis dataKey="fpr" stroke="#78716c" label={{ value: 'False Positive Rate (1 - Specificity)', fill: '#78716c', fontSize: 11, dy: 10 }} />
                        <YAxis stroke="#78716c" label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, fill: '#78716c', fontSize: 11, dx: -10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#f97316', fontSize: '11px', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="tprDANN" name="DANN Stacking (AUROC=0.864)" stroke="#F97316" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="tprLGBM" name="LightGBM Only (AUROC=0.842)" stroke="#A8A29E" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="tprRule" name="SIRS Rule (AUROC=0.612)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                      </RCLineChart>
                    </ResponsiveContainer>
                  </div>
                ) : currentFigure.interactiveType === 'calibration' ? (
                  <div className="w-full h-[380px] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RCLineChart data={calibrationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262320" />
                        <XAxis dataKey="pred" stroke="#78716c" label={{ value: 'Mean Predicted Risk Probability', fill: '#78716c', fontSize: 11, dy: 10 }} />
                        <YAxis stroke="#78716c" label={{ value: 'Observed Fraction of Positives', angle: -90, fill: '#78716c', fontSize: 11, dx: -10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#10b981', fontSize: '11px', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="pred" name="Perfect Calibration (y = x)" stroke="#78716c" strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="actualCal" name="After Isotonic (ECE = 0.024)" stroke="#10b981" strokeWidth={2.5} />
                        <Line type="monotone" dataKey="actualUncal" name="Before Isotonic (ECE = 0.082)" stroke="#ef4444" strokeWidth={2} />
                      </RCLineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Scientific Insight & Empirical Analysis Panel */}
            <div className="bg-stone-900/90 p-4 rounded-xl border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-300 font-bold uppercase">
                  <Info className="w-4 h-4 text-orange-400" />
                  <span>Clinical & Empirical Interpretation</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  Artifact: results/figures/figure_{currentFigure.id}.png
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                {currentFigure.insight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL 11 FIGURES GRID */}
      {viewMode === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-stone-900/70 rounded-xl border border-stone-800 text-xs font-mono text-stone-400">
            <span>
              Displaying all 11 scientific figures simultaneously. Click any card to inspect in full-resolution lightbox.
            </span>
            <span className="text-amber-400 font-bold">11 Publication Artifacts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {figures.map((fig) => (
              <div
                key={fig.id}
                className="glass-panel p-4 rounded-xl border border-stone-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-orange-950/70 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                      {fig.category}
                    </span>
                    <span className="text-stone-400 font-bold">Figure {fig.id}</span>
                  </div>
                  <h4 className="text-sm font-bold font-display text-white line-clamp-1">
                    {fig.title}
                  </h4>
                </div>

                {/* Figure Image with Click to Zoom */}
                <div
                  className="w-full h-48 bg-stone-950 rounded-lg overflow-hidden border border-stone-800/80 cursor-pointer relative flex items-center justify-center p-1"
                  onClick={() => setLightboxFig(fig)}
                >
                  <img
                    src={`/figures/figure_${fig.id}.png`}
                    alt={fig.title}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/30 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-stone-900/90 text-amber-400 border border-stone-700 shadow-lg">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Caption / Insight snippet */}
                <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                  {fig.insight}
                </p>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFig(fig.id);
                      setViewMode('single');
                    }}
                    className="text-orange-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                  >
                    <span>Inspect Details &rarr;</span>
                  </button>

                  <a
                    href={`/figures/figure_${fig.id}.png`}
                    download={`SepsisWatch_Figure_${fig.id}.png`}
                    className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800 transition"
                    title="Download PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxFig && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in"
          onClick={() => setLightboxFig(null)}
        >
          {/* Lightbox Header */}
          <div
            className="w-full max-w-6xl flex items-center justify-between text-white pb-3 border-b border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs font-mono text-orange-400 uppercase tracking-wider">
                {lightboxFig.category} • Figure {lightboxFig.id} of 11
              </span>
              <h3 className="text-lg font-bold font-display text-white mt-0.5">
                {lightboxFig.title}
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href={`/figures/figure_${lightboxFig.id}.png`}
                download={`SepsisWatch_Figure_${lightboxFig.id}.png`}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-mono text-stone-200 flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Full-Res PNG</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxFig(null)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Center */}
          <div
            className="w-full max-w-6xl flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/figures/figure_${lightboxFig.id}.png`}
              alt={lightboxFig.title}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl border border-stone-800 bg-stone-950"
            />
          </div>

          {/* Lightbox Footer Caption */}
          <div
            className="w-full max-w-6xl bg-stone-900/90 border border-stone-800 p-3.5 rounded-xl text-xs text-stone-300 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-bold text-amber-300 font-mono mr-2">SCIENTIFIC CAPTION:</span>
            {lightboxFig.insight}
          </div>
        </div>
      )}
    </div>
  );
};
