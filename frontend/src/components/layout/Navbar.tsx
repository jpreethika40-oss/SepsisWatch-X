import React from 'react';
import { useStore } from '../../store/useStore';
import { 
  Play, Pause, RotateCcw, FastForward, Volume2, VolumeX, 
  Layers, Box, AlertTriangle, Activity, Search, Zap
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    isSyntheticData, isSimRunning, setSimRunning, simSpeed, setSimSpeed, 
    currentSimHour, setCurrentSimHour, is2DMode, setIs2DMode, 
    soundEnabled, setSoundEnabled, wsStatus, setCommandPaletteOpen,
    driftInjected, setDriftInjected
  } = useStore();

  const toggleSimulation = () => setSimRunning(!isSimRunning);

  return (
    <header className="sticky top-0 z-50 flex flex-col w-full border-b border-amber-500/20 bg-[#151311]/90 backdrop-blur-md">
      {/* 1. Mandatory Persistent Banner when Synthetic Data is in use */}
      {isSyntheticData && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <span className="font-medium tracking-wide">
              SYNTHETIC DATASET ACTIVE — PhysioNet 2019 Coupled Dynamics (Hospital A & B). For offline testing & evaluation only.
            </span>
          </div>
          <span className="hidden md:inline bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-500/20">
            Benchmark Evaluation: Synthetic Telemetry Active
          </span>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
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
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-[#A09689] font-mono">
                ICU Ward Early-Warning • 12 Beds Active
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
            onClick={() => setCurrentSimHour(currentSimHour + 1)}
            title="Step 1 hour forward"
            className="p-1.5 text-[#F3EEE8] hover:text-orange-400 hover:bg-[#332E29] rounded transition"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCurrentSimHour(1)}
            title="Reset simulation hour"
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

        {/* Right: View Toggles & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E1B18]/60 border border-[#332E29] text-xs text-[#A09689] hover:text-[#F3EEE8] hover:border-amber-500/30 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px]">Command (Ctrl+K)</span>
          </button>

          {/* 2D / 3D Mode Toggle (Low-power fallback) */}
          <button
            onClick={() => setIs2DMode(!is2DMode)}
            title={is2DMode ? "Switch to High-Fidelity 3D View" : "Switch to Low-Power 2D Mode"}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
              is2DMode
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-orange-950/40 border-orange-500/40 text-orange-300'
            }`}
          >
            {is2DMode ? <Layers className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{is2DMode ? '2D Mode' : '3D Mode'}</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute audio alarms" : "Enable clinical audio alarms"}
            className={`p-2 rounded-lg border text-xs transition ${
              soundEnabled
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-[#151311] border-[#332E29] text-[#A09689] hover:text-[#F3EEE8]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* User Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#332E29]">
            <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">
              SC
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-medium text-[#F3EEE8] leading-tight">Dr. Connor</p>
              <p className="text-[10px] text-orange-400 font-mono leading-tight">Admin / Chief</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
