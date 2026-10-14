import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Bell, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Alert } from '../../types';

interface AlertBeacon3DProps {
  alerts: Alert[];
  onSelectBed?: (bedNumber: number) => void;
}

const BeaconNode: React.FC<{
  position: [number, number, number];
  bedNumber: number;
  alert?: Alert;
  onSelect?: () => void;
}> = ({ position, bedNumber, alert, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isAlert = Boolean(alert && alert.status === 'active');
  const isCritical = alert?.severity === 'critical';
  const color = isAlert ? (isCritical ? '#EF4444' : '#FBBF24') : '#10B981';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const speed = isAlert ? 6 : 1.5;
      const scale = 1 + Math.sin(t * speed + bedNumber) * (isAlert ? 0.2 : 0.05);
      meshRef.current.scale.set(scale, scale, scale);
    }
    if (ringRef.current && isAlert) {
      ringRef.current.rotation.z = t * 2;
    }
  });

  return (
    <group position={position}>
      {/* 3D Pedestal Base */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.3, 16]} />
        <meshStandardMaterial color="#1E1B18" roughness={0.5} wireframe={!isAlert} />
      </mesh>

      {/* Pulsing Beacon Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isAlert ? 0.9 : 0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Rotating Alert Shockwave Ring */}
      {isAlert && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>
      )}

      {/* 3D Bed Label */}
      <Html distanceFactor={8} position={[0, 0.45, 0]}>
        <div
          onClick={onSelect}
          className={`px-2 py-1 rounded-md text-center font-mono text-[9px] backdrop-blur-md cursor-pointer transition whitespace-nowrap border ${
            isAlert
              ? 'bg-stone-900/95 border-red-500/80 text-white shadow-xl shadow-red-500/20'
              : 'bg-stone-950/80 border-stone-800 text-stone-400'
          }`}
        >
          <div className="font-bold flex items-center justify-center space-x-1" style={{ color }}>
            <span>Bed {bedNumber}</span>
          </div>
          {isAlert && alert && (
            <div className="text-[8px] text-red-300 font-bold uppercase">
              {alert.severity} ({(alert.risk_score * 100).toFixed(0)}%)
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

export const AlertBeacon3D: React.FC<AlertBeacon3DProps> = ({ alerts, onSelectBed }) => {
  // Generate 12 bed positions arranged in a dual-bay ICU layout (6 beds per row)
  const bedNodes = Array.from({ length: 12 }, (_, i) => {
    const bedNumber = i + 1;
    const row = Math.floor(i / 6); // 0 or 1
    const col = i % 6; // 0 to 5
    const x = (col - 2.5) * 1.4;
    const z = row === 0 ? -1.0 : 1.0;
    const activeAlert = alerts.find((a) => a.bed_number === bedNumber && a.status === 'active');
    return { bedNumber, position: [x, 0, z] as [number, number, number], activeAlert };
  });

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* 3D Header Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Bell className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D Spatial Ward Alert Beacons</span>
          <span className="text-[10px] text-stone-400 font-mono block">
            Real-Time 12-Bed Alarm State Matrix (Emory & BIDMC Bays)
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        Active Alarms: {alerts.filter((a) => a.status === 'active').length} • Drag to Orbit
      </div>

      {/* Canvas */}
      <Canvas camera={{ position: [0, 3.8, 5.2], fov: 42 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#F97316" />

        <Float speed={1} rotationIntensity={0.08} floatIntensity={0.15}>
          <group position={[0, -0.2, 0]}>
            {/* ICU Bay Floor Grids */}
            <gridHelper args={[8.5, 8, '#332E29', '#151311']} position={[0, -0.55, 0]} />

            {/* 12 Bed Nodes */}
            {bedNodes.map((b) => (
              <BeaconNode
                key={b.bedNumber}
                position={b.position}
                bedNumber={b.bedNumber}
                alert={b.activeAlert}
                onSelect={() => onSelectBed?.(b.bedNumber)}
              />
            ))}
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={3.5} maxDistance={8.5} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>

      {/* Bottom Status Ribbon */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-2 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-stone-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Critical Monitoring Bay:{' '}
            <strong className="text-white">Bed 3 (p_A_00003) & Bed 7 (p_A_00007)</strong>
          </span>
        </div>
        <span className="text-[10px] text-stone-400">
          Click any beacon to view patient telemetry and execute acknowledgment
        </span>
      </div>
    </div>
  );
};
