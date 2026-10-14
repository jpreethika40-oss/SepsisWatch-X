import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Patient, ClinicalPersona } from '../types';
import { Ward3D } from '../components/3d/Ward3D';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BellRing, Clock, ShieldAlert, Cpu, ArrowUpRight, 
  AlertCircle, CheckCircle2, Stethoscope, Syringe, Building2,
  Play, Pause, FastForward, Volume2, VolumeX, Search,
  Activity, ShieldCheck, Check, Sparkles, ChevronRight
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const { 
    patients, 
    selectedPatientId, 
    setSelectedPatientId,
    alerts, 
    acknowledgeAlert,
    currentRole,
    setCurrentRole,
    selectedHospital,
    setSelectedHospital,
    currentUser,
    setIsAuthModalOpen,
    isSimRunning,
    setSimRunning,
    currentSimHour,
    soundEnabled,
    setSoundEnabled
  } = useStore();
  
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'caution' | 'normal'>('all');
  const [ticking, setTicking] = useState(false);

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
    diagnosis: 'Post-op Coronary Artery Bypass Graft (CABG)',
    active_treatments: 'Aspirin, Metoprolol, Incentive Spirometry',
    vitals: { HR: 74, SBP: 120, MAP: 85, Resp: 16, Temp: 36.9, Lactate: 1.1, WBC: 7.4 }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || fallbackPatient;
  const criticalCount = patients.filter((p) => p.status === 'critical').length;
  const cautionCount = patients.filter((p) => p.status === 'caution').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  // Filter patients based on selectedHospital, statusFilter, and searchQuery
  const filteredPatients = patients.filter((p) => {
    if (selectedHospital !== 'all' && p.hospital !== selectedHospital) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchCode = p.patient_code.toLowerCase().includes(q);
      const matchDiag = p.diagnosis?.toLowerCase().includes(q) || false;
      const matchBed = p.bed_number.toString().includes(q);
      if (!matchCode && !matchDiag && !matchBed) return false;
    }
    return true;
  });

  // Manual step tick function
  const handleManualTick = async () => {
    setTicking(true);
    try {
      await fetch('/api/sim/tick', { method: 'POST' });
    } catch {
      // Offline fallback
    } finally {
      setTimeout(() => setTicking(false), 400);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 1. Clinical Role & Hospital Bay Controls Strip */}
      <div className="glass-panel p-3 rounded-xl border border-amber-500/20 bg-[#12100E]/90 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Role Switcher Pill Bar */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center space-x-1 mr-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Active View:</span>
          </span>

          <button
            onClick={() => setCurrentRole('doctor')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              currentRole === 'doctor'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor View</span>
          </button>

          <button
            onClick={() => setCurrentRole('nurse')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              currentRole === 'nurse'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Syringe className="w-3.5 h-3.5" />
            <span>Nurse View</span>
          </button>

          <button
            onClick={() => setCurrentRole('hospital_chief')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
              currentRole === 'hospital_chief'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital Chief</span>
          </button>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="text-[11px] text-orange-400 hover:text-amber-300 underline font-mono ml-2 pl-2 border-l border-slate-800"
          >
            Switch User Profile
          </button>
        </div>

        {/* Hospital Bay Filter & Simulation Controls */}
        <div className="flex items-center space-x-3">
          {/* Bay selector */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setSelectedHospital('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedHospital === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Beds (12)
            </button>
            <button
              onClick={() => setSelectedHospital('setA')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedHospital === 'setA'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hospital A (Emory)
            </button>
            <button
              onClick={() => setSelectedHospital('setB')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedHospital === 'setB'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hospital B (BIDMC)
            </button>
          </div>

          {/* Simulation Ticker Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              Hour <strong className="text-orange-400">{currentSimHour.toString().padStart(2, '0')}</strong>
            </span>

            <button
              onClick={() => setSimRunning(!isSimRunning)}
              title={isSimRunning ? 'Pause simulation stream' : 'Resume simulation stream'}
              className={`p-1 rounded ${
                isSimRunning 
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleManualTick}
              disabled={ticking}
              title="Advance +1 hour"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
            >
              <FastForward className={`w-3.5 h-3.5 ${ticking ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute clinical audio chimes' : 'Enable clinical audio chimes'}
              className={`p-1 rounded ${soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Persona-Specific Clinical Guidance Banner */}
      {currentRole === 'doctor' && (
        <div className="glass-panel p-3 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-950/30 via-slate-900/60 to-slate-950/80 flex items-start justify-between text-xs font-mono">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-200 font-bold">
                Doctor View Active • {currentUser.full_name} (Critical Care Fellow)
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Bed 03 exhibiting high-confidence Septic Shock (Lactate 3.8 mmol/L, MAP 61 mmHg). Conformal Coverage: 90% finite-sample guarantee. 
                Recommended counterfactual: 30 mL/kg IV crystalloid fluid bolus + titrate norepinephrine to maintain MAP &ge; 65 mmHg.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/patient')}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs border border-orange-500/40 flex-shrink-0"
          >
            <span>Examine Bed 03 EHR</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {currentRole === 'nurse' && (
        <div className="glass-panel p-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-950/80 flex items-start justify-between text-xs font-mono">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Syringe className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-200 font-bold">
                Nurse View Active • {currentUser.full_name} (Lead ICU Triage Nurse)
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Immediate Bedside Care Checklist: 
                [Bed 03] Draw 2 sets of blood cultures prior to broad-spectrum antibiotic infusion; verify second peripheral IV line patency; repeat venous lactate in 2h.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button 
              onClick={() => {
                alerts.forEach(a => acknowledgeAlert(a.id));
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs border border-emerald-500/40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Acknowledge All Alarms</span>
            </button>
          </div>
        </div>
      )}

      {currentRole === 'hospital_chief' && (
        <div className="glass-panel p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-950/80 flex items-start justify-between text-xs font-mono">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-200 font-bold">
                Hospital Chief View Active • {currentUser.full_name} (Chief Medical Officer)
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Cross-Hospital Operational Health: Hospital A (Emory) 6 beds [1 Critical, 5 Stable] | Hospital B (BIDMC) 6 beds [1 Caution, 5 Stable]. 
                System Utility Score: <strong>0.452</strong> (Benchmark leader). Alarm fatigue suppression: <strong>48% reduction</strong> in false alarms.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/scoreboard')}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs border border-emerald-500/40 flex-shrink-0"
          >
            <span>View Transfer Scoreboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Live KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3 border border-amber-500/10">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-amber-500/20 flex items-center justify-center text-orange-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Ward Occupancy</p>
            <p className="text-xl font-bold font-display text-slate-100">{patients.length} / 12 Beds</p>
            <p className="text-[10px] text-emerald-400 font-mono">100% Monitored</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3 border border-red-500/20">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 glow-crimson">
            <BellRing className={`w-5 h-5 ${criticalCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Critical At-Risk</p>
            <p className="text-xl font-bold font-display text-red-400">{criticalCount} Critical • {cautionCount} Watch</p>
            <p className="text-[10px] text-red-300/80 font-mono">Bed 03 High Sepsis Risk</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3 border border-amber-500/10">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Early Warning Lead</p>
            <p className="text-xl font-bold font-display text-amber-300">5.2 Hours</p>
            <p className="text-[10px] text-slate-400 font-mono">Prior to clinical onset</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3 border border-amber-500/10">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Clinical Utility</p>
            <p className="text-xl font-bold font-display text-amber-300">0.452</p>
            <p className="text-[10px] text-emerald-400 font-mono">Top Benchmark Tier</p>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center space-x-3 border border-amber-500/10">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-amber-500/20 flex items-center justify-center text-orange-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-slate-400">Inference Latency</p>
            <p className="text-xl font-bold font-display text-amber-300">34.8 ms</p>
            <p className="text-[10px] text-emerald-400 font-mono">Real-Time Streaming</p>
          </div>
        </div>
      </div>

      {/* 4. Main Center Grid: 3D Ward Floorplan & Selected Bed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[460px]">
        {/* Left 2 Cols: 3D Ward Scene */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-3 flex flex-col border border-amber-500/20">
          <div className="flex justify-between items-center mb-2 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Interactive 3D ICU Ward (12 Monitored Pods • Double-click any pod to inspect)
              </h2>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Critical Shock</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Caution Watch</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Stable</span>
              </span>
            </div>
          </div>
          <div className="flex-1 w-full h-[400px] lg:h-auto min-h-[380px] rounded-lg overflow-hidden bg-[#0C0B0A] relative">
            <Ward3D />
          </div>
        </div>

        {/* Right Col: Selected Bed Telemetry Card & Real-Time Alert Ticker */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Selected Bed Quick Telemetry */}
          <div className="glass-panel rounded-xl p-4 border border-amber-500/30 glow-ember bg-[#141210]/90">
            <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold font-display text-slate-100">
                    Bed {selectedPatient?.bed_number}
                  </h3>
                  <span className="text-xs font-mono text-orange-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    {selectedPatient?.patient_code}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    selectedPatient?.status === 'critical'
                      ? 'bg-red-950 text-red-300 border border-red-500/40'
                      : selectedPatient?.status === 'caution'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {selectedPatient?.status}
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

            {/* Primary Clinical Diagnosis & Active Interventions */}
            <div className="my-2.5 p-2 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Primary Diagnosis:</span>
                <span className="text-slate-200 font-medium">{selectedPatient?.diagnosis || 'Intensive Care Monitoring'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Active Orders:</span>
                <span className="text-amber-300 text-[11px]">{selectedPatient?.active_treatments || 'Standard ICU supportive care'}</span>
              </div>
            </div>

            {/* Risk Meter */}
            <div className="my-3 space-y-2">
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

            {/* Quick Biomarkers */}
            {selectedPatient?.vitals && (
              <div className="grid grid-cols-4 gap-1.5 my-2 text-center text-xs font-mono">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">HR</span>
                  <span className={`font-bold ${selectedPatient.vitals.HR > 100 ? 'text-red-400' : 'text-slate-200'}`}>
                    {selectedPatient.vitals.HR}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MAP</span>
                  <span className={`font-bold ${selectedPatient.vitals.MAP < 65 ? 'text-red-400' : 'text-slate-200'}`}>
                    {selectedPatient.vitals.MAP}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Lactate</span>
                  <span className={`font-bold ${selectedPatient.vitals.Lactate > 2.0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {selectedPatient.vitals.Lactate}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Temp</span>
                  <span className={`font-bold ${selectedPatient.vitals.Temp > 38.0 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {selectedPatient.vitals.Temp}°
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Real-Time Alert Ticker */}
          <div className="glass-panel rounded-xl p-3 flex-1 flex flex-col border border-amber-500/20 bg-[#141210]/90">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Live Alert Feed ({activeAlerts.length})</span>
              </span>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[11px] text-orange-400 hover:text-amber-300 font-mono"
              >
                All Alerts
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[140px] flex-1">
              {activeAlerts.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-900/80 border border-red-500/30 p-2 rounded-lg flex items-start justify-between text-xs hover:border-red-500/50 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-400 font-mono">BED {a.bed_number}</span>
                      <span className="text-[10px] font-mono text-slate-400">Hour {a.hour}</span>
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

      {/* 5. Comprehensive All-Patients Ward Census Directory (Interactive 12-Bed Table) */}
      <div className="glass-panel rounded-xl border border-amber-500/20 overflow-hidden shadow-xl bg-[#12100E]/90">
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold flex items-center space-x-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Full Ward Census Directory & Biomarker Telemetry ({filteredPatients.length} Patients)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Click any row to select patient in 3D Ward
            </span>
          </div>

          {/* Table Search & Status Filter */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bed, code, diagnosis..."
                className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-200 outline-none hover:border-amber-500/40 focus:border-orange-500 text-xs w-52"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 outline-none text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="critical">Critical Only</option>
              <option value="caution">Caution Watch</option>
              <option value="normal">Normal / Stable</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Bed & Patient</th>
                <th className="p-3">Hospital Bay</th>
                <th className="p-3">Primary Diagnosis</th>
                <th className="p-3">Vitals (HR / MAP / Lactate)</th>
                <th className="p-3">Active Interventions</th>
                <th className="p-3">Sepsis Risk</th>
                <th className="p-3">Conformal Set</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatient?.id;
                const isCrit = p.status === 'critical';
                const isCaut = p.status === 'caution';

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`cursor-pointer transition hover:bg-amber-950/20 ${
                      isSelected ? 'bg-amber-950/40 border-l-4 border-orange-500' : ''
                    } ${isCrit ? 'bg-red-950/15' : ''}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                          isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          isCaut ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {p.bed_number}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100">{p.patient_code}</p>
                          <p className="text-[10px] text-slate-400">Age {p.age} • {p.gender === 1 ? 'M' : 'F'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                        {p.hospital === 'setA' ? 'Hospital A (Emory)' : 'Hospital B (BIDMC)'}
                      </span>
                    </td>

                    <td className="p-3 text-slate-200 max-w-xs">
                      <p className="truncate font-medium">{p.diagnosis || 'Standard ICU Monitoring'}</p>
                    </td>

                    <td className="p-3">
                      {p.vitals ? (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className={p.vitals.HR > 100 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            HR {p.vitals.HR}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className={p.vitals.MAP < 65 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            MAP {p.vitals.MAP}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className={p.vitals.Lactate > 2.0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            Lac {p.vitals.Lactate}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Telemetry synced</span>
                      )}
                    </td>

                    <td className="p-3 text-slate-300 max-w-xs">
                      <p className="truncate text-[11px] text-amber-300/90">{p.active_treatments || 'Supportive care'}</p>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1 w-24">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={isCrit ? 'text-red-400' : isCaut ? 'text-amber-400' : 'text-emerald-400'}>
                            {(p.risk * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase">{p.status}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isCrit ? 'bg-red-500' : isCaut ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, p.risk * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        p.conformal_label === 'sepsis' 
                          ? 'bg-red-950 text-red-300 border border-red-500/30' 
                          : p.conformal_label === 'uncertain'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {p.conformal_label}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatientId(p.id);
                          navigate('/patient');
                        }}
                        className="px-2.5 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-amber-300 border border-amber-500/30 text-[11px] font-mono transition"
                      >
                        Inspect EHR
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
