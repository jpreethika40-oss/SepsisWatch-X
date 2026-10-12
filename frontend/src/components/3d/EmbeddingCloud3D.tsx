import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface EmbeddingCloudProps {
  useDANN: boolean;
  colorBy: 'hospital' | 'sepsis';
}

const PointsMorph: React.FC<EmbeddingCloudProps> = ({ useDANN, colorBy }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate synthetic 3D point cloud of 500 patient-hours
  const { beforePositions, afterPositions, colorsHospital, colorsSepsis } = useMemo(() => {
    const count = 500;
    const beforePos = new Float32Array(count * 3);
    const afterPos = new Float32Array(count * 3);
    const colHosp = new Float32Array(count * 3);
    const colSep = new Float32Array(count * 3);

    const rng = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const isHospitalA = i < count / 2;
      const isSeptic = i % 14 === 0;

      // Before DANN: Two distinct hospital clusters (Domain shift)
      const centerA: [number, number, number] = [-2.8, 0, 0];
      const centerB: [number, number, number] = [2.8, 0, 0];
      const center = isHospitalA ? centerA : centerB;

      const r = rng(i * 3) * 1.8;
      const theta = rng(i * 3 + 1) * Math.PI * 2;
      const phi = rng(i * 3 + 2) * Math.PI;

      const bx = center[0] + r * Math.sin(phi) * Math.cos(theta);
      const by = center[1] + r * Math.sin(phi) * Math.sin(theta);
      const bz = center[2] + r * Math.cos(phi);

      beforePos[i * 3] = bx;
      beforePos[i * 3 + 1] = by;
      beforePos[i * 3 + 2] = bz;

      // After DANN: Clusters align into unified invariant manifold, separated by clinical sepsis state
      const sepCenter: [number, number, number] = isSeptic ? [0, 2.2, 0] : [0, -0.6, 0];
      afterPos[i * 3] = sepCenter[0] + (r * 0.9) * Math.sin(phi) * Math.cos(theta);
      afterPos[i * 3 + 1] = sepCenter[1] + (r * 0.9) * Math.sin(phi) * Math.sin(theta);
      afterPos[i * 3 + 2] = sepCenter[2] + (r * 0.9) * Math.cos(phi);

      // Hospital color: Hospital A = Cyan, Hospital B = Magenta/Orange
      if (isHospitalA) {
        colHosp[i * 3] = 0.02; // Cyan
        colHosp[i * 3 + 1] = 0.71;
        colHosp[i * 3 + 2] = 0.83;
      } else {
        colHosp[i * 3] = 0.96; // Orange/Amber
        colHosp[i * 3 + 1] = 0.62;
        colHosp[i * 3 + 2] = 0.07;
      }

      // Sepsis color: Sepsis = Red, Non-Sepsis = Emerald
      if (isSeptic) {
        colSep[i * 3] = 0.93; // Red
        colSep[i * 3 + 1] = 0.27;
        colSep[i * 3 + 2] = 0.27;
      } else {
        colSep[i * 3] = 0.06; // Emerald
        colSep[i * 3 + 1] = 0.72;
        colSep[i * 3 + 2] = 0.50;
      }
    }

    return {
      beforePositions: beforePos,
      afterPositions: afterPos,
      colorsHospital: colHosp,
      colorsSepsis: colSep,
    };
  }, []);

  // Animated interpolation between Before and After DANN positions
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    const target = useDANN ? afterPositions : beforePositions;
    const current = posAttr.array as Float32Array;

    for (let i = 0; i < current.length; i++) {
      current[i] += (target[i] - current[i]) * Math.min(1.0, delta * 3.5);
    }
    posAttr.needsUpdate = true;
  });

  const activeColors = colorBy === 'hospital' ? colorsHospital : colorsSepsis;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(beforePositions), 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[activeColors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        vertexColors
        transparent
        opacity={0.88}
        sizeAttenuation
      />
    </points>
  );
};

export const EmbeddingCloud3D: React.FC<EmbeddingCloudProps> = ({ useDANN, colorBy }) => {
  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-950">
      <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <PointsMorph useDANN={useDANN} colorBy={colorBy} />
        <OrbitControls enableZoom={true} enableRotate={true} />
      </Canvas>

      <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
        <span className="text-cyan-400 font-bold">
          {useDANN ? 'Domain Invariant Space (After DANN)' : 'Raw Latent Space (Before DANN - Domain Gap)'}
        </span>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {colorBy === 'hospital'
            ? 'Colored by Hospital: Blue = Hospital A, Orange = Hospital B'
            : 'Colored by Sepsis: Red = Sepsis, Green = Non-Sepsis'}
        </div>
      </div>
    </div>
  );
};
