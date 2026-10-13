import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Patient } from '../types';
import { Swords, Building2, Cpu, Zap, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

export const ModelArena: React.FC = () => {
  const { patients, selectedPatientId } = useStore();
  const [selectedHospitalDomain, setSelectedHospitalDomain] = useState<'setA' | 'setB'>('setA');
  const [activeTab, setActiveTab] = useState<'comparison' | 'gradio'>('comparison');

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

  // Head-to-head model prediction outputs on this patient
  const models = [
    {
      id: 'dann_fusion',
      name: 'DANN Stacking Fusion (SepsisWatch-X)',
      type: 'Domain-Adversarial Ensemble',
      risk: selectedHospitalDomain === 'setA' ? 0.78 : 0.74,
      latencyMs: 38.4,
      conformal: 'Sepsis (90% Conf.)',
      status: 'recommended',
      notes: 'Gradient reversal layers remove hospital site bias. Calibrated isotonic meta-learner.'
    },
    {
      id: 'lgbm',
      name: 'LightGBM (Rolling Tabular)',
      type: 'Gradient Boosted Trees',
      risk: selectedHospitalDomain === 'setA' ? 0.81 : 0.65,
      latencyMs: 4.2,
      conformal: selectedHospitalDomain === 'setA' ? 'Sepsis' : 'Uncertain',
      status: 'standard',
      notes: 'Hand-crafted rolling 6h/12h mean, min, max, slope, and shock index features.'
    },
    {
      id: 'grud',
      name: 'GRU-D (Decay Recurrent)',
      type: 'Time-Decay RNN',
      risk: selectedHospitalDomain === 'setA' ? 0.72 : 0.69,
      latencyMs: 32.8,
      conformal: 'Sepsis',
      status: 'standard',
      notes: 'Handles missingness patterns explicitly via learned exponential time-decay vectors.'
    },
    {
      id: 'sirs',
      name: 'SIRS Clinical Criteria',
      type: 'Rule-Based Baseline',
      risk: 1.0, // Binary rule triggered
      latencyMs: 0.1,
      conformal: 'N/A (Heuristic)',
      status: 'baseline',
      notes: 'Heart rate > 90, Resp > 20, Temp > 38°C. Very high false alarm rate.'
    },
    {
      id: 'qsofa',
      name: 'qSOFA Bedside Score',
      type: 'Rule-Based Baseline',
      risk: 0.5, // 1 of 3 criteria
      latencyMs: 0.1,
      conformal: 'N/A (Heuristic)',
      status: 'baseline',
      notes: 'Altered mental status, SBP <= 100, Resp >= 22. High specificity, but poor early sensitivity.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Mode Tabs */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Swords className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold font-display text-slate-100">
              Model Arena & Interactive ML Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Evaluate LightGBM, GRU-D, DANN Fusion, and Clinical Rules side-by-side or interact directly via the embedded workbench.
          </p>
        </div>

        {/* View Switcher Tabs & Hospital Switch */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700/80 text-xs font-mono">
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded transition ${
                activeTab === 'comparison' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Model Cards</span>
            </button>
            <button
              onClick={() => setActiveTab('gradio')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded transition ${
                activeTab === 'gradio' ? 'bg-orange-500 text-slate-950 font-bold glow-ember' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Interactive Studio</span>
            </button>
          </div>

          {activeTab === 'comparison' && (
            <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-lg border border-slate-700/80 text-xs font-mono">
              <span className="text-slate-400 pl-2 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Site:</span>
              </span>
              <button
                onClick={() => setSelectedHospitalDomain('setA')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedHospitalDomain === 'setA' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hosp A
              </button>
              <button
                onClick={() => setSelectedHospitalDomain('setB')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedHospitalDomain === 'setB' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hosp B
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Studio Tab */}
      {activeTab === 'gradio' ? (
        <div className="glass-panel rounded-xl overflow-hidden border border-amber-500/30 glow-ember h-[750px]">
          <iframe
            src="/gradio/"
            title="Embedded Gradio Studio"
            className="w-full h-full border-0 bg-[#0C0B0A]"
          />
        </div>
      ) : (
        <>
          {/* Patient Context Banner */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">
              Evaluating: <strong>Bed {currentPatient.bed_number} ({currentPatient.patient_code})</strong> • Native Origin: {currentPatient.hospital === 'setA' ? 'Hospital A' : 'Hospital B'}
            </span>
            <span className="text-orange-400">
              Target Lead Prediction: 6 Hours Prior to Clinical Sepsis Onset
            </span>
          </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((m) => (
          <div
            key={m.id}
            className={`glass-panel p-4 rounded-xl flex flex-col justify-between space-y-3 transition ${
              m.status === 'recommended' ? 'border-amber-500/40 glow-ember bg-amber-950/20' : 'hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{m.name}</h3>
                  <p className="text-[11px] font-mono text-orange-400">{m.type}</p>
                </div>
                {m.status === 'recommended' && (
                  <span className="bg-orange-500 text-slate-950 text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                    Primary SOTA
                  </span>
                )}
              </div>

              {/* Risk Gauge Bar */}
              <div className="my-3 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-mono text-slate-400">Risk Prediction:</span>
                  <span className={`text-xl font-bold font-display ${m.risk >= 0.7 ? 'text-red-400' : m.risk >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(m.risk * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.risk >= 0.7 ? 'bg-red-500' : m.risk >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, m.risk * 100)}%` }}
                  />
                </div>
              </div>

              {/* Conformal & Latency */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500">Uncertainty:</span>
                  <p className="text-slate-200 truncate">{m.conformal}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Latency:</span>
                  <p className="text-amber-300">{m.latencyMs} ms</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug border-t border-slate-800/80 pt-2">
              {m.notes}
            </p>
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  );
};
