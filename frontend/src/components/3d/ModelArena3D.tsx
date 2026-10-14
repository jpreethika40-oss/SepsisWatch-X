import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Swords, Trophy, Activity, Zap } from 'lucide-react';

interface ModelPodiumProps {
  position: [number, number, number];
  name: string;
  type: string;
  auroc: number;
  utility: number;
  latency: number;
  color: string;
  isChampion?: boolean;
  onSelect: () => void;
  selected: boolean;
}

const ModelPodium: React.FC<ModelPodiumProps> = ({
  position,
  name,
  type,
  auroc,
  utility,
  latency,
  color,
  isChampion,
  onSelect,
  selected
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * (isChampion ? 0.8 : 0.4);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 1.2;
    }
  });

  const height = auroc * 2.5;

  return (
    <group position={position}>
      {/* 3D Base Pillar (Height proportional to AUROC) */}
      <mesh position={[0, height / 2 - 0.5, 0]}>
        <cylinderGeometry args={[0.45, 0.55, height, 16]} />
        <meshStandardMaterial
          color="#1E1B18"
          roughness={0.4}
          metalness={0.7}
          wireframe={!selected}
        />
      </mesh>

      {/* Floating Holographic Crystal at Top */}
      <mesh
        ref={meshRef}
        position={[0, height + 0.1, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isChampion ? 0.9 : 0.4}
          wireframe={!isChampion && !selected}
        />
      </mesh>

      {/* Orbiting Halo Ring */}
      <mesh ref={ringRef} position={[0, height + 0.1, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[0.48, 0.02, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* 3D Floating Tag */}
      <Html distanceFactor={8} position={[0, height + 0.7, 0]}>
        <div
          onClick={onSelect}
          className={`px-2.5 py-1.5 rounded-lg text-center backdrop-blur-md cursor-pointer transition whitespace-nowrap font-mono text-[10px] border ${
            selected
              ? 'bg-stone-900/95 border-orange-500 text-white shadow-xl shadow-orange-500/20'
              : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-600'
          }`}
        >
          <div className="font-bold flex items-center justify-center space-x-1" style={{ color }}>
            {isChampion && <span>🏆</span>}
            <span>{name}</span>
          </div>
          <div className="text-[9px] text-stone-400">
            AUROC: <strong className="text-white">{auroc.toFixed(3)}</strong> | Util:{' '}
            <strong className="text-white">+{utility.toFixed(3)}</strong>
          </div>
        </div>
      </Html>
    </group>
  );
};

export const ModelArena3D: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('DANN Stacking Fusion');

  const MODEL_DATA = [
    {
      name: 'DANN Fusion',
      fullName: 'DANN Stacking Meta-Learner (SepsisWatch-X)',
      type: 'Domain-Adversarial Deep Ensemble',
      auroc: 0.884,
      utility: 0.438,
      latency: 38.4,
      color: '#FBBF24',
      isChampion: true,
      position: [0, 0, 1.8] as [number, number, number],
      highlights: 'Invariant to hospital site covariate shift. Platt calibrated.'
    },
    {
      name: 'LightGBM',
      fullName: 'LightGBM (Temporal Rolling Features)',
      type: 'Gradient Boosted Decision Trees',
      auroc: 0.842,
      utility: 0.381,
      latency: 4.2,
      color: '#F97316',
      isChampion: false,
      position: [-2.2, 0, -0.4] as [number, number, number],
      highlights: 'High-speed 4.2ms inference. 6h & 12h statistical summaries.'
    },
    {
      name: 'GRU-D',
      fullName: 'GRU-D (Decay & Mask Recurrent Net)',
      type: 'Continuous-Time Recurrent Neural Network',
      auroc: 0.851,
      utility: 0.395,
      latency: 22.8,
      color: '#10B981',
      isChampion: false,
      position: [2.2, 0, -0.4] as [number, number, number],
      highlights: 'Directly ingests irregularly sampled lab time gaps & missingness.'
    },
    {
      name: 'SIRS / qSOFA',
      fullName: 'SIRS / qSOFA Rule Baseline',
      type: 'Conventional Clinical Threshold Scoring',
      auroc: 0.612,
      utility: 0.124,
      latency: 0.2,
      color: '#A09689',
      isChampion: false,
      position: [0, 0, -2.0] as [number, number, number],
      highlights: 'Fixed clinical thresholds. High false alarms per patient-day.'
    }
  ];

  const activeModel = MODEL_DATA.find((m) => m.name === selectedModel) || MODEL_DATA[0];

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* 3D Header Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Swords className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D Multi-Model Spatial Arena</span>
          <span className="text-[10px] text-stone-400 font-mono block">
            Comparative Architecture Evaluation on Clinical ICU Cohort
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        Pillar Heights: AUROC • Drag to Orbit
      </div>

      {/* Canvas */}
      <Canvas camera={{ position: [0, 4.5, 6], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#F97316" />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
          <group position={[0, -0.6, 0]}>
            {/* Main Circular Arena Floor */}
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[3.2, 3.4, 0.2, 32]} />
              <meshStandardMaterial color="#151311" roughness={0.6} metalness={0.4} />
            </mesh>

            {/* Glowing Arena Perimeter Ring */}
            <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.1, 3.2, 64]} />
              <meshBasicMaterial color="#F97316" transparent opacity={0.6} />
            </mesh>

            {/* Center Decision Nexus Sphere */}
            <mesh position={[0, 0.4, 0]}>
              <icosahedronGeometry args={[0.5, 1]} />
              <meshStandardMaterial
                color="#FBBF24"
                wireframe
                transparent
                opacity={0.35}
                emissive="#C2410C"
                emissiveIntensity={0.4}
              />
            </mesh>

            {/* The 4 Model Podiums */}
            {MODEL_DATA.map((model) => (
              <ModelPodium
                key={model.name}
                position={model.position}
                name={model.name}
                type={model.type}
                auroc={model.auroc}
                utility={model.utility}
                latency={model.latency}
                color={model.color}
                isChampion={model.isChampion}
                selected={selectedModel === model.name}
                onSelect={() => setSelectedModel(model.name)}
              />
            ))}
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={4} maxDistance={10} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      {/* Active Model Summary Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div className="flex items-center space-x-2">
          {activeModel.isChampion ? (
            <Trophy className="w-4 h-4 text-amber-400" />
          ) : (
            <Activity className="w-4 h-4 text-orange-400" />
          )}
          <span className="text-white font-bold">{activeModel.fullName}</span>
          <span className="text-[10px] text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
            {activeModel.type}
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>
            AUROC: <strong className="text-amber-400">{activeModel.auroc.toFixed(3)}</strong>
          </span>
          <span>
            Utility: <strong className="text-emerald-400">+{activeModel.utility.toFixed(3)}</strong>
          </span>
          <span>
            Latency: <strong className="text-stone-300">{activeModel.latency}ms</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
