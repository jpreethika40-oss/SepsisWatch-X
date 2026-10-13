import React, { useState } from 'react';
import { Sparkles, RefreshCw, Maximize2, Minimize2, ExternalLink, ShieldCheck } from 'lucide-react';

export const GradioStudio: React.FC = () => {
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0C0B0A] p-4 flex flex-col' : ''}`}>
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-ember">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-slate-100 flex items-center space-x-2">
                <span>Interactive ML Studio & Conformal Workbench</span>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-500/30">
                  Gradio Live Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Interact live with LightGBM, GRU-D, and DANN Fusion models. Adjust vitals sliders and explore Split Conformal prediction sets.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            title="Reload Gradio Workbench"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white hover:border-amber-500/40 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 hover:bg-orange-500/20 transition glow-ember"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          <a
            href="/gradio/"
            target="_blank"
            rel="noreferrer"
            title="Open in standalone tab"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Gradio Container */}
      <div className={`glass-panel rounded-xl overflow-hidden border border-amber-500/30 glow-ember flex-1 ${isFullscreen ? 'h-full' : 'h-[740px]'}`}>
        <iframe
          key={iframeKey}
          src="/gradio/"
          title="SepsisWatch-X Gradio ML Studio"
          className="w-full h-full border-0 bg-[#0C0B0A]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Helpful Clinical Context Note */}
      {!isFullscreen && (
        <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Unified Inference:</strong> Predictions executed through the same calibrated backend pipeline as the 3D ICU ward.
            </span>
          </div>
          <span className="text-[11px] text-amber-400">
            Conformal Coverage: 90% (α = 0.10)
          </span>
        </div>
      )}
    </div>
  );
};
