import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

interface DecisionManifold3DProps {
  sbp: number;
  lactate: number;
  risk: number;
  threshold?: number;
}

const SurfaceMesh: React.FC<{ threshold: number }> = ({ threshold }) => {
  // Generate 3D grid surface: X = SBP (60 to 160), Z = Lactate (0.5 to 6.0), Y = Risk (0 to 1)
  const segments = 32;
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(6, 6, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); // Normalized SBP (-3 to 3)
      const z = pos.getZ(i); // Normalized Lactate (-3 to 3)

      // Physics-based sepsis response function
      // SBP drops -> risk rises; Lactate rises -> risk rises
      const normSbp = 110 - x * 15; // maps to ~65 - 155 mmHg
      const normLac = 3.0 + z * 0.8; // maps to ~0.6 - 5.4 mmol/L

      let r = 0.15;
      if (normSbp < 90) r += ((90 - normSbp) / 40) * 0.45;
      if (normLac > 2.0) r += ((normLac - 2.0) / 4.0) * 0.45;

      const yVal = Math.min(1.0, Math.max(0.05, r)) * 2.2 - 1.1; // scale height
      pos.setY(i, yVal);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* 3D Wireframe + Translucent Surface */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#F97316"
          wireframe
          transparent
          opacity={0.35}
          emissive="#C2410C"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#1E1B18"
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Threshold Cut-Plane */}
      <mesh position={[0, threshold * 2.2 - 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.2, 6.2]} />
        <meshBasicMaterial
          color="#FBBF24"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// Current Patient Glowing Beacon
const PatientBeacon: React.FC<{ sbp: number; lactate: number; risk: number; threshold: number }> = ({
  sbp,
  lactate,
  risk,
  threshold
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Map patient sbp (60..160) to x (-3..3)
  const posX = -((sbp - 110) / 15);
  // Map patient lactate (0.5..6.0) to z (-3..3)
  const posZ = (lactate - 3.0) / 0.8;
  const posY = risk * 2.2 - 1.1;

  const isCritical = risk >= threshold;
  const beaconColor = isCritical ? '#EF4444' : risk >= 0.35 ? '#FBBF24' : '#10B981';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const scale = 1 + Math.sin(t * 6) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 2;
    }
  });

  return (
    <group position={[posX, posY, posZ]}>
      {/* 3D Vertical Drop Indicator Line to Base */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, -posY - 1.1, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={beaconColor} transparent opacity={0.6} />
      </line>

      {/* Pulsing Beacon Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Halo */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshBasicMaterial color={beaconColor} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {/* Floating 3D Telemetry Tooltip */}
      <Html distanceFactor={8} position={[0, 0.45, 0]}>
        <div className="px-2.5 py-1.5 rounded-lg bg-stone-950/90 border border-amber-500/40 backdrop-blur-md shadow-xl text-center text-[10px] font-mono whitespace-nowrap text-white">
          <div className="font-bold flex items-center justify-center space-x-1" style={{ color: beaconColor }}>
            <span>●</span>
            <span>Risk: {(risk * 100).toFixed(1)}%</span>
          </div>
          <div className="text-[9px] text-stone-400">
            SBP {sbp} | Lac {lactate.toFixed(1)}
          </div>
        </div>
      </Html>
    </group>
  );
};

export const DecisionManifold3D: React.FC<DecisionManifold3DProps> = ({
  sbp,
  lactate,
  risk,
  threshold = 0.45
}) => {
  return (
    <div className="relative w-full h-[380px] rounded-xl overflow-hidden glass-panel border border-amber-500/20 glow-ember">
      {/* Title & Info Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-bold font-display text-white">3D Sepsis Decision Manifold</span>
          <span className="text-[10px] text-stone-400 font-mono block">Counterfactual Response Surface (SBP × Lactate)</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] font-mono text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800">
        Threshold Plane: {(threshold * 100).toFixed(0)}% • Orbit: Drag
      </div>

      {/* Canvas */}
      <Canvas camera={{ position: [4.5, 3.8, 5.2], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#F97316" />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
          <group position={[0, 0, 0]}>
            <SurfaceMesh threshold={threshold} />
            <PatientBeacon sbp={sbp} lactate={lactate} risk={risk} threshold={threshold} />

            {/* Axis Helper Grid */}
            <gridHelper args={[6, 6, '#332E29', '#1E1B18']} position={[0, -1.15, 0]} />
          </group>
        </Float>

        <OrbitControls enableZoom={true} minDistance={3} maxDistance={9} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      {/* Bottom Status Ribbon */}
      <div className="absolute bottom-3 left-3 right-3 z-10 p-2 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-stone-300">
          {risk >= threshold ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span>
            Operating State:{' '}
            <strong className={risk >= threshold ? 'text-red-400' : 'text-emerald-400'}>
              {risk >= threshold ? 'CRITICAL ALARM ZONE' : 'STABLE BUFFER ZONE'}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-stone-400">
          Distance to Boundary: <strong className="text-white">{(Math.abs(risk - threshold) * 100).toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
};
