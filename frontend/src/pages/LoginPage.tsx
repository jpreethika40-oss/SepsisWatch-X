import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Shield, Stethoscope, ClipboardList, Lock, Mail, ArrowRight, 
  Activity, CheckCircle2, Server, Database
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ClinicalPersona, User } from '../types';

// 3D Animated Biological Helix / Molecular Core
const BioHelixScene: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.15;
      pointsRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = -t * 0.2;
    }
  });

  // Generate double-helix particle coordinates
  const particleCount = 180;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color('#F97316'); // Ember
  const color2 = new THREE.Color('#FBBF24'); // Gold
  const color3 = new THREE.Color('#10B981'); // Sage / Emerald

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / 15) * Math.PI;
    const radius = 3.2;
    const strand = i % 2 === 0 ? 1 : -1;
    const y = (i - particleCount / 2) * 0.08;

    positions[i * 3] = Math.cos(angle) * radius * strand;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius * strand;

    const lerpColor = strand === 1 ? color1 : (i % 3 === 0 ? color3 : color2);
    colors[i * 3] = lerpColor.r;
    colors[i * 3 + 1] = lerpColor.g;
    colors[i * 3 + 2] = lerpColor.b;
  }

  return (
    <group>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
      <pointLight position={[-10, -10, -10]} intensity={1.2} color="#F97316" />

      {/* Rotating Floating Bio Helix */}
      <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
        <group ref={meshRef}>
          {/* Central Pulsing Organ/Vascular Sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial 
              color="#F97316" 
              wireframe 
              emissive="#C2410C" 
              emissiveIntensity={0.5} 
              transparent 
              opacity={0.35} 
            />
          </mesh>

          {/* Concentric Gyroscope Rings */}
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <torusGeometry args={[2.2, 0.03, 16, 100]} />
            <meshBasicMaterial color="#FBBF24" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
            <torusGeometry args={[2.7, 0.02, 16, 100]} />
            <meshBasicMaterial color="#10B981" transparent opacity={0.5} />
          </mesh>
        </group>

        {/* Double Helix Data Points */}
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleCount}
              array={positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={particleCount}
              array={colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            vertexColors
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </Float>

      {/* Ambient Floating Dust */}
      <Sparkles count={120} scale={12} size={2.5} speed={0.4} opacity={0.4} color="#FBBF24" />
    </group>
  );
};

