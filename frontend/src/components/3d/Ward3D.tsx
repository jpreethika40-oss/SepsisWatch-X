import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface BedPodProps {
  bedNumber: number;
  patientCode: string;
  hospital: string;
  diagnosis?: string;
  vitals?: Record<string, number>;
  risk: number;
  status: 'normal' | 'caution' | 'critical';
  conformalLabel: 'no_sepsis' | 'sepsis' | 'uncertain';
  position: [number, number, number];
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

const BedPod: React.FC<BedPodProps> = ({
  bedNumber,
  patientCode,
  hospital,
  diagnosis,
  vitals,
  risk,
  status,
  conformalLabel,
  position,
  isSelected,
  isDimmed,
  onSelect,
  onDoubleClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Height of risk pillar scales with probability
  const pillarHeight = 0.5 + risk * 2.2;
  const color =
    status === 'critical'
      ? '#EF4444' // Crimson
      : status === 'caution'
      ? '#FBBF24' // Gold
      : '#10B981'; // Emerald

  useFrame((state, delta) => {
    // Pulsing and spinning alert beacon for critical patients (Bed 3)
    if (beaconRef.current && status === 'critical') {
      beaconRef.current.rotation.y += delta * 3.5;
    }
    if (ringRef.current && status === 'critical') {
      const s = 1.0 + Math.sin(state.clock.elapsedTime * 5) * 0.18;
      ringRef.current.scale.set(s, s, s);
    }
    if (meshRef.current && conformalLabel === 'uncertain') {
      // Subtle holographic breathing effect for uncertain conformal sets
      meshRef.current.position.y = (pillarHeight / 2 + 0.15) + Math.sin(state.clock.elapsedTime * 6) * 0.03;
    }
  });

  const hr = vitals?.HR ? Math.round(vitals.HR) : (status === 'critical' ? 124 : 76);
  const mapVal = vitals?.MAP ? Math.round(vitals.MAP) : (status === 'critical' ? 61 : 85);

  return (
    <group 
      position={position} 
      onClick={(e) => { e.stopPropagation(); onSelect(); }} 
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
    >
      {/* 1. Base Foundation Floor Pod */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 0.08, 24]} />
        <meshStandardMaterial
          color={isSelected ? '#F97316' : isDimmed ? '#11100E' : '#1E1B18'}
          roughness={0.5}
          metalness={0.7}
        />
      </mesh>

      {/* Selected Halo Ring */}
      {isSelected && (
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.35, 32]} />
          <meshBasicMaterial color="#F97316" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2. 3D ICU Bed Frame & Mattress */}
      <group position={[0, 0.25, 0.2]}>
        {/* Bed Chassis */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.9, 0.18, 1.4]} />
          <meshStandardMaterial color={isDimmed ? '#1C1917' : '#292524'} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Mattress */}
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.82, 0.14, 1.32]} />
          <meshStandardMaterial color={isDimmed ? '#27272A' : '#44403C'} roughness={0.7} />
        </mesh>
        {/* Pillow & Patient Silhouette */}
        <mesh position={[0, 0.35, -0.42]}>
          <boxGeometry args={[0.55, 0.1, 0.28]} />
          <meshStandardMaterial color="#E7E5E4" roughness={0.8} />
        </mesh>
        {/* Bed Headboard */}
        <mesh position={[0, 0.45, -0.68]}>
          <boxGeometry args={[0.94, 0.55, 0.06]} />
          <meshStandardMaterial color="#1C1917" metalness={0.7} />
        </mesh>
      </group>

      {/* 3. Bedside Telemetry Monitor & IV Pole */}
      <group position={[0.65, 0, -0.3]}>
        {/* IV Pole Stand */}
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
          <meshStandardMaterial color="#A8A29E" metalness={0.9} />
        </mesh>
        {/* IV Saline Fluid Bag */}
        <mesh position={[0, 1.65, 0.06]}>
          <boxGeometry args={[0.12, 0.22, 0.08]} />
          <meshStandardMaterial color="#38BDF8" transparent opacity={0.65} roughness={0.1} />
        </mesh>
        {/* Bedside Physiological Monitor Screen */}
        <mesh position={[-0.2, 1.25, 0.2]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.34, 0.24, 0.04]} />
          <meshStandardMaterial color="#0C0A09" />
        </mesh>
        {/* Monitor Screen Face (glowing waveform screen) */}
        <mesh position={[-0.2, 1.25, 0.22]} rotation={[0, -0.4, 0]}>
          <planeGeometry args={[0.3, 0.2]} />
          <meshBasicMaterial color={status === 'critical' ? '#EF4444' : '#10B981'} />
        </mesh>
      </group>

      {/* 4. Main Dynamic Sepsis Risk Pillar (Center Column) */}
      <mesh
        ref={meshRef}
        position={[0, pillarHeight / 2 + 0.1, -0.55]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.28, 0.28, pillarHeight, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === 'critical' ? 0.9 : hovered || isSelected ? 0.6 : 0.3}
          roughness={0.2}
          transparent={conformalLabel === 'uncertain' || isDimmed}
          opacity={isDimmed ? 0.35 : conformalLabel === 'uncertain' ? 0.75 : 0.95}
        />
      </mesh>

      {/* 5. Pulsing Alarm Ring for Critical Alert Patients */}
      {status === 'critical' && (
        <mesh ref={ringRef} position={[0, pillarHeight + 0.35, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.62, 32]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 6. Rotating Beacon Siren Light for Critical Beds */}
      {status === 'critical' && (
        <group ref={beaconRef} position={[0, pillarHeight + 0.55, -0.55]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.2, 12]} />
            <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={1.2} />
          </mesh>
          <pointLight color="#EF4444" intensity={2.5} distance={4} />
        </group>
      )}

      {/* 7. 3D Floating HUD Labels above the Pod */}
      <group position={[0, pillarHeight + 0.9, -0.55]}>
        {/* Bed Number & Code */}
        <Text
          position={[0, 0.35, 0]}
          fontSize={0.26}
          color={isSelected ? '#FBBF24' : '#F3EEE8'}
          anchorX="center"
          anchorY="middle"
        >
          {`BED ${bedNumber} • ${patientCode}`}
        </Text>

        {/* Risk Percentage Readout */}
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.22}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {`${(risk * 100).toFixed(0)}% Sepsis Risk`}
        </Text>

        {/* Live Vitals HUD */}
        <Text
          position={[0, -0.12, 0]}
          fontSize={0.16}
          color="#A8A29E"
          anchorX="center"
          anchorY="middle"
        >
          {`HR ${hr} | MAP ${mapVal} | ${hospital === 'setA' ? 'Hosp A' : 'Hosp B'}`}
        </Text>

        {/* Conformal Uncertainty Tag */}
        {conformalLabel === 'uncertain' && (
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.14}
            color="#FBBF24"
            anchorX="center"
            anchorY="middle"
          >
            [UNCERTAIN CONFORMAL SET]
          </Text>
        )}
      </group>
    </group>
  );
};

