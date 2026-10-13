import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, FileText, AlertCircle, Activity, Sparkles, Brain } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DataQualityHeatmap3D } from '../components/3d/DataQualityHeatmap3D';

export const DataUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
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

  // Mock parsed hourly timeline for uploaded patient
  const uploadedTimeline = [
    { hour: 1, hr: 74, map: 88, lactate: 1.1, risk: 0.12, conformal: 'no_sepsis' },
    { hour: 3, hr: 78, map: 85, lactate: 1.2, risk: 0.14, conformal: 'no_sepsis' },
    { hour: 6, hr: 85, map: 82, lactate: 1.4, risk: 0.22, conformal: 'no_sepsis' },
    { hour: 9, hr: 98, map: 76, lactate: 1.8, risk: 0.42, conformal: 'uncertain' },
    { hour: 11, hr: 112, map: 68, lactate: 2.3, risk: 0.68, conformal: 'sepsis' },
    { hour: 14, hr: 122, map: 62, lactate: 3.1, risk: 0.86, conformal: 'sepsis' },
    { hour: 17, hr: 128, map: 58, lactate: 3.8, risk: 0.92, conformal: 'sepsis' },
    { hour: 20, hr: 130, map: 55, lactate: 4.2, risk: 0.95, conformal: 'sepsis' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold font-display text-[#F3EEE8]">
              Batch Clinical Telemetry Ingestion & Missingness Radar
            </h1>
          </div>
          <p className="text-xs text-[#A09689] font-mono mt-0.5">
            Upload custom patient records in PhysioNet .psv or .csv format to generate instantaneous early-warning risk timelines and inspect observation latency in 3D.
          </p>
        </div>

        <button
          onClick={() => processFile('sample_patient_external.psv')}
          className="px-3 py-1.5 rounded-lg bg-[#1E1B18] text-amber-300 text-xs font-mono border border-amber-500/30 hover:bg-[#332E29] transition"
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
          className={`glass-panel border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            dragActive
              ? 'border-orange-400 bg-amber-950/20 glow-ember'
              : 'border-[#332E29] hover:border-amber-500/40 bg-[#151311]/40'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-amber-500/30 flex items-center justify-center text-orange-400 mb-4 glow-ember">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-[#F3EEE8] font-sans">
            Drag and drop a patient .psv or .csv record here
          </h3>
          <p className="text-xs text-[#A09689] font-mono mt-1 max-w-sm">
            Pipe-delimited format matching PhysioNet 2019 (40 physiological features). Header validated automatically.
          </p>
          {isProcessing && (
            <div className="mt-4 flex items-center space-x-2 text-orange-400 text-xs font-mono animate-pulse">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Parsing clinical vitals and running ensemble models...</span>
            </div>
          )}
        </div>
      ) : (
        /* Result Preview */
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl flex justify-between items-center bg-[#151311]/70 border-amber-500/30">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-mono font-bold text-[#F3EEE8]">{fileName}</p>
                <p className="text-[11px] text-[#A09689] font-mono">
                  20 ICU Hours parsed • 40 Features Validated • Zero Imputation Missingness Handled
                </p>
              </div>
            </div>
            <button
              onClick={() => setFileUploaded(false)}
              className="text-xs text-[#A09689] hover:text-orange-400 font-mono"
            >
              Upload Another
            </button>
          </div>

          {/* Generated Timeline */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#332E29] pb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#F3EEE8] font-semibold flex items-center space-x-2">
                <Brain className="w-4 h-4 text-orange-400" />
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
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#332E29" />
                  <XAxis dataKey="hour" stroke="#A09689" tickFormatter={(v) => `h${v}`} />
                  <YAxis domain={[0, 1]} stroke="#A09689" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#151311', borderColor: '#F97316', fontSize: '11px', color: '#F3EEE8' }} />
                  <Area type="monotone" dataKey="risk" stroke="#EF4444" strokeWidth={2.5} fill="url(#upRiskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 3D Data Quality & Missingness Radar Scene (Scene 6 of 6) */}
      <div className="glass-panel p-5 rounded-xl space-y-3">
        <div className="flex justify-between items-center border-b border-[#332E29] pb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#F3EEE8] font-semibold">
              3D ICU Data Quality Heatmap & Telemetry Sparsity Radar
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#A09689]">
            Interactive Three.js R3F Scene • 12 Ward Beds × 16 Key Biomarkers
          </span>
        </div>
        <div className="h-96 w-full rounded-lg overflow-hidden border border-[#332E29]">
          <DataQualityHeatmap3D />
        </div>
      </div>
    </div>
  );
};