export const LoginPage: React.FC = () => {
  const { login } = useStore();

  const [email, setEmail] = useState('dr.connor@icu.org');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<ClinicalPersona>('doctor');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Quick preset clinical credentials
  const CLINICAL_PROFILES = [
    {
      role: 'doctor' as ClinicalPersona,
      name: 'Dr. Sarah Connor, MD',
      email: 'dr.connor@icu.org',
      badge: 'Attending Intensivist',
      desc: 'Critical Care, Alarm Sign-Off & Counterfactual What-If',
      icon: Stethoscope,
      color: 'amber'
    },
    {
      role: 'nurse' as ClinicalPersona,
      name: 'RN Alex Reed, BSN',
      email: 'rn.reed@icu.org',
      badge: 'ICU Charge Nurse',
      desc: 'Rapid Bedside Telemetry, Sepsis Bundles & Vital Trends',
      icon: ClipboardList,
      color: 'emerald'
    },
    {
      role: 'hospital_chief' as ClinicalPersona,
      name: 'Dr. Robert Chen, MD',
      email: 'admin.chen@icu.org',
      badge: 'Chief Medical Officer',
      desc: 'Ward Alarm Budgets, Drift Audit & Cross-Hospital Benchmarks',
      icon: Shield,
      color: 'blue'
    }
  ];

  const handleSelectProfile = (profile: typeof CLINICAL_PROFILES[0]) => {
    setSelectedRole(profile.role);
    setEmail(profile.email);
    setPassword('••••••••••••');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const activeProfile = CLINICAL_PROFILES.find(p => p.role === selectedRole) || CLINICAL_PROFILES[0];
    const userObj: User = {
      id: selectedRole === 'doctor' ? 1 : selectedRole === 'nurse' ? 2 : 3,
      email: email,
      role: selectedRole,
      full_name: activeProfile.name,
    };

    setTimeout(() => {
      const landingPath = selectedRole === 'doctor' ? '/doctor' : selectedRole === 'nurse' ? '/nurse' : '/chief';
      window.history.pushState(null, '', landingPath);
      login(userObj, selectedRole);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0C0B0A] text-[#F3EEE8] flex items-center justify-center overflow-hidden">
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <BioHelixScene />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Ambient Gradient Overlays */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Holographic Container */}
      <div className="relative z-10 w-full max-w-4xl p-4 md:p-6 mx-auto">
        <div className="glass-panel rounded-2xl border border-amber-500/30 shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 glow-ember">
          
          {/* Left Column: Hospital Platform Info */}
          <div className="lg:col-span-5 p-6 md:p-8 bg-gradient-to-br from-[#1E1B18]/90 via-[#151311]/90 to-[#0C0B0A]/90 border-b lg:border-b-0 lg:border-r border-amber-500/20 flex flex-col justify-between">
            <div>
              {/* Header Badge */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono mb-6">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>ICU Clinical Research Platform</span>
              </div>

              {/* Title & Description */}
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white mb-2">
                SepsisWatch<span className="text-orange-500">-X</span>
              </h1>
              <p className="text-xs text-stone-400 leading-relaxed mb-6 font-mono">
                Multimodal 3D ICU Early Warning Platform. Integrates LightGBM, GRU-D, and DANN Fusion with Split Conformal calibration for robust sepsis detection.
              </p>

              {/* Core System Indicators */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 text-xs">
                  <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-stone-200">Dual-Hospital Clinical Cohort</div>
                    <div className="text-[11px] text-stone-400 font-mono">240 ICU Patients across Sets A & B</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-stone-200">Split Conformal Prediction</div>
                    <div className="text-[11px] text-stone-400 font-mono">Finite-sample 90% coverage guarantee</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 text-xs">
                  <Server className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-stone-200">Real-Time Ward Stream</div>
                    <div className="text-[11px] text-stone-400 font-mono">WebSocket Telemetry & Hourly Replay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-4 border-t border-stone-800 text-[10px] text-stone-500 font-mono">
              Research & Clinical Decision Support System. Not an autonomous diagnostic instrument.
            </div>
          </div>

          {/* Right Column: Interactive Login Portal */}
          <div className="lg:col-span-7 p-6 md:p-8 bg-[#151311]/80 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-lg font-bold font-display text-white">Clinical Sign-In</h2>
              <p className="text-xs text-stone-400">Select a clinical persona or enter hospital credentials.</p>
            </div>

            {/* Role Quick Selector Cards */}
            <div className="mb-6">
              <label className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block mb-2">
                1-Click Clinical Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CLINICAL_PROFILES.map((profile) => {
                  const Icon = profile.icon;
                  const isSelected = selectedRole === profile.role;
                  return (
                    <button
                      key={profile.role}
                      type="button"
                      onClick={() => handleSelectProfile(profile)}
                      className={`p-2.5 rounded-xl text-left transition border ${
                        isSelected 
                          ? 'bg-orange-500/15 border-orange-500/60 text-white shadow-lg shadow-orange-500/10' 
                          : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-stone-400'}`} />
                        <span className="text-xs font-semibold">{profile.role === 'doctor' ? 'Doctor' : profile.role === 'nurse' ? 'Nurse' : 'Admin'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-400 truncate">{profile.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-stone-400 block mb-1">Clinician Email / ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-900/80 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-orange-500/80 transition"
                    placeholder="clinician@hospital.org"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-stone-400 block mb-1">Access Passcode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-900/80 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-orange-500/80 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <label className="flex items-center space-x-2 text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-stone-800 border-stone-700 text-orange-500 focus:ring-0"
                  />
                  <span>Remember Session</span>
                </label>
                <span className="text-orange-400/80 hover:text-orange-300 cursor-pointer">Standard ICU Replay</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium text-xs font-mono flex items-center justify-center space-x-2 transition shadow-lg shadow-orange-600/25 border border-amber-400/30"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing ICU Session...</span>
                  </div>
                ) : (
                  <>
                    <span>Enter 3D Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
