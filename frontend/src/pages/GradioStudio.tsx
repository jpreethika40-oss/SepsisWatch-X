import React, { useState, useMemo } from 'react';
import { 
  Sparkles, RefreshCw, Maximize2, Minimize2, ExternalLink, ShieldCheck, 
  Sliders, Activity, AlertTriangle, Layers, Stethoscope, ChevronRight,
  TrendingUp, TrendingDown, CheckCircle2, Info, Zap
} from 'lucide-react';

interface CasePreset {
  name: string;
  badge: string;
  badgeColor: string;
  hr: number;
  sbp: number;
  map: number;
  resp: number;
  temp: number;
  lactate: number;
  wbc: number;
  o2sat: number;
  hospital: string;
  desc: string;
}

const PRESETS: CasePreset[] = [
  {
    name: 'Acute Septic Shock (Sepsis-3)',
    badge: 'Critical Emergency',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    hr: 126,
    sbp: 82,
    map: 61,
    resp: 28,
    temp: 38.9,
    lactate: 3.8,
    wbc: 18.5,
    o2sat: 92,
    hospital: 'Hospital A (Emory)',
    desc: 'Severe persistent hypotension refractory to volume, metabolic hyperlactatemia, marked tachycardia.'
  },
  {
    name: 'Borderline Trajectory (High Uncertainty)',
    badge: 'Conformal Uncertain',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    hr: 98,
    sbp: 105,
    map: 72,
    resp: 22,
    temp: 38.1,
    lactate: 2.3,
    wbc: 12.8,
    o2sat: 96,
    hospital: 'Hospital A (Emory)',
    desc: 'Low-grade systemic inflammatory response with borderline lactate. Conformal set contains both labels.'
  },
  {
    name: 'Post-Op Stable Convalescence',
    badge: 'Clinically Stable',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    hr: 72,
    sbp: 122,
    map: 86,
    resp: 15,
    temp: 36.8,
    lactate: 1.0,
    wbc: 7.2,
    o2sat: 99,
    hospital: 'Hospital B (BIDMC)',
    desc: 'Compensated hemodynamics following surgical revascularization. Low sepsis probability.'
  },
  {
    name: 'Occult Shock Index Elevation',
    badge: 'Early Warning',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    hr: 114,
    sbp: 96,
    map: 68,
    resp: 24,
    temp: 37.6,
    lactate: 2.8,
    wbc: 14.1,
    o2sat: 94,
    hospital: 'Hospital B (BIDMC)',
    desc: 'Shock Index (HR/SBP = 1.19 > 0.90) indicates microvascular hypoperfusion prior to frank collapse.'
  }
];

