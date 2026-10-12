import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface BedPodProps {
  bedNumber: number;
  risk: number;
  status: 'normal' | 'caution' | 'critical';
  conformalLabel: 'no_sepsis' | 'sepsis' | 'uncertain';
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}

const BedPod: React.FC<BedPodProps> = ({
  bedNumber,
  risk,
  status,
  conformalLabel,
  position,
  isSelected,
  onSelect,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Pillar height dynamically scales with risk
  const height = 0.6 + risk * 2.2;
  const color =
    status === 'critical'
      ? '#ef4444' // Crimson
      : status === 'caution'
      ? '#f59e0b' // Amber
      : '#10b981'; // Emerald

  useFrame((state, delta) => {
    if (ringRef.current && status === 'critical') {
      ringRef.current.rotation.z += delta * 1.5;
      const s = 1.0 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      ringRef.current.scale.set(s, s, s);
    }
    if (meshRef.current && conformalLabel === 'uncertain') {
      // Subtle holographic flicker if model is uncertain
      meshRef.current.position.y = (position[1] + height / 2) + Math.sin(state.clock.elapsedTime * 8) * 0.04;
    }
  });

  return (
    <group position={position} onClick={onSelect}>
      {/* Base Foundation Plate */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.9, 1.0, 0.1, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#06b6d4' : '#1e293b'}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>

      {/* Main Risk Pillar */}
      <mesh
        ref={meshRef}
        position={[0, height / 2 + 0.1, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.6, 0.6, height, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === 'critical' ? 0.8 : hovered || isSelected ? 0.6 : 0.25}
          roughness={0.2}
          transparent={conformalLabel === 'uncertain'}
          opacity={conformalLabel === 'uncertain' ? 0.75 : 0.95}
        />
      </mesh>

      {/* Pulsing Alert Ring for Critical/High alerts */}
      {status === 'critical' && (
        <mesh ref={ringRef} position={[0, height + 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Bed Number Text */}
      <Text
        position={[0, height + 0.5, 0]}
        fontSize={0.28}
        color={isSelected ? '#22d3ee' : '#f8fafc'}
        anchorX="center"
        anchorY="middle"
      >
        {`Bed ${bedNumber}`}
      </Text>

      {/* Risk Percentage Readout */}
      <Text
        position={[0, height + 0.22, 0]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {`${(risk * 100).toFixed(0)}%`}
      </Text>

      {/* Uncertain Conformal Tag */}
      {conformalLabel === 'uncertain' && (
        <Text
          position={[0, height + 0.8, 0]}
          fontSize={0.16}
          color="#a855f7"
          anchorX="center"
          anchorY="middle"
        >
          [UNCERTAIN]
        </Text>
      )}
    </group>
  );
};

export const Ward3D: React.FC = () => {
  const { patients, selectedPatientId, setSelectedPatientId, is2DMode } = useStore();
  const navigate = useNavigate();

  // 12 beds arranged in a 4x3 clinical ICU ward bay
  const getBedPosition = (index: number): [number, number, number] => {
    const col = index % 4; // 0, 1, 2, 3
    const row = Math.floor(index / 4); // 0, 1, 2
    const x = (col - 1.5) * 2.8;
    const z = (row - 1.0) * 3.2;
    return [x, 0, z];
  };

  const handleBedClick = (patientId: number) => {
    setSelectedPatientId(patientId);
  };

  const handleBedDoubleClick = (patientId: number) => {
    setSelectedPatientId(patientId);
    navigate('/patient');
  };

  // If user selected 2D Low-Power Mode:
  if (is2DMode) {
    return (
      <div className="w-full h-full bg-slate-950/80 rounded-xl p-4 border border-cyan-500/20 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-cyan-400">2D ICU FLOORPLAN BAY</span>
          <span className="text-[11px] text-slate-400">Click to select, double-click to view patient</span>
        </div>
        <div className="grid grid-cols-4 gap-3 flex-1">
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            return (
              <div
                key={p.id}
                onClick={() => handleBedClick(p.id)}
                onDoubleClick={() => handleBedDoubleClick(p.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 glow-cyan'
                    : p.status === 'critical'
                    ? 'border-red-500/60 bg-red-950/20 glow-crimson'
                    : p.status === 'caution'
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-slate-200">Bed {p.bed_number}</span>
                  <span className="text-[10px] font-mono text-slate-400">{p.patient_code}</span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Sepsis Risk:</span>
                    <span className={`font-bold ${p.risk >= 0.7 ? 'text-red-400' : p.risk >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {(p.risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.risk >= 0.7 ? 'bg-red-500' : p.risk >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${p.risk * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-slate-500">{p.hospital.toUpperCase()}</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono ${
                    p.conformal_label === 'uncertain' ? 'bg-purple-950 text-purple-300' : 'text-slate-400'
                  }`}>
                    {p.conformal_label.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // High-Fidelity 3D Ward View
  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-cyan-500/20 bg-gradient-to-b from-slate-950 to-clinical-surface">
      <Canvas camera={{ position: [0, 9, 11], fov: 42 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#22d3ee" />

        {/* Isometric ICU Floor Grid */}
        <gridHelper args={[24, 24, '#06b6d4', '#1e293b']} position={[0, 0, 0]} />

        {/* 12 Interactive ICU Beds */}
        {patients.map((p, idx) => (
          <BedPod
            key={p.id}
            bedNumber={p.bed_number}
            risk={p.risk}
            status={p.status}
            conformalLabel={p.conformal_label}
            position={getBedPosition(idx)}
            isSelected={p.id === selectedPatientId}
            onSelect={() => handleBedClick(p.id)}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={22}
        />
      </Canvas>

      {/* Floating Ward Legend & Controls Info */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Safe (&lt;40%)</span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" />
          <span className="text-slate-300">Caution (40-70%)</span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ml-2" />
          <span className="text-slate-300">Critical (&gt;70%)</span>
        </div>
        <div className="text-[10px] text-slate-400">
          Rotate: Left-click • Pan: Right-click • Zoom: Scroll • Select: Click Bed
        </div>
      </div>
    </div>
  );
};
