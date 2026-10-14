import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ShieldCheck, Filter, AlertTriangle, Activity } from 'lucide-react';

interface PolicyWave3DProps {
  threshold: number;
  persistence: number;
  cooldown: number;
  cap: number;
  alarmsPerDay: number;
  sensitivity: number;
}

// 3D Policy Filter Gate Component
const PolicyGate: React.FC<{
  position: [number, number, number];
  name: string;
  setting: string;
  color: string;
  apertureRadius: number;
  labelPosition?: [number, number, number];
}> = ({ position, name, setting, color, apertureRadius, labelPosition = [0, 1.4, 0] }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* Outer Gate Frame */}
      <mesh>
        <boxGeometry args={[0.15, 2.6, 2.6]} />
        <meshStandardMaterial
          color="#1E1B18"
          roughness={0.5}
          metalness={0.8}
          wireframe
        />
      </mesh>

      {/* Rotating Laser Aperture Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[apertureRadius, 0.04, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>

      {/* Internal Energy Membrane */}
      <mesh>
        <circleGeometry args={[apertureRadius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D Gate Label */}
      <Html distanceFactor={8} position={labelPosition}>
        <div className="px-2 py-1 rounded-md bg-stone-950/90 border border-stone-800 backdrop-blur-md text-center font-mono text-[9px] text-white whitespace-nowrap shadow-lg">
          <div className="font-bold" style={{ color }}>{name}</div>
          <div className="text-stone-400">{setting}</div>
        </div>
      </Html>
    </group>
  );
};

// Moving Telemetry Signal Packets
const TelemetrySignalStream: React.FC<{ threshold: number }> = ({ threshold }) => {
  const count = 40;
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: -4.5 + (i / count) * 9.0,
      y: (Math.random() - 0.5) * 1.2,
      z: (Math.random() - 0.5) * 1.2,
      speed: 0.04 + Math.random() * 0.03,
      isRealSepsis: Math.random() > 0.45
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!particlesRef.current) return;

    particles.forEach((p, idx) => {
      p.x += p.speed;
      if (p.x > 4.5) {
        p.x = -4.5;
        p.y = (Math.random() - 0.5) * 1.2;
        p.z = (Math.random() - 0.5) * 1.2;
      }

      dummy.position.set(p.x, p.y, p.z);
      const s = p.isRealSepsis ? 0.09 : 0.05;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      particlesRef.current!.setMatrixAt(idx, dummy.matrix);
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color="#F97316" />
    </instancedMesh>
  );
};

export const PolicyWave3D: React.FC<PolicyWave3DProps> = ({
  threshold,
  persistence,
  cooldown,
  cap,
  alarmsPerDay,
  sensitivity
}) => {
  // Apertures expand/contract with user policy
  const thresholdAperture = Math.max(0.3, (1.0 - threshold) * 1.2);
  const persistenceAperture = Math.max(0.35, 1.3 - persistence * 0.2);
  const cooldownAperture = Math.max(0.4, 1.4 - cooldown * 0.08);

  return (
    <div className="relative w-full h-[380px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* 3D Title Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Filter className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D Spatial Alarm Filtration Tunnel</span>
          <span className="text-[10px] text-stone-400 font-mono block">
            Multi-Stage Policy Gates (Threshold → Persistence → Cooldown → Quota)
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        Telemetry Stream: Left to Right • Drag to Orbit
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 2.5, 6.5], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#F97316" />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
          <group position={[0, -0.1, 0]}>
            {/* 3D Filtration Tunnel Rail Beams */}
            <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 9, 8]} />
              <meshBasicMaterial color="#332E29" />
            </mesh>
            <mesh position={[0, -1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 9, 8]} />
              <meshBasicMaterial color="#332E29" />
            </mesh>

            {/* Gate 1: Risk Threshold */}
            <PolicyGate
              position={[-2.8, 0, 0]}
              name="Gate 1: Risk Threshold"
              setting={`θ ≥ ${(threshold * 100).toFixed(0)}%`}
              color="#F97316"
              apertureRadius={thresholdAperture}
            />

            {/* Gate 2: Persistence Window */}
            <PolicyGate
              position={[-0.9, 0, 0]}
              name="Gate 2: Persistence"
              setting={`Window: ${persistence}h`}
              color="#FBBF24"
              apertureRadius={persistenceAperture}
            />

            {/* Gate 3: Cooldown Window */}
            <PolicyGate
              position={[1.0, 0, 0]}
              name="Gate 3: Cooldown"
              setting={`Silence: ${cooldown}h`}
              color="#38BDF8"
              apertureRadius={cooldownAperture}
            />

            {/* Gate 4: Daily Alarm Budget */}
            <PolicyGate
              position={[2.9, 0, 0]}
              name="Gate 4: Bed Quota"
              setting={`Max: ${cap}/day`}
              color="#10B981"
              apertureRadius={0.75}
            />

            {/* Streaming Particles */}
            <TelemetrySignalStream threshold={threshold} />
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={3.5} maxDistance={9} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div className="flex items-center space-x-2 text-stone-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            Simulated False Alarm Rate:{' '}
            <strong className="text-amber-400">{alarmsPerDay.toFixed(2)}</strong> alarms / pt-day
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-stone-400">
          <span>
            Clinical Sensitivity: <strong className="text-emerald-400">{(sensitivity * 100).toFixed(0)}%</strong>
          </span>
          <span>
            Suppression Efficiency:{' '}
            <strong className="text-orange-400">{((1 - alarmsPerDay / 3.4) * 100).toFixed(0)}% Noise Blocked</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