export const Ward3D: React.FC = () => {
  const { 
    patients, selectedPatientId, setSelectedPatientId, 
    is2DMode, selectedHospital, currentRole 
  } = useStore();
  const navigate = useNavigate();

  // Arrange 12 beds in a 4x3 ICU Ward floorplan
  const getBedPosition = (index: number): [number, number, number] => {
    const col = index % 4; // 0, 1, 2, 3
    const row = Math.floor(index / 4); // 0, 1, 2
    const x = (col - 1.5) * 3.6;
    const z = (row - 1.0) * 3.8;
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
      <div className="w-full h-full bg-[#151311]/90 rounded-xl p-4 border border-amber-500/20 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#F3EEE8] font-bold">
              2D ICU Floorplan Bay (12 Monitored Pods)
            </span>
          </div>
          <span className="text-[11px] text-[#A09689] font-mono">
            Click to select • Double-click to open full EHR
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 overflow-y-auto">
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const isDimmed = selectedHospital !== 'all' && p.hospital !== selectedHospital;

            return (
              <div
                key={p.id}
                onClick={() => handleBedClick(p.id)}
                onDoubleClick={() => handleBedDoubleClick(p.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                  isDimmed ? 'opacity-30' : 'opacity-100'
                } ${
                  isSelected
                    ? 'border-orange-500 bg-orange-950/30 glow-ember'
                    : p.status === 'critical'
                    ? 'border-red-500/60 bg-red-950/20 glow-crimson'
                    : p.status === 'caution'
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-[#332E29] bg-[#1A1815] hover:border-amber-500/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-xs text-[#F3EEE8]">BED {p.bed_number}</span>
                    <p className="text-[10px] font-mono text-orange-400">{p.patient_code}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    p.hospital === 'setA' ? 'bg-orange-500/10 text-orange-300' : 'bg-amber-500/10 text-amber-300'
                  }`}>
                    {p.hospital === 'setA' ? 'Hosp A' : 'Hosp B'}
                  </span>
                </div>

                <p className="text-[10px] text-[#A09689] line-clamp-1 truncate">
                  {p.diagnosis || 'ICU Monitoring'}
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-[#A09689]">Sepsis Risk:</span>
                    <span className={`text-xs font-mono font-bold ${
                      p.status === 'critical' ? 'text-red-400' : p.status === 'caution' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {(p.risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0C0B0A] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.status === 'critical' ? 'bg-red-500' : p.status === 'caution' ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, p.risk * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-[#292521]">
                  <span className="text-[#A09689]">HR {p.vitals?.HR ? Math.round(p.vitals.HR) : (p.status === 'critical' ? 124 : 76)}</span>
                  <span className={`px-1.5 py-0.2 rounded font-semibold ${
                    p.conformal_label === 'sepsis'
                      ? 'bg-red-950 text-red-300'
                      : p.conformal_label === 'uncertain'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}>
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
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-amber-500/30 bg-[#0C0B0A] glow-ember">
      <Canvas camera={{ position: [0, 11, 14], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[12, 22, 16]} intensity={1.3} />
        <pointLight position={[0, 8, 0]} intensity={0.6} />

        {/* 12 Bed Pods arranged in ICU Bay */}
        {patients.map((p, idx) => {
          const isDimmed = selectedHospital !== 'all' && p.hospital !== selectedHospital;

          return (
            <BedPod
              key={p.id}
              bedNumber={p.bed_number}
              patientCode={p.patient_code}
              hospital={p.hospital}
              diagnosis={p.diagnosis}
              vitals={p.vitals}
              risk={p.risk}
              status={p.status}
              conformalLabel={p.conformal_label}
              position={getBedPosition(idx)}
              isSelected={p.id === selectedPatientId}
              isDimmed={isDimmed}
              onSelect={() => handleBedClick(p.id)}
              onDoubleClick={() => handleBedDoubleClick(p.id)}
            />
          );
        })}

        {/* Clinical ICU Floor Grid (Ember Orange Lines) */}
        <gridHelper args={[24, 24, '#F97316', '#292521']} position={[0, 0, 0]} />

        {/* Camera Controls */}
        <OrbitControls
          maxPolarAngle={Math.PI / 2.15}
          minDistance={5}
          maxDistance={25}
          enablePan={true}
          enableRotate={true}
        />
      </Canvas>

      {/* Floating Clinical Legend / HUD */}
      <div className="absolute top-3 left-3 bg-[#151311]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#332E29] text-xs font-mono flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[#A09689]">Stable (10)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[#A09689]">Watch (Bed 7)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold">Critical Alert (Bed 3)</span>
        </div>
        <div className="flex items-center space-x-1.5 border-l border-[#332E29] pl-2">
          <span className="text-amber-300">
            {currentRole === 'doctor' ? 'Doctor View Active' : currentRole === 'nurse' ? 'Nurse Triage Active' : 'Chief Governance Active'}
          </span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 bg-[#151311]/85 px-3 py-1 rounded text-[11px] font-mono text-[#A09689] border border-[#332E29]">
        Click bed to focus • Double-click to open 24h EHR Timeline
      </div>
    </div>
  );
};
