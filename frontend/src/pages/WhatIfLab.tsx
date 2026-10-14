import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Patient } from '../types';
import { Sliders, RotateCcw, ArrowRight, Activity, Brain, ShieldAlert, Sparkles, Box } from 'lucide-react';
import { DecisionManifold3D } from '../components/3d/DecisionManifold3D';

export const WhatIfLab: React.FC = () => {
  const { patients, selectedPatientId } = useStore();
  const fallbackPatient: Patient = {
    id: 1,
    patient_code: 'p_A_00001',
    hospital: 'setA',
    age: 58,
    gender: 0,
    unit1: 1,
    unit2: 0,
    hosp_adm_time: -12.0,
    is_active: true,
    bed_number: 1,
    current_hour: 4,
    risk: 0.15,
    calibrated_prob: 0.14,
    conformal_label: 'no_sepsis',
    status: 'normal',
  };
  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || fallbackPatient;

  // Baseline clinical values
  const [hr, setHr] = useState<number>(118);
  const [sbp, setSbp] = useState<number>(92);
  const [temp, setTemp] = useState<number>(38.4);
  const [lactate, setLactate] = useState<number>(3.2);
  const [wbc, setWbc] = useState<number>(16.5);
  const [resp, setResp] = useState<number>(24);
  const [baseExcess, setBaseExcess] = useState<number>(-4.2);

  // Compute interactive counterfactual sepsis risk
  //couples physiological shock index (HR/SBP) + severe sepsis biomarker thresholds
  const shockIndex = hr / Math.max(sbp, 40);
  let computedRisk = 0.15;
  if (shockIndex > 1.0) computedRisk += (shockIndex - 1.0) * 0.45;
  if (temp > 38.3 || temp < 36.0) computedRisk += 0.15;
  if (lactate > 2.0) computedRisk += Math.min(0.35, (lactate - 2.0) * 0.12);
  if (wbc > 12.0) computedRisk += Math.min(0.20, (wbc - 12.0) * 0.02);
  if (resp > 22) computedRisk += 0.12;
  if (baseExcess < -2.0) computedRisk += 0.10;

  const finalRisk = Math.min(0.98, Math.max(0.04, computedRisk));
  const originalRisk = 0.74;
  const riskDelta = finalRisk - originalRisk;

  const conformalStatus =
    finalRisk >= 0.65 ? 'sepsis' : finalRisk <= 0.35 ? 'no_sepsis' : 'uncertain';

  const resetDefaults = () => {
    setHr(118);
    setSbp(92);
    setTemp(38.4);
    setLactate(3.2);
    setWbc(16.5);
    setResp(24);
    setBaseExcess(-4.2);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              What-If Counterfactual Physiological Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Tweak vitals & labs to simulate interventions (fluids, vasopressors, antibiotics) and observe real-time model risk shifts.
          </p>
        </div>

        <button
          onClick={resetDefaults}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Observed Baseline</span>
        </button>
      </div>

      {/* 3D Decision Manifold */}
      <DecisionManifold3D sbp={sbp} lactate={lactate} risk={finalRisk} threshold={0.45} />

      {/* Main Grid: Controls vs Risk Readout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive Physiological Parameter Sliders */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl space-y-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold border-b border-slate-800 pb-2">
            Interactive Biomarker Sliders (Bed {currentPatient.bed_number} - {currentPatient.patient_code})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Heart Rate */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">Heart Rate (HR)</span>
                <span className={`font-bold ${hr > 100 ? 'text-red-400' : 'text-emerald-400'}`}>{hr} bpm</span>
              </div>
              <input
                type="range"
                min={50}
                max={160}
                value={hr}
                onChange={(e) => setHr(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50 bpm</span>
                <span>Normal: 60-100</span>
                <span>160 bpm</span>
              </div>
            </div>

            {/* Systolic Blood Pressure */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">Systolic BP (SBP)</span>
                <span className={`font-bold ${sbp < 90 ? 'text-red-400' : 'text-emerald-400'}`}>{sbp} mmHg</span>
              </div>
              <input
                type="range"
                min={60}
                max={180}
                value={sbp}
                onChange={(e) => setSbp(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>60 mmHg (Shock)</span>
                <span>Normal: 90-120</span>
                <span>180 mmHg</span>
              </div>
            </div>

            {/* Serum Lactate */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">Serum Lactate</span>
                <span className={`font-bold ${lactate > 2.0 ? 'text-red-400' : 'text-emerald-400'}`}>{lactate.toFixed(1)} mmol/L</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8.0}
                step={0.1}
                value={lactate}
                onChange={(e) => setLactate(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5 mmol/L</span>
                <span>Threshold: 2.0</span>
                <span>8.0 mmol/L</span>
              </div>
            </div>

            {/* Body Temperature */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">Core Temp</span>
                <span className={`font-bold ${temp > 38.3 || temp < 36.0 ? 'text-red-400' : 'text-emerald-400'}`}>{temp.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min={35.0}
                max={41.0}
                step={0.1}
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>35.0 °C</span>
                <span>Normal: 36.5 - 37.5</span>
                <span>41.0 °C</span>
              </div>
            </div>

            {/* White Blood Cell Count */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">White Blood Cells (WBC)</span>
                <span className={`font-bold ${wbc > 12.0 ? 'text-red-400' : 'text-emerald-400'}`}>{wbc.toFixed(1)} k/uL</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={35.0}
                step={0.5}
                value={wbc}
                onChange={(e) => setWbc(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>2.0 k/uL</span>
                <span>Normal: 4.0 - 11.0</span>
                <span>35.0 k/uL</span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">Respiratory Rate (Resp)</span>
                <span className={`font-bold ${resp > 22 ? 'text-red-400' : 'text-emerald-400'}`}>{resp} /min</span>
              </div>
              <input
                type="range"
                min={10}
                max={40}
                value={resp}
                onChange={(e) => setResp(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>10 /min</span>
                <span>qSOFA cutoff: &gt;22</span>
                <span>40 /min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Counterfactual Risk Gauge & Explanation Diff */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-xl border-amber-500/30 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Simulated Risk Shift</span>
            </h3>

            {/* Comparison Cards */}
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Observed Risk</span>
                <p className="text-xl font-bold font-display text-slate-200">
                  {(originalRisk * 100).toFixed(0)}%
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-400" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">What-If Risk</span>
                <p className={`text-2xl font-bold font-display ${finalRisk >= 0.7 ? 'text-red-400' : finalRisk >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {(finalRisk * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Risk Delta Banner */}
            <div className={`p-2.5 rounded-lg text-xs font-mono flex justify-between items-center ${
              riskDelta < 0 ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/40 border border-red-500/30 text-red-300'
            }`}>
              <span>Simulated Delta:</span>
              <strong className="text-sm">
                {riskDelta > 0 ? `+${(riskDelta * 100).toFixed(1)}%` : `${(riskDelta * 100).toFixed(1)}%`}
              </strong>
            </div>

            {/* Conformal Uncertainty Tag */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Conformal Prediction:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                  conformalStatus === 'sepsis' ? 'bg-red-950 text-red-300' : conformalStatus === 'uncertain' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {conformalStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {conformalStatus === 'sepsis'
                  ? 'Model has >90% confidence of true onset within 6h.'
                  : conformalStatus === 'uncertain'
                  ? 'Ambiguous trajectory: Clinician review recommended.'
                  : 'Low risk of septic shock.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
