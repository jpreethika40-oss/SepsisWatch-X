import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

interface Scoreboard3DProps {
  models: {
    name: string;
    utilityInHosp: number;
    utilityCrossHosp: number;
  }[];
}

export const Scoreboard3D: React.FC<Scoreboard3DProps> = ({ models }) => {
  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-950">
      <Canvas camera={{ position: [0, 5, 8], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />

        {/* 3D Bars for In-Hospital vs Cross-Hospital Utility Score */}
        {models.map((m, idx) => {
          const x = (idx - (models.length - 1) / 2) * 1.6;

          // In-Hospital Bar (Cyan)
          const h1 = Math.max(0.1, m.utilityInHosp * 5.0);
          // Cross-Hospital Bar (Amber or Crimson if steep drop, Cyan if robust)
          const h2 = Math.max(0.1, m.utilityCrossHosp * 5.0);
          const drop = m.utilityInHosp - m.utilityCrossHosp;
          const crossColor = drop > 0.08 ? '#ef4444' : drop > 0.04 ? '#f59e0b' : '#06b6d4';

          return (
            <group key={idx} position={[x, 0, 0]}>
              {/* In-Hospital Bar */}
              <mesh position={[-0.3, h1 / 2, 0]}>
                <boxGeometry args={[0.4, h1, 0.4]} />
                <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.4} />
              </mesh>

              {/* Cross-Hospital Bar */}
              <mesh position={[0.3, h2 / 2, 0]}>
                <boxGeometry args={[0.4, h2, 0.4]} />
                <meshStandardMaterial color={crossColor} roughness={0.3} metalness={0.4} />
              </mesh>

              {/* Model Label */}
              <Text position={[0, -0.4, 0.8]} fontSize={0.2} color="#94a3b8" anchorX="center">
                {m.name}
              </Text>

              {/* Utility Scores */}
              <Text position={[-0.3, h1 + 0.3, 0]} fontSize={0.16} color="#06b6d4" anchorX="center">
                {m.utilityInHosp.toFixed(2)}
              </Text>
              <Text position={[0.3, h2 + 0.3, 0]} fontSize={0.16} color={crossColor} anchorX="center">
                {m.utilityCrossHosp.toFixed(2)}
              </Text>
            </group>
          );
        })}

        <gridHelper args={[14, 14, '#06b6d4', '#1e293b']} position={[0, 0, 0]} />
        <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={4} maxDistance={15} />
      </Canvas>

      <div className="absolute top-3 left-3 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800 text-[10px] font-mono flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
          <span className="text-slate-300">In-Hospital (A→A)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" />
          <span className="text-slate-300">Cross-Hospital Transfer (A→B)</span>
        </div>
      </div>
    </div>
  );
};
