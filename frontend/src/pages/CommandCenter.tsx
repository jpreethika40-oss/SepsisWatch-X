import React from 'react';
import { useStore } from '../store/useStore';
import { Patient, Alert } from '../types';
import { Ward3D } from '../components/3d/Ward3D';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BellRing, Clock, ShieldAlert, Cpu, ArrowUpRight, 
  AlertCircle, ChevronRight, CheckCircle2 
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const { patients, selectedPatientId, alerts, acknowledgeAlert } = useStore();
  const navigate = useNavigate();

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const criticalCount = patients.filter((p) => p.status === 'critical').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* 1. Live KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-amber-500/20 flex items-center justify-center text-orange-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Ward Occupancy</p>
            <p className="text-xl font-bold font-display text-slate-100">12 / 12 Beds</p>
            <p className="text-[10px] text-emerald-400 font-mono">100% Monitored</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 glow-crimson">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Critical At-Risk</p>
            <p className="text-xl font-bold font-display text-red-400">{criticalCount} Patients</p>
            <p className="text-[10px] text-red-300/80 font-mono">Bed {selectedPatient?.bed_number} High Alert</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#B8B0A4]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Mean Lead Time</p>
            <p className="text-xl font-bold font-display text-amber-300">4.8 Hours</p>
            <p className="text-[10px] text-slate-400 font-mono">Prior to clinical onset</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Alarm Budget Rate</p>
            <p className="text-xl font-bold font-display text-amber-300">0.92 / pt-day</p>
            <p className="text-[10px] text-emerald-400 font-mono">Fatigue Protected</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-amber-500/20 flex items-center justify-center text-orange-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">p95 Inference Latency</p>
            <p className="text-xl font-bold font-display text-amber-300">38.4 ms</p>
            <p className="text-[10px] text-emerald-400 font-mono">Target &lt;200ms</p>
          </div>
        </div>
      </div>

      {/* 2. Main Center Grid: 3D Ward Floorplan & Selected Bed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[480px]">
        {/* Left 2 Cols: 3D Ward Scene */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-3 flex flex-col">
          <div className="flex justify-between items-center mb-2 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Isometric 3D Ward Floorplan (12 Monitored ICU Pods)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Double-click any pod to open full EHR timeline
            </span>
          </div>
          <div className="flex-1 w-full h-[400px] lg:h-auto min-h-[380px] rounded-lg overflow-hidden">
            <Ward3D />
          </div>
        </div>

        {/* Right Col: Selected Bed Telemetry Card & Real-Time Alert Ticker */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Selected Bed Quick Telemetry */}
          <div className="glass-panel rounded-xl p-4 border-amber-500/30 glow-ember">
            <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold font-display text-slate-100">
                    Bed {selectedPatient?.bed_number}
                  </h3>
                  <span className="text-xs font-mono text-orange-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    {selectedPatient?.patient_code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedPatient?.hospital === 'setA' ? 'Hospital A (Emory)' : 'Hospital B (BIDMC)'} • Age {selectedPatient?.age} • {selectedPatient?.gender === 1 ? 'Male' : 'Female'}
                </p>
              </div>
              <button
                onClick={() => navigate('/patient')}
                className="flex items-center space-x-1 text-xs text-orange-400 hover:text-amber-300 font-mono bg-orange-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/30 transition hover:bg-orange-500/20"
              >
                <span>Full EHR</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Risk Meter */}
            <div className="my-3.5 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-slate-300">Calibrated Sepsis Risk:</span>
                <span className={`text-2xl font-bold font-display ${
                  selectedPatient?.risk >= 0.7 ? 'text-red-400' : selectedPatient?.risk >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {((selectedPatient?.risk || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    selectedPatient?.risk >= 0.7 ? 'bg-red-500' : selectedPatient?.risk >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(selectedPatient?.risk || 0) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Threshold: 45.0%</span>
                <span className={`px-1.5 py-0.2 rounded font-semibold ${
                  selectedPatient?.conformal_label === 'sepsis' 
                    ? 'bg-red-950 text-red-300' 
                    : selectedPatient?.conformal_label === 'uncertain'
                    ? 'bg-amber-950 text-amber-300'
                    : 'bg-emerald-950 text-emerald-300'
                }`}>
                  Conformal: {selectedPatient?.conformal_label.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Top Clinical Factors */}
            <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Top Driving Biomarkers (SHAP + IG)
              </span>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-mono">Heart Rate (Tachycardia)</span>
                  <span className="text-red-400 font-bold">+0.42</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-mono">Mean Arterial Pressure (MAP)</span>
                  <span className="text-red-400 font-bold">+0.31</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-mono">Lactate Clearance Rate</span>
                  <span className="text-amber-400 font-bold">+0.18</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Alert Ticker */}
          <div className="glass-panel rounded-xl p-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Live Alert Feed ({activeAlerts.length})</span>
              </span>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[11px] text-orange-400 hover:text-amber-300 font-mono"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[160px] flex-1">
              {activeAlerts.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-900/80 border border-red-500/30 p-2.5 rounded-lg flex items-start justify-between text-xs hover:border-red-500/50 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-400 font-mono">BED {a.bed_number}</span>
                      <span className="text-[10px] font-mono text-slate-400">{a.created_at}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                      {a.message}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(a.id)}
                    title="Acknowledge alert"
                    className="ml-2 text-slate-400 hover:text-emerald-400 p-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
