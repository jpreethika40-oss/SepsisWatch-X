import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Play, Pause, RotateCcw, FastForward, Volume2, VolumeX, Volume1,
  Layers, Box, Activity, Zap, Bot,
  Sparkles, Stethoscope, HeartPulse, Building2, LogOut, Check
} from 'lucide-react';
import { audioAlertService } from '../../services/audioAlertService';

export const Navbar: React.FC = () => {
  const { 
    isSimRunning, setSimRunning, simSpeed, setSimSpeed, 
    currentSimHour, setCurrentSimHour, is2DMode, setIs2DMode, 
    soundEnabled, setSoundEnabled, wsStatus,
    driftInjected, setDriftInjected,
    currentRole, setCurrentRole,
    selectedHospital, setSelectedHospital,
    currentUser, setIsAuthModalOpen, logout
  } = useStore();

  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [currentVol, setCurrentVol] = useState<number>(audioAlertService.getVolume());

  const toggleSimulation = async () => {
    const next = !isSimRunning;
    setSimRunning(next);
    try {
      await fetch('/api/sim/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_running: next, speed: simSpeed })
      });
    } catch (e) {
      console.warn('[Navbar] Sim control call handled with local state:', e);
    }
  };

  const handleStepForward = async () => {
    try {
      const res = await fetch('/api/sim/tick', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.tick) setCurrentSimHour(data.tick);
        return;
      }
    } catch {
      // Offline / Static Space stepping
    }

    const nextHour = currentSimHour + 1;
    setCurrentSimHour(nextHour);
    const store = useStore.getState();
    store.patients.forEach((p) => {
      let newRisk = p.risk;
      const newVitals = { ...(p.vitals || {}) };

      if (p.bed_number === 3) {
        newRisk = Math.min(0.96, Math.max(0.70, p.risk + (Math.random() * 0.04 - 0.01)));
        newVitals.HR = Math.min(138, Math.max(105, (newVitals.HR || 112) + (Math.random() * 4 - 1.5)));
        newVitals.MAP = Math.max(52, Math.min(64, (newVitals.MAP || 58) - (Math.random() * 3 - 1)));
      } else if (p.bed_number === 7) {
        newRisk = Math.min(0.65, Math.max(0.45, p.risk + (Math.random() * 0.03 - 0.015)));
        newVitals.HR = Math.min(108, Math.max(88, (newVitals.HR || 94) + (Math.random() * 3 - 1.5)));
        newVitals.MAP = Math.min(74, Math.max(62, (newVitals.MAP || 67) + (Math.random() * 3 - 2)));
      } else {
        newRisk = Math.min(0.32, Math.max(0.06, p.risk + (Math.random() * 0.02 - 0.01)));
      }
      const conf = newRisk >= 0.70 ? 'sepsis' : newRisk >= 0.40 ? 'uncertain' : 'no_sepsis';
      store.updatePatientRisk(p.id, Number(newRisk.toFixed(2)), nextHour, conf, newVitals);
    });
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/sim/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.tick) setCurrentSimHour(data.tick);
        setSimRunning(false);
      }
    } catch {
      setCurrentSimHour(1);
      setSimRunning(false);
    }
  };

  const handleTestSound = async () => {
    const result = await audioAlertService.playTestSound();
    setTestNotice(result.message);
    setTimeout(() => setTestNotice(null), 3000);
  };

  const handleVolumeChange = (vol: number) => {
    audioAlertService.setVolume(vol);
    setCurrentVol(vol);
  };

  return (
    <header className="sticky top-0 z-50 flex flex-col w-full border-b border-amber-500/20 bg-[#151311]/90 backdrop-blur-md">
      {/* Test Notice Toast */}
      {testNotice && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-amber-200">
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-amber-400" />
            <span>{testNotice}</span>
          </div>
          <span className="text-[10px] text-amber-400/80">Web Audio API Active</span>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="flex items-center justify-between px-3 py-2 gap-2 overflow-x-auto min-w-0">
        {/* Left: Branding & Ward Telemetry Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center glow-ember">
              <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display font-bold text-base tracking-wider text-[#F3EEE8] uppercase">
                  SepsisWatch<span className="text-orange-500">-X</span>
                </h1>
                <span className="bg-amber-950/80 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
                  Dual-Hospital ICU
                </span>
              </div>
              <p className="text-[11px] text-[#A09689] font-mono">
                Intelligent Early-Warning • 12 Active Beds
              </p>
            </div>
          </div>

          {/* WebSocket Live Stream Indicator */}
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-[#332E29]">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-xs font-mono text-[#F3EEE8]">
              {wsStatus === 'connected' ? `STREAM ACTIVE (Hour ${currentSimHour})` : 'RECONNECTING...'}
            </span>
          </div>
        </div>

        {/* Center: Simulator Replay Controls */}
        <div className="flex items-center space-x-2 bg-[#1E1B18]/80 px-3 py-1.5 rounded-lg border border-[#332E29]">
          <button
            onClick={toggleSimulation}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition ${
              isSimRunning 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' 
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 glow-ember'
            }`}
          >
            {isSimRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Ward</span>
              </>
            )}
          </button>

          <button
            onClick={handleStepForward}
            title="Step 1 hour forward"
            className="p-1.5 text-[#F3EEE8] hover:text-orange-400 hover:bg-[#332E29] rounded transition"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            title="Reset simulation to Hour 1"
            className="p-1.5 text-[#F3EEE8] hover:text-orange-400 hover:bg-[#332E29] rounded transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center space-x-1 pl-2 border-l border-[#332E29] text-xs">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  simSpeed === spd 
                    ? 'bg-orange-500 text-[#0C0B0A] font-bold' 
                    : 'text-[#A09689] hover:text-[#F3EEE8]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Drift Shift Injector */}
          <button
            onClick={() => setDriftInjected(!driftInjected)}
            title="Simulate cross-hospital domain shift or sensor calibration drift"
            className={`ml-2 px-2 py-1 rounded text-[11px] font-mono flex items-center space-x-1 border transition ${
              driftInjected 
                ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse' 
                : 'bg-[#151311] border-[#332E29] text-[#F3EEE8] hover:border-orange-500/40'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{driftInjected ? 'Shift Injected' : 'Inject Shift'}</span>
          </button>
        </div>

        {/* Right: View Toggles, Audio Controls & Profile */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
          {/* ML Studio Launcher (Doctor only) */}
          {currentRole === 'doctor' && (
            <NavLink
              to="/gradio-studio"
              className={({ isActive }) =>
                `hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
                  isActive
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 glow-ember'
                    : 'bg-[#1E1B18]/60 border-[#332E29] text-[#A09689] hover:text-[#F3EEE8] hover:border-amber-500/30'
                }`
              }
              title="Interactive ML Inference & Conformal Studio"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px]">ML Studio</span>
            </NavLink>
          )}

          {/* AI Assistant Launcher */}
          <NavLink
            to="/assistant"
            className={({ isActive }) =>
              `hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 glow-ember'
                  : 'bg-[#1E1B18]/60 border-[#332E29] text-[#A09689] hover:text-[#F3EEE8] hover:border-amber-500/30'
              }`
            }
            title="SepsisWatch-X Clinical AI Assistant"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">AI Assistant</span>
          </NavLink>

          {/* Active Role Indicator (Locked) */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono bg-[#1E1B18] border-[#332E29]">
            {currentRole === 'doctor' && (
              <span className="flex items-center space-x-1 text-orange-400 font-semibold">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Workspace</span>
              </span>
            )}
            {currentRole === 'nurse' && (
              <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Nurse Bedside</span>
              </span>
            )}
            {currentRole === 'hospital_chief' && (
              <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>Chief Executive</span>
              </span>
            )}
          </div>

          {/* Hospital Bay Filter */}
          <div className="hidden 2xl:flex items-center space-x-1 bg-[#1E1B18] p-1 rounded-lg border border-[#332E29] text-[11px] font-mono">
            <button
              onClick={() => setSelectedHospital('all')}
              className={`px-2 py-0.5 rounded transition ${
                selectedHospital === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              All Beds
            </button>
            <button
              onClick={() => setSelectedHospital('setA')}
              className={`px-2 py-0.5 rounded transition ${
                selectedHospital === 'setA' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              Hospital A
            </button>
            <button
              onClick={() => setSelectedHospital('setB')}
              className={`px-2 py-0.5 rounded transition ${
                selectedHospital === 'setB' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              Hospital B
            </button>
          </div>

          {/* 2D / 3D Mode Toggle Button */}
          <button
            onClick={() => setIs2DMode(!is2DMode)}
            title={is2DMode ? "Switch to High-Fidelity 3D View" : "Switch to Low-Power 2D Mode"}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
              !is2DMode
                ? 'bg-orange-500/30 border-orange-500/50 text-orange-300 glow-ember shadow-sm'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            {is2DMode ? <Layers className="w-3.5 h-3.5 text-amber-400" /> : <Box className="w-3.5 h-3.5 text-orange-400 animate-pulse" />}
            <span>{is2DMode ? '2D View' : '3D View'}</span>
          </button>

          {/* Audible Alert Suite */}
          <div className="flex items-center space-x-1 bg-[#1E1B18] p-1 rounded-lg border border-[#332E29]">
            {/* Test Sound Button */}
            <button
              onClick={handleTestSound}
              title="Test clinical warning & alarm sound synthesis"
              className="flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-mono text-stone-300 hover:text-amber-300 hover:bg-stone-800/60 transition"
            >
              <Volume1 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Sound</span>
            </button>

            {/* Mute/Unmute Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                audioAlertService.setEnabled(next);
              }}
              title={soundEnabled ? "Mute clinical audio alarms" : "Unmute and activate clinical audio alarms"}
              className={`p-1.5 rounded text-xs transition ${
                soundEnabled
                  ? 'bg-emerald-950/80 text-emerald-300'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            </button>
          </div>

          {/* User Profile & Un-Clipped Red Logout Button */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#332E29] flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">
              {currentUser.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : (currentRole === 'nurse' ? 'RN' : currentRole === 'doctor' ? 'DR' : 'CM')}
            </div>
            <div className="hidden 2xl:block text-left">
              <p className="text-xs font-medium text-[#F3EEE8] leading-tight truncate max-w-[120px]">
                {currentUser.full_name || (currentRole === 'nurse' ? 'RN Alex Reed' : 'Dr. Connor')}
              </p>
              <p className="text-[10px] text-orange-400 font-mono leading-tight uppercase">
                {currentRole === 'doctor' ? 'Attending MD' : currentRole === 'nurse' ? 'Charge Nurse' : 'Chief Medical'}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              title="Logout from ICU Workspace to switch clinical role"
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 border border-red-400 text-white font-mono text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-red-950/60 cursor-pointer flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
