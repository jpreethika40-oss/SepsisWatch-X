import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

interface RadarMeshProps {
  features: string[];
  isShift: boolean;
  featurePsi: Record<string, number>;
}

const RadarMesh: React.FC<RadarMeshProps> = ({ features, isShift, featurePsi }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
      if (isShift) {
        // Jitter vibrating motion if sensor drift is injected
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 12) * 0.05;
      } else {
        groupRef.current.position.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.06, 16, 64]} />
        <meshStandardMaterial
          color={isShift ? '#EF4444' : '#F97316'}
          emissive={isShift ? '#EF4444' : '#F97316'}
          emissiveIntensity={isShift ? 0.8 : 0.4}
        />
      </mesh>

      {/* Radial Feature Spikes */}
      {features.map((feat, idx) => {
        const angle = (idx / Math.max(1, features.length)) * Math.PI * 2;
        const basePsi = featurePsi[feat] || 0.03;
        const psi = isShift ? basePsi * 4.5 : basePsi;
        const spikeLength = 0.5 + psi * 6.0;

        const x = Math.cos(angle) * (2.5 + spikeLength / 2);
        const z = Math.sin(angle) * (2.5 + spikeLength / 2);

        const color = psi >= 0.25 ? '#EF4444' : psi >= 0.1 ? '#FACC15' : '#10B981';

        return (
          <group key={feat} position={[x, 0, z]}>
            <mesh rotation={[0, -angle + Math.PI / 2, 0]}>
              <boxGeometry args={[0.2, 0.2, spikeLength]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
            </mesh>
            <Text
              position={[0, 0.4, 0]}
              fontSize={0.22}
              color="#F3EEE8"
              anchorX="center"
              anchorY="middle"
            >
              {`${feat} (${psi.toFixed(2)})`}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

export const DriftRadar3D: React.FC = () => {
  const { drift, driftInjected } = useStore();
  const features = Object.keys(drift.feature_psi || {
    HR: 0.031,
    SBP: 0.042,
    MAP: 0.038,
    Resp: 0.025,
    Temp: 0.019,
    Lactate: 0.035,
    WBC: 0.028,
  });
  const isShift = driftInjected || drift.overall_status !== 'green';

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-amber-500/20 bg-[#0C0B0A]">
      <Canvas camera={{ position: [0, 5, 7], fov: 42 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />

        <RadarMesh
          features={features}
          isShift={isShift}
          featurePsi={drift.feature_psi || {}}
        />

        <gridHelper args={[12, 12, '#FBBF24', '#332E29']} position={[0, -1, 0]} />
        <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={4} maxDistance={15} />
      </Canvas>

      <div className="absolute top-3 left-3 bg-[#151311]/80 px-2.5 py-1 rounded border border-[#332E29] text-[10px] font-mono text-amber-300">
        3D Population Stability Index (PSI) Sensor Radar
      </div>
    </div>
  );
};
