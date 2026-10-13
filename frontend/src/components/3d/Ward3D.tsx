import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
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
      ? '#EF4444' // Crimson
      : status === 'caution'
      ? '#FBBF24' // Gold
      : '#10B981'; // Emerald

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
          color={isSelected ? '#F97316' : '#1E1B18'}
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

      {/* Pulsing Alert Ring for Critical alerts */}
      {status === 'critical' && (
        <mesh ref={ringRef} position={[0, height + 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Bed Number Text */}
      <Text
        position={[0, height + 0.5, 0]}
        fontSize={0.28}
        color={isSelected ? '#FBBF24' : '#F3EEE8'}
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

      {/* Uncertain Conformal Tag (Sandstone #B8B0A4) */}
      {conformalLabel === 'uncertain' && (
        <Text
          position={[0, height + 0.8, 0]}
          fontSize={0.16}
          color="#B8B0A4"
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
      <div className="w-full h-full bg-[#151311]/80 rounded-xl p-4 border border-amber-500/20 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-amber-400">2D ICU FLOORPLAN BAY</span>
          <span className="text-[11px] text-[#A09689]">Click to select, double-click to view patient</span>
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
                    ? 'border-amber-400 bg-amber-950/40 glow-ember'
                    : p.status === 'critical'
                    ? 'border-red-500/60 bg-red-950/20 glow-critical'
                    : p.status === 'caution'
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-[#332E29] bg-[#1E1B18]/60 hover:border-amber-500/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-[#F3EEE8]">Bed {p.bed_number}</span>
                  <span className="text-[10px] font-mono text-[#A09689]">{p.patient_code}</span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[11px] text-[#A09689]">Risk Score:</span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        p.status === 'critical'
                          ? 'text-red-400'
                          : p.status === 'caution'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {(p.risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0C0B0A] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.status === 'critical'
                          ? 'bg-red-500'
                          : p.status === 'caution'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, p.risk * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[#A09689]">Hour {p.current_hour}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      p.conformal_label === 'uncertain'
                        ? 'bg-[#B8B0A4]/20 text-[#B8B0A4] uncertain-dashed'
                        : p.conformal_label === 'sepsis'
                        ? 'bg-red-950 text-red-400 border border-red-500/30'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {p.conformal_label.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-amber-500/20 bg-[#0C0B0A]">
      <Canvas camera={{ position: [0, 9, 12], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />

        {/* 12 Bed Pods */}
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

        {/* Floor Grid (Warm Ember) */}
        <gridHelper args={[20, 20, '#F97316', '#332E29']} position={[0, 0, 0]} />

        {/* Orbit Controls */}
        <OrbitControls
          maxPolarAngle={Math.PI / 2.15}
          minDistance={5}
          maxDistance={22}
          enablePan={true}
          enableRotate={true}
        />
      </Canvas>

      {/* Floating Clinical Status Bar */}
      <div className="absolute top-3 left-3 bg-[#151311]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#332E29] text-xs font-mono flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[#A09689]">Stable</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[#A09689]">Watch</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[#A09689]">Critical Alert</span>
        </div>
        <div className="flex items-center space-x-1.5 border-l border-[#332E29] pl-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#B8B0A4] uncertain-dashed" />
          <span className="text-[#B8B0A4]">Conformal Uncertain</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 bg-[#151311]/80 px-2.5 py-1 rounded text-[11px] font-mono text-[#A09689] border border-[#332E29]">
        Click to select • Double-click to open EHR
      </div>
    </div>
  );
};
