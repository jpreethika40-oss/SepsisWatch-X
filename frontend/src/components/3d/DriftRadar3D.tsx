import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const DriftRadar3D: React.FC = () => {
  const { drift, driftInjected } = useStore();
  const groupRef = useRef<THREE.Group>(null);

  const features = Object.keys(drift.feature_psi);
  const isShift = driftInjected || drift.overall_status !== 'green';

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
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-950">
      <Canvas camera={{ position: [0, 5, 7], fov: 42 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />

        {/* Central Hub Ring */}
        <group ref={groupRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.5, 0.06, 16, 64]} />
            <meshStandardMaterial
              color={isShift ? '#ef4444' : '#06b6d4'}
              emissive={isShift ? '#ef4444' : '#06b6d4'}
              emissiveIntensity={isShift ? 0.8 : 0.4}
            />
          </mesh>

          {/* Radial Feature Spikes */}
          {features.map((feat, idx) => {
            const angle = (idx / features.length) * Math.PI * 2;
            const basePsi = drift.feature_psi[feat] || 0.03;
            const psi = isShift ? basePsi * 4.5 : basePsi;
            const spikeLength = 0.5 + psi * 6.0;

            const x = Math.cos(angle) * (2.5 + spikeLength / 2);
            const z = Math.sin(angle) * (2.5 + spikeLength / 2);

            const color =
              psi >= 0.25 ? '#ef4444' : psi >= 0.1 ? '#f59e0b' : '#10b981';

            return (
              <group key={feat} position={[x, 0, z]}>
                <mesh rotation={[0, -angle + Math.PI / 2, 0]}>
                  <boxGeometry args={[0.2, 0.2, spikeLength]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
                </mesh>
                <Text
                  position={[0, 0.4, 0]}
                  fontSize={0.22}
                  color="#f8fafc"
                  anchorX="center"
                  anchorY="middle"
                >
                  {`${feat} (${psi.toFixed(2)})`}
                </Text>
              </group>
            );
          })}
        </group>

        <gridHelper args={[12, 12, '#38bdf8', '#1e293b']} position={[0, -1, 0]} />
        <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={4} maxDistance={15} />
      </Canvas>

      <div className="absolute top-3 left-3 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono text-cyan-300">
        3D Population Stability Index (PSI) Sensor Radar
      </div>
    </div>
  );
};
