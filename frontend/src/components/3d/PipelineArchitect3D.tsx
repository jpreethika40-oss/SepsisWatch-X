import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Database, CheckCircle2, Cpu, Activity, ShieldCheck, 
  Layers, Terminal, GitBranch, ArrowRight, Sparkles 
} from 'lucide-react';

interface StageNodeProps {
  position: [number, number, number];
  index: number;
  name: string;
  status: 'completed' | 'running' | 'idle' | 'failed';
  icon: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}

const StageNode: React.FC<StageNodeProps> = ({
  position,
  index,
  name,
  status,
  color,
  selected,
  onSelect
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5 + index;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* 3D Polyhedron Node */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.9 : 0.4}
          roughness={0.2}
          wireframe={!selected}
        />
      </mesh>

      {/* Halo Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.42, 0.02, 16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* Stage Number & Label Tag */}
      <Html distanceFactor={8} position={[0, -0.55, 0]}>
        <div
          onClick={onSelect}
          className={`px-2 py-1 rounded-md text-center font-mono text-[9px] whitespace-nowrap backdrop-blur-md cursor-pointer transition border ${
            selected
              ? 'bg-stone-900/95 border-orange-500 text-white shadow-xl shadow-orange-500/20'
              : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-600'
          }`}
        >
          <div className="font-bold flex items-center justify-center space-x-1" style={{ color }}>
            <span>{index + 1}.</span>
            <span>{name}</span>
          </div>
          <div className="text-[8px] text-stone-400 capitalize flex items-center justify-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{status}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

export const PipelineArchitect3D: React.FC = () => {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(4); // Default to Model Inference

  const PIPELINE_STAGES = [
    {
      name: 'Dataset Ingestion',
      category: 'Data Engineering',
      status: 'completed' as const,
      color: '#F97316',
      pos: [-4.0, 0, 0] as [number, number, number],
      artifact: 'data/raw/setA & setB (240 .psv records)',
      endpoint: 'GET /api/patients',
      details: 'Patient-level loaders with stratified hospital splits. Ingests hourly vitals and laboratory measurements without data leakage.'
    },
    {
      name: 'Data Validation',
      category: 'Data Quality',
      status: 'completed' as const,
      color: '#FBBF24',
      pos: [-3.0, 0.4, 0] as [number, number, number],
      artifact: 'backend/ml/data_loader.py',
      endpoint: 'POST /api/upload/validate',
      details: 'Enforces PhysioNet schema, validates physiological value bounds (HR 20-300, SBP 30-300), and records baseline missingness statistics.'
    },
    {
      name: 'Preprocessing',
      category: 'Data Engineering',
      status: 'completed' as const,
      color: '#10B981',
      pos: [-2.0, -0.3, 0] as [number, number, number],
      artifact: 'backend/ml/preprocessing.py',
      endpoint: 'GET /api/health',
      details: 'Forward-fills missing vital signs, generates binary missingness masks M, and computes time-gap decay vectors Δt without looking into the future.'
    },
    {
      name: 'Feature Engineering',
      category: 'Features',
      status: 'completed' as const,
      color: '#38BDF8',
      pos: [-1.0, 0.4, 0] as [number, number, number],
      artifact: 'backend/ml/features.py',
      endpoint: 'POST /api/predict',
      details: 'Extracts 6-hour and 12-hour causal rolling windows: mean, std, min, max, delta, and Shock Index (HR/SBP).'
    },
    {
      name: 'Model Inference',
      category: 'Advanced Modeling',
      status: 'completed' as const,
      color: '#FBBF24',
      pos: [0.0, 0.0, 0] as [number, number, number],
      artifact: 'models/lgbm_sepsis.pkl & GRU-D weights',
      endpoint: 'POST /api/predict',
      details: 'Executes DANN Domain-Adversarial Stacking: Combines LightGBM rolling tabular features + GRU-D temporal representations via cross-hospital meta-learner.'
    },
    {
      name: 'Calibration',
      category: 'Reliability',
      status: 'completed' as const,
      color: '#F97316',
      pos: [1.0, -0.4, 0] as [number, number, number],
      artifact: 'backend/ml/conformal.py',
      endpoint: 'GET /api/health',
      details: 'Isotonic regression and Platt scaling fitted on independent calibration split. Corrects raw neural overconfidence to empirical probabilities.'
    },
    {
      name: 'Uncertainty Analysis',
      category: 'Reliability',
      status: 'completed' as const,
      color: '#10B981',
      pos: [2.0, 0.4, 0] as [number, number, number],
      artifact: 'backend/ml/conformal.py',
      endpoint: 'GET /api/scoreboard/summary',
      details: 'Split Conformal prediction with finite-sample guarantee (α = 0.10). Outputs [p_lower, p_upper] and flags ambiguous inputs as "uncertain".'
    },
    {
      name: 'Policy Evaluation',
      category: 'Clinical Safety',
      status: 'completed' as const,
      color: '#38BDF8',
      pos: [3.0, -0.3, 0] as [number, number, number],
      artifact: 'backend/app/routers/policy.py',
      endpoint: 'POST /api/policy/simulate',
      details: 'Evaluates alert persistence (≥2h window), cooldown suppression (4h silence), and maximum daily bed budget (≤4 alarms/day) to prevent fatigue.'
    },
    {
      name: 'Alert Dispatch',
      category: 'Deployment',
      status: 'completed' as const,
      color: '#EF4444',
      pos: [4.0, 0.0, 0] as [number, number, number],
      artifact: 'backend/app/routers/stream.py',
      endpoint: 'WebSocket /ws/stream & POST /api/alerts',
      details: 'Broadcasts confirmed alarm events to bedside monitors and creates a timestamped entry in the permanent Clinical Audit Log.'
    }
  ];

  const activeStage = PIPELINE_STAGES[selectedStageIdx];

  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* 3D Header Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D End-to-End Pipeline Architecture</span>
          <span className="text-[10px] text-stone-400 font-mono block">
            Click any processing stage to inspect actual artifacts, endpoints, and verification logs
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        9 Verified Stages • Drag to Orbit
      </div>

      {/* Canvas */}
      <Canvas camera={{ position: [0, 1.2, 5.8], fov: 42 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#F97316" />

        <Float speed={1} rotationIntensity={0.08} floatIntensity={0.15}>
          <group position={[0, 0.1, 0]}>
            {/* Connecting Conduit Tube across Stages */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 8.4, 12]} />
              <meshBasicMaterial color="#332E29" />
            </mesh>

            {/* Stage Nodes */}
            {PIPELINE_STAGES.map((stg, idx) => (
              <StageNode
                key={stg.name}
                position={stg.pos}
                index={idx}
                name={stg.name}
                status={stg.status}
                icon="Layers"
                color={stg.color}
                selected={selectedStageIdx === idx}
                onSelect={() => setSelectedStageIdx(idx)}
              />
            ))}
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={3.5} maxDistance={9} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      {/* Selected Stage Detail Inspector */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-3 rounded-lg bg-stone-950/95 border border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between text-xs font-mono gap-3">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-white text-sm">
              Stage {selectedStageIdx + 1}: {activeStage.name}
            </span>
            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30">
              {activeStage.category}
            </span>
          </div>
          <p className="text-[11px] text-stone-300 leading-relaxed">{activeStage.details}</p>
        </div>

        <div className="text-right border-l border-stone-800 pl-4 text-[11px] space-y-1">
          <div>
            <span className="text-stone-500">Source: </span>
            <code className="text-amber-300 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
              {activeStage.artifact}
            </code>
          </div>
          <div>
            <span className="text-stone-500">API Endpoint: </span>
            <code className="text-emerald-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
              {activeStage.endpoint}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
