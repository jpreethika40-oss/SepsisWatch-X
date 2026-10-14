import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Play, Pause, RotateCcw, FastForward, Volume2, VolumeX, Volume1,
  Layers, Box, Activity, Zap, Bot,
  Sparkles, Stethoscope, HeartPulse, Building2, LogOut, Check,
  Bell, X, AlertCircle
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
    currentUser, setIsAuthModalOpen, logout,
    alerts, escalations, unreadAlertCount, lastAckNotice, setLastAckNotice
  } = useStore();

  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);
  const [currentVol, setCurrentVol] = useState<number>(audioAlertService.getVolume());

  const pendingEscalations = escalations.filter(e => e.status === 'pending');

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

      // Dynamic Markov transition: any bed can stochastically deteriorate or stabilize
      if (p.risk >= 0.70) {
        // High risk / septic bed: resuscitation may take effect or vitals stay critical
        const isRecovering = Math.random() < 0.35;
        if (isRecovering) {
          newRisk = Math.max(0.40, p.risk - (0.04 + Math.random() * 0.05));
          newVitals.HR = Math.max(85, (newVitals.HR || 115) - (3 + Math.random() * 4));
          newVitals.MAP = Math.min(75, (newVitals.MAP || 58) + (2 + Math.random() * 4));
        } else {
          newRisk = Math.min(0.96, p.risk + (Math.random() * 0.02 - 0.01));
          newVitals.HR = Math.min(142, Math.max(105, (newVitals.HR || 115) + (Math.random() * 4 - 2)));
          newVitals.MAP = Math.max(50, Math.min(65, (newVitals.MAP || 58) - (Math.random() * 2 - 1)));
        }
      } else if (p.risk >= 0.40) {
        // Moderate / caution bed: may escalate into severe sepsis (40%) or settle down (60%)
        if (Math.random() < 0.40) {
          newRisk = Math.min(0.88, p.risk + (0.06 + Math.random() * 0.06));
          newVitals.HR = Math.min(130, (newVitals.HR || 98) + (4 + Math.random() * 4));
          newVitals.MAP = Math.max(54, (newVitals.MAP || 66) - (3 + Math.random() * 3));
        } else {
          newRisk = Math.max(0.20, p.risk - (0.03 + Math.random() * 0.04));
          newVitals.HR = Math.max(78, (newVitals.HR || 98) - (2 + Math.random() * 3));
          newVitals.MAP = Math.min(78, (newVitals.MAP || 66) + (2 + Math.random() * 3));
        }
      } else {
        // Stable bed: small chance (~7%) of starting acute decompensation, otherwise stable walk
        if (Math.random() < 0.07) {
          newRisk = Math.min(0.62, p.risk + (0.15 + Math.random() * 0.10));
          newVitals.HR = (newVitals.HR || 76) + (10 + Math.random() * 8);
          newVitals.MAP = (newVitals.MAP || 82) - (8 + Math.random() * 6);
          newVitals.Lactate = Number(((newVitals.Lactate || 1.1) + 0.8).toFixed(1));
        } else {
          newRisk = Math.min(0.35, Math.max(0.06, p.risk + (Math.random() * 0.03 - 0.015)));
          newVitals.HR = Math.min(92, Math.max(62, (newVitals.HR || 76) + (Math.random() * 3 - 1.5)));
          newVitals.MAP = Math.min(95, Math.max(72, (newVitals.MAP || 82) + (Math.random() * 3 - 1.5)));
        }
      }

      const conf = newRisk >= 0.70 ? 'sepsis' : newRisk >= 0.40 ? 'uncertain' : 'no_sepsis';
      store.updatePatientRisk(p.id, Number(newRisk.toFixed(2)), nextHour, conf, newVitals);

      // Generate critical alert and clinical notification if patient deteriorates to severe sepsis risk
      if (newRisk >= 0.70) {
        const hasExisting = store.alerts.some(a => a.bed_number === p.bed_number && a.status === 'active');
        if (!hasExisting) {
          store.addAlert({
            id: Date.now() + p.id,
            patient_id: p.id,
            patient_code: p.patient_code,
            bed_number: p.bed_number,
            hour: nextHour,
            severity: 'critical',
            risk_score: newRisk,
            status: 'active',
            lead_time_hours: 5.2,
            message: `Bed ${p.bed_number} (${p.patient_code}) acute sepsis alert: risk elevated to ${(newRisk * 100).toFixed(0)}%.`,
            created_at: 'Just now'
          });
          audioAlertService.playCriticalAlarm(`crit-bed-${p.bed_number}`);
          store.setLastAckNotice(`🚨 Critical Alarm: Bed ${p.bed_number} (${p.patient_code}) acute sepsis risk ${(newRisk * 100).toFixed(0)}%!`);
        }
      }
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
      {/* Real-time Global Clinical Alert Notification Toast */}
      {lastAckNotice && (
        <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 border-b border-amber-500/50 px-4 py-2 flex items-center justify-between text-xs font-mono text-amber-200 animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce flex-shrink-0" />
            <span className="font-semibold text-white">{lastAckNotice}</span>
          </div>
          <button
            onClick={() => setLastAckNotice(null)}
            className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

          {/* Hospital Bay Filter: Emory (A) vs BIDMC (B) */}
          <div className="flex items-center space-x-1 bg-[#1E1B18] p-1 rounded-lg border border-[#332E29] text-[11px] font-mono shadow-sm">
            <span className="text-[10px] text-stone-500 uppercase px-1 font-semibold hidden md:inline">
              Site:
            </span>
            <button
              type="button"
              onClick={() => setSelectedHospital('all')}
              title="View all 12 ICU beds across both Emory and BIDMC bays"
              className={`px-2 py-0.5 rounded transition font-medium ${
                selectedHospital === 'all'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              All Bays (12)
            </button>
            <button
              type="button"
              onClick={() => setSelectedHospital('setA')}
              title="Hospital A: Emory University Hospital Bay (Beds 1-6, Medical/Surgical ICU)"
              className={`px-2 py-0.5 rounded transition font-medium flex items-center space-x-1 ${
                selectedHospital === 'setA'
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40 font-bold'
                  : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              <span>Hosp A (Emory)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedHospital('setB')}
              title="Hospital B: Beth Israel Deaconess Medical Center Bay (Beds 7-12, Trauma/Cardiac ICU, Domain Adaptation Active)"
              className={`px-2 py-0.5 rounded transition font-medium flex items-center space-x-1 ${
                selectedHospital === 'setB'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-[#A09689] hover:text-[#F3EEE8]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              <span>Hosp B (BIDMC)</span>
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

          {/* Real-time Notification Bell Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              title="ICU Sepsis Notifications & Escalation Queue"
              className="relative p-1.5 rounded-lg bg-[#1E1B18] border border-[#332E29] hover:border-amber-500/50 text-stone-300 hover:text-white transition flex items-center justify-center cursor-pointer"
            >
              <Bell className={`w-4 h-4 ${(unreadAlertCount > 0 || pendingEscalations.length > 0) ? 'text-amber-400 animate-bounce' : 'text-stone-400'}`} />
              {(unreadAlertCount > 0 || pendingEscalations.length > 0) && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-mono font-bold rounded-full animate-pulse shadow-sm shadow-red-900">
                  {unreadAlertCount + pendingEscalations.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-stone-800 bg-[#161412] shadow-2xl z-50 p-4 space-y-3 font-mono text-xs animate-fade-in">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-white font-display">ICU Clinical Notifications</span>
                  </div>
                  <button
                    onClick={() => setShowNotificationMenu(false)}
                    className="text-stone-400 hover:text-white p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Nurse Escalations Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                    <span>Nurse Escalations</span>
                    <span className="text-amber-400">{pendingEscalations.length} Pending</span>
                  </div>

                  {pendingEscalations.length === 0 ? (
                    <div className="p-2.5 rounded bg-stone-900/60 text-stone-400 text-[11px]">
                      Zero pending nurse escalations.
                    </div>
                  ) : (
                    pendingEscalations.slice(0, 3).map((esc) => (
                      <div key={esc.id} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">Bed {esc.bed_number} ({esc.patient_code})</span>
                          <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-bold uppercase">
                            {esc.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 leading-snug">
                          {esc.notes}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          By {esc.nurse_name} • {esc.created_at}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Active Alerts Section */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                    <span>Active Telemetry Alarms</span>
                    <span className="text-red-400">{alerts.filter(a => a.status === 'active').length} Active</span>
                  </div>

                  {alerts.filter(a => a.status === 'active').slice(0, 3).map((a) => (
                    <div key={a.id} className="p-2 rounded-lg bg-red-950/20 border border-red-500/30 text-[11px] text-stone-300">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>Bed {a.bed_number}</span>
                        <span className="text-red-400">{(a.risk_score * 100).toFixed(0)}% Risk</span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 truncate">{a.message}</p>
                    </div>
                  ))}
                </div>

                {/* Navigation Link */}
                <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-[11px]">
                  <span className="text-stone-500">Role: {currentRole}</span>
                  {currentRole === 'doctor' ? (
                    <NavLink
                      to="/doctor"
                      onClick={() => setShowNotificationMenu(false)}
                      className="text-orange-400 hover:text-orange-300 font-bold"
                    >
                      Open Doctor Queue &rarr;
                    </NavLink>
                  ) : (
                    <NavLink
                      to="/nurse"
                      onClick={() => setShowNotificationMenu(false)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      Open Nurse Triage &rarr;
                    </NavLink>
                  )}
                </div>
              </div>
            )}
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
