import React, { useState } from 'react';
import { Terminal, RefreshCw, Maximize2, Minimize2, ExternalLink, ShieldAlert } from 'lucide-react';

export const ApiExplorer: React.FC = () => {
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
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-slate-100 flex items-center space-x-2">
                <span>Interactive API Explorer & Developer Workbench</span>
                <span className="bg-emerald-950 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  FastAPI OpenAPI 3.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Execute live requests against all 22 REST endpoints (predictions, conformal calibration, drift detection, and telemetry simulation).
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            title="Reload API Explorer"
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
            href="/docs"
            target="_blank"
            rel="noreferrer"
            title="Open in standalone tab"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Swagger Container */}
      <div className={`rounded-xl overflow-hidden border border-amber-500/30 bg-slate-900 flex-1 ${isFullscreen ? 'h-full' : 'h-[740px]'}`}>
        <iframe
          key={iframeKey}
          src="/docs"
          title="SepsisWatch-X FastAPI Swagger Documentation"
          className="w-full h-full border-0 bg-white"
        />
      </div>

      {/* API Key / Auth Info */}
      {!isFullscreen && (
        <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>
              <strong>Direct Execution:</strong> Calls made via "Try it out" interact directly with the running backend SQLite database and ML models.
            </span>
          </div>
          <span className="text-[11px] text-emerald-400">
            OpenAPI Specification: /openapi.json
          </span>
        </div>
      )}
    </div>
  );
};
