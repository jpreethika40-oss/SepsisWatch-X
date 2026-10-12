import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const RiskLandscape3D: React.FC = () => {
  const { currentSimHour, is2DMode } = useStore();

  // Create surface mesh representing hours (x) vs patients (z) vs sepsis risk (y)
  const { geometry, colors } = useMemo(() => {
    const width = 12; // 12 patients
    const depth = 24; // 24 hours of ICU stay
    const geom = new THREE.PlaneGeometry(12, 16, width - 1, depth - 1);
    geom.rotateX(-Math.PI / 2);

    const positions = geom.attributes.position;
    const colorArr: number[] = [];

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Model progressive deterioration for septic patients
      const patientIdx = Math.floor(((x + 6) / 12) * 12);
      const hour = Math.floor(((z + 8) / 16) * 24);

      let risk = 0.15;
      if (patientIdx === 2) {
        // Patient 3 deteriorates sharply after hour 8
        risk = hour > 8 ? Math.min(0.95, 0.2 + (hour - 8) * 0.08) : 0.15;
      } else if (patientIdx === 6) {
        risk = hour > 12 ? Math.min(0.68, 0.2 + (hour - 12) * 0.05) : 0.18;
      } else {
        risk = 0.12 + Math.sin(x * 0.5 + z * 0.3) * 0.08;
      }

      // Height Y corresponds to risk
      positions.setY(i, risk * 3.5);

      // Color encoding
      if (risk >= 0.7) {
        colorArr.push(0.93, 0.27, 0.27); // Red
      } else if (risk >= 0.4) {
        colorArr.push(0.96, 0.62, 0.07); // Amber
      } else {
        colorArr.push(0.06, 0.72, 0.50); // Emerald
      }
    }

    geom.computeVertexNormals();
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
    return { geometry: geom, colors: colorArr };
  }, [currentSimHour]);

  if (is2DMode) {
    return (
      <div className="w-full h-full bg-slate-950/70 p-4 rounded-xl border border-cyan-500/20 flex flex-col justify-center items-center text-center">
        <span className="text-cyan-400 font-mono text-sm">2D Risk Heatmap Elevation Available</span>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Risk surface maps ICU stay hours (1-24) against active ward patients. Switch to 3D mode in the top navigation to interact with the full topological elevation.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-950">
      <Canvas camera={{ position: [9, 8, 12], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.0} />

        <mesh geometry={geometry}>
          <meshStandardMaterial vertexColors wireframe={false} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Wireframe overlay */}
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#38bdf8" wireframe={true} transparent opacity={0.25} />
        </mesh>

        <gridHelper args={[20, 20, '#06b6d4', '#1e293b']} position={[0, -0.05, 0]} />

        <Text position={[-6.5, 0.2, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.4} color="#94a3b8">
          Patients (Beds 1-12)
        </Text>
        <Text position={[0, 0.2, 9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="#94a3b8">
          ICU Stay Hours (1-24)
        </Text>

        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={25} />
      </Canvas>
      <div className="absolute top-3 left-3 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono text-cyan-300">
        3D Temporal Risk Surface (Topology of Deterioration)
      </div>
    </div>
  );
};
