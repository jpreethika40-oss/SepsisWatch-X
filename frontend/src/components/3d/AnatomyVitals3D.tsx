import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Heart, Wind, ShieldAlert, Activity } from 'lucide-react';
import { Patient } from '../../types';

interface AnatomyVitals3DProps {
  patient: Patient;
}

interface OrganNodeProps {
  position: [number, number, number];
  name: string;
  metric: string;
  value: string | number;
  unit: string;
  isStressed: boolean;
  color: string;
  onSelect: () => void;
  selected: boolean;
}

const OrganNode: React.FC<OrganNodeProps> = ({
  position,
  name,
  metric,
  value,
  unit,
  isStressed,
  color,
  onSelect,
  selected
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const pulseSpeed = isStressed ? 5 : 2;
      const scale = 1 + Math.sin(t * pulseSpeed) * (isStressed ? 0.15 : 0.05);
      meshRef.current.scale.set(scale, scale, scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
    }
  });

  return (
    <group position={position}>
      {/* Central Pulsing Organ Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isStressed ? 0.9 : 0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Orbiting Halo Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.28, 0.32, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>

      {/* 3D Floating Telemetry Label */}
      <Html distanceFactor={10} position={[0.35, 0.1, 0]}>
        <div 
          onClick={onSelect}
          className={`px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap backdrop-blur-md cursor-pointer transition border ${
            selected 
              ? 'bg-stone-900/90 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
              : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-600'
          }`}
        >
          <div className="flex items-center space-x-1.5 font-bold">
            <span style={{ color }}>●</span>
            <span>{name}</span>
          </div>
          <div className="text-[9px] text-stone-400">
            {metric}: <span className="font-semibold text-white">{value}</span> {unit}
          </div>
        </div>
      </Html>
    </group>
  );
};

// 3D Wireframe Silhouette Anatomy
const MannequinWireframe: React.FC = () => {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.2, 12]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Torso / Ribcage */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.45, 0.35, 1.0, 16]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Pelvis / Abdomen */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.35, 0.38, 0.5, 16]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Upper Arms */}
      <mesh position={[-0.6, 0.7, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.1, 0.08, 0.7, 12]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.6, 0.7, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.1, 0.08, 0.7, 12]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.22, -0.85, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 1.1, 12]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.22, -0.85, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 1.1, 12]} />
        <meshBasicMaterial color="#332E29" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Floor Grid Reference */}
      <gridHelper args={[6, 12, '#F97316', '#332E29']} position={[0, -1.45, 0]} />
    </group>
  );
};

export const AnatomyVitals3D: React.FC<AnatomyVitals3DProps> = ({ patient }) => {
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>('Cardiovascular');

  const hr = patient.vitals?.HR ?? 80;
  const map = patient.vitals?.MAP ?? 85;
  const resp = patient.vitals?.Resp ?? 16;
  const temp = patient.vitals?.Temp ?? 37.0;
  const lactate = patient.vitals?.Lactate ?? 1.1;

  // Organ Stress Calculations
  const isHeartStressed = hr > 100 || hr < 50 || map < 65;
  const isLungsStressed = resp > 22 || resp < 10;
  const isRenalStressed = lactate > 2.0;
  const isCerebralStressed = patient.risk > 0.65;

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* 3D Scene Header & Mode Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D Spatial Organ Perfusion</span>
          <span className="text-[10px] text-stone-400 font-mono block">Interactive Physiological Mannequin</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        Rotate: Drag • Zoom: Scroll
      </div>

      {/* Three.js Canvas */}
      <Canvas camera={{ position: [0, 0.4, 3.8], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-5, -5, -5]} intensity={1.0} color="#F97316" />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <group position={[0, -0.1, 0]}>
            <MannequinWireframe />

            {/* Brain / Neurological */}
            <OrganNode
              position={[0, 1.6, 0.05]}
              name="Cerebral (CNS)"
              metric="Encephalopathy Risk"
              value={isCerebralStressed ? 'ELEVATED' : 'STABLE'}
              unit=""
              isStressed={isCerebralStressed}
              color={isCerebralStressed ? '#EF4444' : '#10B981'}
              onSelect={() => setSelectedOrgan('Cerebral')}
              selected={selectedOrgan === 'Cerebral'}
            />

            {/* Pulmonary / Lungs */}
            <OrganNode
              position={[-0.18, 0.85, 0.15]}
              name="Pulmonary"
              metric="Resp Rate"
              value={resp}
              unit="bpm"
              isStressed={isLungsStressed}
              color={isLungsStressed ? '#F97316' : '#10B981'}
              onSelect={() => setSelectedOrgan('Pulmonary')}
              selected={selectedOrgan === 'Pulmonary'}
            />

            {/* Cardiovascular / Heart */}
            <OrganNode
              position={[0.12, 0.72, 0.18]}
              name="Cardiovascular"
              metric="MAP / HR"
              value={`${map} mmHg / ${hr}`}
              unit="bpm"
              isStressed={isHeartStressed}
              color={isHeartStressed ? '#EF4444' : '#10B981'}
              onSelect={() => setSelectedOrgan('Cardiovascular')}
              selected={selectedOrgan === 'Cardiovascular'}
            />

            {/* Renal & Metabolic / Lactate */}
            <OrganNode
              position={[0, 0.18, 0.12]}
              name="Renal / Metabolic"
              metric="Lactate"
              value={lactate}
              unit="mmol/L"
              isStressed={isRenalStressed}
              color={isRenalStressed ? '#EF4444' : '#10B981'}
              onSelect={() => setSelectedOrgan('Renal')}
              selected={selectedOrgan === 'Renal'}
            />
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={2.5} maxDistance={6} maxPolarAngle={Math.PI / 1.8} />
      </Canvas>

      {/* Bottom Organ Detail Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-2 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          {selectedOrgan === 'Cardiovascular' && <Heart className="w-4 h-4 text-red-400 animate-pulse" />}
          {selectedOrgan === 'Pulmonary' && <Wind className="w-4 h-4 text-orange-400" />}
          {selectedOrgan === 'Renal' && <ShieldAlert className="w-4 h-4 text-amber-400" />}
          {selectedOrgan === 'Cerebral' && <Activity className="w-4 h-4 text-emerald-400" />}
          <span className="text-stone-200">
            <strong>Active System:</strong> {selectedOrgan || 'Select an organ'}
          </span>
        </div>
        <div className="text-[11px] text-stone-400">
          Temperature: <span className="text-stone-200">{temp}°C</span> • Sepsis Risk:{' '}
          <span className={`font-bold ${patient.risk > 0.6 ? 'text-red-400' : 'text-emerald-400'}`}>
            {(patient.risk * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
