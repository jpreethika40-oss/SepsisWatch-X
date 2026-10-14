import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ClinicalPersona, UserRole } from '../../types';
import { 
  X, UserCheck, Shield, Stethoscope, HeartPulse, Building2, 
  CheckCircle2, KeyRound, Lock, ArrowRight, Sparkles 
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, setIsAuthModalOpen, currentRole, setCurrentRole,
    currentUser, setCurrentUser 
  } = useStore();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  if (!isAuthModalOpen) return null;

  const profiles: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    persona: ClinicalPersona;
    title: string;
    dept: string;
    hospital: string;
    icon: React.ElementType;
    badgeColor: string;
    accentColor: string;
    description: string;
  }[] = [
    {
      id: 1,
      name: 'Dr. Sarah Connor, MD',
      email: 'dr.connor@icu.org',
      role: 'clinician',
      persona: 'doctor',
      title: 'Attending Intensivist',
      dept: 'Critical Care Medicine',
      hospital: 'Hospital A (Emory ICU)',
      icon: Stethoscope,
      badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      accentColor: 'border-orange-500/50 glow-ember',
      description: 'Physician diagnosis mode: Biomarker decay trends, SHAP attribution, antibiotic stewardship & vasopressor what-if simulation.'
    },
    {
      id: 2,
      name: 'Nurse Alex Reed, BSN, CCRN',
      email: 'nurse.reed@icu.org',
      role: 'clinician',
      persona: 'nurse',
      title: 'ICU Charge Nurse',
      dept: 'Critical Care Nursing Unit',
      hospital: 'Hospital B (BIDMC ICU)',
      icon: HeartPulse,
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-500/40',
      accentColor: 'border-emerald-500/50 glow-emerald',
      description: 'Bedside nurse workflow: High-contrast urgent triage, alarm acknowledgement checklists, and infusion rate monitors.'
    },
    {
      id: 3,
      name: 'Dr. Marcus Wright, MD, MBA',
      email: 'admin@hospital.org',
      role: 'admin',
      persona: 'hospital_chief',
      title: 'ICU Medical Director / Chief',
      dept: 'Health System Executive Governance',
      hospital: 'Cross-Hospital Network (Emory + BIDMC)',
      icon: Building2,
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-500/40',
      accentColor: 'border-amber-500/50 glow-amber',
      description: 'Executive leadership view: Ward capacity census, cross-site transfer drift, clinical utility score, and alarm budget compliance.'
    }
  ];

  const handleSelectProfile = (p: typeof profiles[0]) => {
    setCurrentUser({
      id: p.id,
      email: p.email,
      role: p.role,
      full_name: p.name,
    });
    setCurrentRole(p.persona);
    setIsAuthModalOpen(false);
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      id: 99,
      email: emailInput || 'custom.clinician@sepsiswatch.org',
      role: 'clinician',
      full_name: emailInput ? emailInput.split('@')[0] : 'Dr. Guest Clinician',
    });
    setCurrentRole('doctor');
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-amber-500/30 glow-ember p-6 space-y-6 bg-[#12100E]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#332E29] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-ember">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-[#F3EEE8] flex items-center space-x-2">
                <span>Clinical Role Authentication & Persona Switcher</span>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-500/30">
                  HIPAA Role-Based Access
                </span>
              </h2>
              <p className="text-xs text-[#A09689] font-mono mt-0.5">
                Switch perspective to see how SepsisWatch-X adapts its 3D visualization for Doctors, Nurses, and Hospital Chiefs.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 text-[#A09689] hover:text-[#F3EEE8] rounded-lg hover:bg-[#1E1B18] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Role Profiles */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#A09689] font-semibold flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-orange-400" />
            <span>Select Clinical Role Persona (Instant 1-Click Switch)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {profiles.map((p) => {
              const Icon = p.icon;
              const isCurrent = currentRole === p.persona && currentUser.email === p.email;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 bg-[#171513] hover:border-amber-500/50 ${
                    isCurrent ? `${p.accentColor} bg-[#1E1B18]` : 'border-[#332E29]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="w-9 h-9 rounded-lg bg-[#24201C] flex items-center justify-center text-amber-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${p.badgeColor}`}>
                        {p.persona.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#F3EEE8]">{p.name}</h4>
                      <p className="text-xs text-orange-400 font-mono">{p.title}</p>
                      <p className="text-[11px] text-[#A09689] mt-0.5">{p.hospital}</p>
                    </div>

                    <p className="text-[11px] text-[#B8B0A4] leading-relaxed pt-1 border-t border-[#292521]">
                      {p.description}
                    </p>
                  </div>

                  <button
                    className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1 transition ${
                      isCurrent
                        ? 'bg-orange-500 text-[#0C0B0A]'
                        : 'bg-[#24201C] text-[#F3EEE8] hover:bg-orange-500/20 hover:text-orange-300'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Session</span>
                      </>
                    ) : (
                      <>
                        <span>Switch to View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Credential Sign-In Fallback */}
        <div className="border-t border-[#332E29] pt-4">
          <form onSubmit={handleCustomLogin} className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <KeyRound className="w-4 h-4 text-[#A09689] absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="Institutional EMR Email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#171513] border border-[#332E29] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F3EEE8] outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            <div className="flex-1 min-w-[160px] relative">
              <Lock className="w-4 h-4 text-[#A09689] absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="Password / Badge PIN..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#171513] border border-[#332E29] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F3EEE8] outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-mono font-bold hover:bg-orange-500/30 transition flex items-center space-x-1.5"
            >
              <span>Sign In</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