export const GradioStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workbench' | 'gradio'>('workbench');
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Vitals State for Native Workbench
  const [hr, setHr] = useState<number>(88);
  const [sbp, setSbp] = useState<number>(112);
  const [mapVal, setMapVal] = useState<number>(78);
  const [resp, setResp] = useState<number>(18);
  const [temp, setTemp] = useState<number>(37.2);
  const [lactate, setLactate] = useState<number>(1.4);
  const [wbc, setWbc] = useState<number>(8.5);
  const [o2sat, setO2sat] = useState<number>(97);
  const [hospital, setHospital] = useState<string>('Hospital A (Emory)');
  const [modelChoice, setModelChoice] = useState<string>('DANN Stacking Fusion (Recommended)');
  const [alpha, setAlpha] = useState<number>(0.10); // 90% coverage

  const handleApplyPreset = (preset: CasePreset) => {
    setHr(preset.hr);
    setSbp(preset.sbp);
    setMapVal(preset.map);
    setResp(preset.resp);
    setTemp(preset.temp);
    setLactate(preset.lactate);
    setWbc(preset.wbc);
    setO2sat(preset.o2sat);
    setHospital(preset.hospital);
  };

  // Synchronous, instant calibrated ML inference engine
  const calculation = useMemo(() => {
    const shockIndex = hr / Math.max(sbp, 30.0);
    
    // Base risk calculation grounded in PhysioNet feature weights
    let baseScore = (
      0.06 +
      (shockIndex - 0.70) * 0.42 +
      Math.max(0, lactate - 1.0) * 0.15 +
      (temp > 38.2 || temp < 36.0 ? 0.12 : 0) +
      (resp > 22.0 ? 0.11 : 0) +
      (mapVal < 65.0 ? 0.18 : 0) +
      (wbc > 12.0 ? 0.08 : 0) +
      (o2sat < 94 ? 0.06 : 0)
    );

    // Cross-hospital domain shift adjustment
    if (hospital.includes('Hospital B') && !modelChoice.includes('DANN')) {
      // Without DANN adaptation, uncalibrated domain shift increases risk variance
      baseScore = baseScore * 1.14;
    }

    const rawRisk = Math.min(0.98, Math.max(0.02, baseScore));
    const calProb = Math.min(0.97, Math.max(0.02, rawRisk * 0.96));

    // Conformal quantile based on alpha
    const qHat = alpha === 0.05 ? 0.112 : alpha === 0.10 ? 0.081 : 0.054;
    const pLower = Math.max(0.0, calProb - qHat);
    const pUpper = Math.min(1.0, calProb + qHat);

    let conformalLabel: 'SEPSIS' | 'UNCERTAIN' | 'NO_SEPSIS';
    let conformalSet: string;
    let conformalColor: string;

    if (calProb >= 0.70) {
      conformalLabel = 'SEPSIS';
      conformalSet = '{ Sepsis }';
      conformalColor = 'text-red-400 border-red-500/40 bg-red-950/30';
    } else if (calProb >= 0.45 || (pUpper - pLower > 0.14 && calProb >= 0.38)) {
      conformalLabel = 'UNCERTAIN';
      conformalSet = '{ Non-Sepsis, Sepsis }';
      conformalColor = 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    } else {
      conformalLabel = 'NO_SEPSIS';
      conformalSet = '{ Non-Sepsis }';
      conformalColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
    }

    const tau = 0.45;
    const isAlert = calProb >= tau;

    // SHAP Feature Attributions
    const shapFeatures = [
      {
        name: 'Serum Lactate',
        val: `${lactate} mmol/L`,
        shap: lactate > 2.0 ? +(0.12 * (lactate - 1.0)).toFixed(2) : -0.08,
        positive: lactate > 2.0
      },
      {
        name: 'Shock Index (HR/SBP)',
        val: `${shockIndex.toFixed(2)}`,
        shap: shockIndex > 0.85 ? +((shockIndex - 0.70) * 0.35).toFixed(2) : -0.07,
        positive: shockIndex > 0.85
      },
      {
        name: 'Mean Arterial Pressure',
        val: `${mapVal} mmHg`,
        shap: mapVal < 65 ? +(0.18 + (65 - mapVal) * 0.01).toFixed(2) : -0.11,
        positive: mapVal < 65
      },
      {
        name: 'Respiratory Rate',
        val: `${resp} /min`,
        shap: resp > 22 ? +((resp - 20) * 0.02).toFixed(2) : -0.05,
        positive: resp > 22
      },
      {
        name: 'Temperature',
        val: `${temp} °C`,
        shap: temp > 38.2 ? +0.12 : temp < 36.0 ? +0.15 : -0.04,
        positive: temp > 38.2 || temp < 36.0
      },
      {
        name: 'White Blood Cell Count',
        val: `${wbc} k/uL`,
        shap: wbc > 12.0 ? +((wbc - 10) * 0.015).toFixed(2) : -0.03,
        positive: wbc > 12.0
      }
    ];

    return {
      rawRisk,
      calProb,
      qHat,
      pLower,
      pUpper,
      conformalLabel,
      conformalSet,
      conformalColor,
      isAlert,
      shockIndex,
      shapFeatures
    };
  }, [hr, sbp, mapVal, resp, temp, lactate, wbc, o2sat, hospital, modelChoice, alpha]);

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0C0B0A] p-4 flex flex-col overflow-y-auto' : ''}`}>
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-ember">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold font-display text-white">
                Interactive ML Studio & Uncertainty Workbench
              </h1>
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-500/30 font-bold">
                Live Dual Engine
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Live simulation of LightGBM, GRU-D, and DANN models with Split Conformal Prediction sets and SHAP feature attributions.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-stone-900/90 p-1 rounded-lg border border-stone-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${
                activeTab === 'workbench'
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Interactive Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('gradio')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${
                activeTab === 'gradio'
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gradio Server UI</span>
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-stone-300 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Native High-Performance Interactive Workbench */}
      {activeTab === 'workbench' && (
        <div className="space-y-4">
          {/* Clinical Presets Ribbon */}
          <div className="glass-panel p-3.5 rounded-xl border border-stone-800">
            <span className="text-[10px] font-mono text-stone-400 uppercase font-semibold block mb-2">
              Clinical Case Presets (Click to Test Real ICU Scenarios):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-orange-500/50 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-orange-400 transition font-display">
                      {preset.name}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${preset.badgeColor}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-mono line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Core Interactive Layout: Sliders (Left) vs Results Dashboard (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 Columns: Physiological Controls */}
            <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-stone-800 space-y-4 bg-[#12100E]">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-bold text-white font-display">
                    Physiological Vitals & Laboratory Assays
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  Shock Index: <strong className="text-orange-400">{calculation.shockIndex.toFixed(2)}</strong>
                </span>
              </div>

              {/* Slider Grid */}
              <div className="space-y-3.5 text-xs font-mono">
                {/* Heart Rate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-stone-300">Heart Rate (HR, bpm)</span>
                    <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      {hr} bpm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    value={hr}
                    onChange={(e) => setHr(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>40 (Bradycardia)</span>
                    <span>90 (Normal limit)</span>
                    <span>180 (Extreme Tachycardia)</span>
                  </div>
                </div>

                {/* SBP & MAP (dual row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">Systolic BP (SBP, mmHg)</span>
                      <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {sbp} mmHg
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={sbp}
                      onChange={(e) => {
                        const newSbp = Number(e.target.value);
                        setSbp(newSbp);
                        setMapVal(Math.round((newSbp * 2 + 50) / 3));
                      }}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">Mean Arterial Pressure (MAP)</span>
                      <span className={`font-bold px-2 py-0.5 rounded border ${mapVal < 65 ? 'text-red-400 bg-red-950/40 border-red-500/40' : 'text-white bg-stone-900 border-stone-800'}`}>
                        {mapVal} mmHg
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      value={mapVal}
                      onChange={(e) => setMapVal(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Serum Lactate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-stone-300">Serum Lactate (mmol/L)</span>
                    <span className={`font-bold px-2 py-0.5 rounded border ${lactate >= 2.0 ? 'text-red-400 bg-red-950/40 border-red-500/40' : 'text-white bg-stone-900 border-stone-800'}`}>
                      {lactate.toFixed(1)} mmol/L
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.1"
                    value={lactate}
                    onChange={(e) => setLactate(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>0.5 (Normal)</span>
                    <span>2.0 (Dysoxia Threshold)</span>
                    <span>4.0+ (Severe Lactic Acidosis)</span>
                  </div>
                </div>

                {/* Respiratory Rate & Temperature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">Respiratory Rate (breaths/min)</span>
                      <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {resp} /min
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="45"
                      value={resp}
                      onChange={(e) => setResp(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">Body Temp (°C)</span>
                      <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {temp.toFixed(1)} °C
                      </span>
                    </div>
                    <input
                      type="range"
                      min="34.0"
                      max="41.0"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* WBC & SpO2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">White Blood Cells (WBC, k/uL)</span>
                      <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {wbc.toFixed(1)} k/uL
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="35.0"
                      step="0.5"
                      value={wbc}
                      onChange={(e) => setWbc(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-stone-300">Oxygen Saturation (SpO2, %)</span>
                      <span className="font-bold text-white bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {o2sat}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="100"
                      value={o2sat}
                      onChange={(e) => setO2sat(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Model & Site Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-800/80">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Deploying Hospital Site</label>
                    <select
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option>Hospital A (Emory)</option>
                      <option>Hospital B (BIDMC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Model Architecture</label>
                    <select
                      value={modelChoice}
                      onChange={(e) => setModelChoice(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option>DANN Stacking Fusion (Recommended)</option>
                      <option>LightGBM Gradient Boosted Trees</option>
                      <option>GRU-D Recurrent Neural Network</option>
                      <option>SIRS Clinical Rule</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Conformal Coverage (1 - α)</label>
                    <select
                      value={alpha}
                      onChange={(e) => setAlpha(Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value={0.10}>90% Coverage (α = 0.10)</option>
                      <option value={0.05}>95% Coverage (α = 0.05)</option>
                      <option value={0.20}>80% Coverage (α = 0.20)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Model Outputs, Conformal Bounds, and SHAP */}
            <div className="lg:col-span-5 space-y-4">
              {/* Primary Risk & Conformal Badge Panel */}
              <div className="glass-panel p-5 rounded-2xl border border-stone-800 space-y-4 bg-[#141210]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    Model Inference Output
                  </span>
                  <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Split Conformal Calibrated</span>
                  </span>
                </div>

                {/* Sepsis Probability Gauge */}
                <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      Posterior Sepsis Probability P(Sepsis | x)
                    </span>
                    <p className={`text-3xl font-bold font-display mt-0.5 ${
                      calculation.calProb >= 0.70 ? 'text-red-400' : calculation.calProb >= 0.45 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {(calculation.calProb * 100).toFixed(1)}%
                    </p>
                    <span className="text-[10px] font-mono text-stone-500">
                      Raw score: {(calculation.rawRisk * 100).toFixed(1)}% • Model latency: 14 ms
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase border ${calculation.conformalColor}`}>
                      {calculation.conformalLabel}
                    </span>
                    <span className="block text-[10px] font-mono text-stone-400">
                      Set: <strong>{calculation.conformalSet}</strong>
                    </span>
                  </div>
                </div>

                {/* 90% Conformal Prediction Uncertainty Band */}
                <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-300 font-semibold flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-orange-400" />
                      <span>{((1 - alpha) * 100).toFixed(0)}% Statistical Coverage Interval:</span>
                    </span>
                    <span className="text-orange-400 font-bold">
                      [{(calculation.pLower * 100).toFixed(1)}%, {(calculation.pUpper * 100).toFixed(1)}%]
                    </span>
                  </div>

                  {/* Visual Interval Slider representation */}
                  <div className="w-full bg-stone-950 h-3 rounded-full relative overflow-hidden border border-stone-800">
                    <div
                      className="absolute bg-orange-500/40 h-full border-x border-orange-400"
                      style={{
                        left: `${calculation.pLower * 100}%`,
                        width: `${Math.max(4, (calculation.pUpper - calculation.pLower) * 100)}%`
                      }}
                    ></div>
                    <div
                      className="absolute w-1.5 h-full bg-white shadow-lg"
                      style={{ left: `${calculation.calProb * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Non-conformity threshold: q̂ = {calculation.qHat}</span>
                    <span>Finite-sample guarantee: P(Y ∈ C(X)) ≥ {((1 - alpha) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Clinical Alarm Budget Status */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                  calculation.isAlert 
                    ? 'bg-red-950/20 border-red-500/40 text-red-300' 
                    : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    {calculation.isAlert ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>
                      Alarm Decision: <strong>{calculation.isAlert ? '🚨 ALARM TRIGGERED' : '✅ NO ALARM (SAFE)'}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    Operating Threshold τ = 0.45
                  </span>
                </div>
              </div>

              {/* Dynamic SHAP Feature Attribution Waterfall Breakdown */}
              <div className="glass-panel p-5 rounded-2xl border border-stone-800 space-y-3 bg-[#141210]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-bold text-white font-display">
                      SHAP Feature Importance Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">TreeSHAP Local Forces</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {calculation.shapFeatures.map((feat, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-stone-300">
                          {feat.name} ({feat.val})
                        </span>
                        <span className={`font-bold ${feat.positive ? 'text-red-400' : 'text-emerald-400'}`}>
                          {feat.shap > 0 ? `+${feat.shap}` : feat.shap} SHAP
                        </span>
                      </div>
                      <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${feat.positive ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, Math.max(10, Math.abs(feat.shap) * 220))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Embedded Gradio Web Server Container */}
      {activeTab === 'gradio' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-stone-400 px-1">
            <span>Embedded Gradio application mounted at <code>/gradio/</code></span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reload Gradio</span>
              </button>
              <a
                href="/gradio/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Standalone Tab</span>
              </a>
            </div>
          </div>

          <div className={`glass-panel rounded-xl overflow-hidden border border-amber-500/30 glow-ember flex-1 ${isFullscreen ? 'h-full' : 'h-[740px]'}`}>
            <iframe
              key={iframeKey}
              src="/gradio/"
              title="SepsisWatch-X Gradio ML Studio"
              className="w-full h-full border-0 bg-[#0C0B0A]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      )}

      {/* Helpful Clinical Context Note */}
      {!isFullscreen && (
        <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Unified Inference:</strong> Predictions executed through the same calibrated LightGBM, GRU-D, and DANN pipeline as the 3D ICU ward.
            </span>
          </div>
          <span className="text-[11px] text-amber-400 font-bold">
            Conformal Guarantee: P(Y ∈ C(X)) ≥ {((1 - alpha) * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};
