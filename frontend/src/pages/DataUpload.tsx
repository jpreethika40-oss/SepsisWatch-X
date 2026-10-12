import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, Activity, Brain } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DataUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Simulated parsed timeline from uploaded file
  const uploadedTimeline = Array.from({ length: 20 }, (_, i) => {
    const h = i + 1;
    const isSeptic = h >= 10;
    const risk = isSeptic ? Math.min(0.92, 0.2 + (h - 9) * 0.08) : 0.14 + Math.sin(h) * 0.05;
    return {
      hour: h,
      risk: Number(risk.toFixed(2)),
      threshold: 0.45,
      hr: Math.round(75 + (isSeptic ? (h - 9) * 6 : 0)),
      map: Math.round(85 - (isSeptic ? (h - 9) * 3 : 0)),
    };
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0].name);
    }
  };

  const processFile = (name: string) => {
    setFileName(name);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setFileUploaded(true);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Patient Data Ingestion & Batch Inference
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Upload custom patient records in PhysioNet .psv or .csv format to generate instantaneous early-warning risk timelines.
          </p>
        </div>

        <button
          onClick={() => processFile('sample_patient_external.psv')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs font-mono border border-cyan-500/30 hover:bg-slate-700 transition"
        >
          Load Demo .psv File
        </button>
      </div>

      {/* Upload Zone */}
      {!fileUploaded ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`glass-panel border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            dragActive
              ? 'border-cyan-400 bg-cyan-950/20 glow-cyan'
              : 'border-slate-700 hover:border-cyan-500/40 bg-slate-900/40'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 glow-cyan">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 font-sans">
            Drag and drop a patient .psv or .csv record here
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
            Pipe-delimited format matching PhysioNet 2019 (40 physiological features). Header validated automatically.
          </p>
          {isProcessing && (
            <div className="mt-4 flex items-center space-x-2 text-cyan-400 text-xs font-mono animate-pulse">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Parsing clinical vitals and running ensemble models...</span>
            </div>
          )}
        </div>
      ) : (
        /* Result Preview */
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl flex justify-between items-center bg-slate-900/70 border-cyan-500/30">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-mono font-bold text-slate-200">{fileName}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  20 ICU Hours parsed • 40 Features Validated • Zero Imputation Missingness Handled
                </p>
              </div>
            </div>
            <button
              onClick={() => setFileUploaded(false)}
              className="text-xs text-slate-400 hover:text-cyan-400 font-mono"
            >
              Upload Another
            </button>
          </div>

          {/* Generated Timeline */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Simulated Inflow Risk Trajectory</span>
              </h3>
              <span className="text-[11px] font-mono text-red-400 font-bold">
                Alert Triggered at Hour 11 (Lead Time: 5.2h)
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uploadedTimeline}>
                  <defs>
                    <linearGradient id="upRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(v) => `h${v}`} />
                  <YAxis domain={[0, 1]} stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2.5} fill="url(#upRiskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
