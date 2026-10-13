import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface BiomarkerCell {
  biomarker: string;
  category: 'Vital' | 'Blood Gas' | 'Chemistry' | 'Hematology';
  bedId: number;
  hoursMissing: number; // 0 = fresh, >6 = stale, >12 = critical missing
  isObserved: boolean;
}

const BIOMARKERS = [
  { name: 'HR', cat: 'Vital' },
  { name: 'SBP', cat: 'Vital' },
  { name: 'MAP', cat: 'Vital' },
  { name: 'Resp', cat: 'Vital' },
  { name: 'Temp', cat: 'Vital' },
  { name: 'O2Sat', cat: 'Vital' },
  { name: 'pH', cat: 'Blood Gas' },
  { name: 'PaCO2', cat: 'Blood Gas' },
  { name: 'BaseExcess', cat: 'Blood Gas' },
  { name: 'Lactate', cat: 'Chemistry' },
  { name: 'Creatinine', cat: 'Chemistry' },
  { name: 'BUN', cat: 'Chemistry' },
  { name: 'Bilirubin', cat: 'Chemistry' },
  { name: 'Glucose', cat: 'Chemistry' },
  { name: 'WBC', cat: 'Hematology' },
  { name: 'Platelets', cat: 'Hematology' },
] as const;

export const DataQualityHeatmap3D: React.FC = () => {
  const [selectedCell, setSelectedCell] = useState<BiomarkerCell | null>(null);

  // Generate realistic missingness distribution across 12 beds
  const gridData = useMemo(() => {
    const data: BiomarkerCell[] = [];
    for (let bed = 1; bed <= 12; bed++) {
      BIOMARKERS.forEach((bm, bIdx) => {
        let missing = 0;
        if (bm.cat === 'Vital') {
          // Vitals: sampled frequently (0 to 2h missing)
          missing = (bed + bIdx) % 5 === 0 ? 1 : 0;
        } else if (bm.cat === 'Blood Gas') {
          // Blood Gas: intermittent (3 to 8h missing)
          missing = ((bed * 3 + bIdx) % 8) + 1;
        } else if (bm.cat === 'Chemistry') {
          // Chemistry: routine labs (4 to 16h missing)
          missing = ((bed * 5 + bIdx) % 16) + 2;
        } else {
          // Hematology: 6 to 18h missing
          missing = ((bed * 7 + bIdx) % 18) + 3;
        }

        data.push({
          biomarker: bm.name,
          category: bm.cat as any,
          bedId: bed,
          hoursMissing: missing,
          isObserved: missing === 0,
        });
      });
    }
    return data;
  }, []);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-amber-500/20 bg-[#0C0B0A]">
      <Canvas camera={{ position: [0, 10, 14], fov: 42 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />

        {/* 3D Heatmap Pillar Grid */}
        <group position={[-5.6, 0, -4]}>
          {gridData.map((cell, idx) => {
            const x = (BIOMARKERS.findIndex((b) => b.name === cell.biomarker)) * 0.75;
            const z = (cell.bedId - 1) * 0.72;

            // Pillar height represents missingness / sampling latency
            const h = Math.max(0.12, (cell.hoursMissing / 18) * 2.8);

            // Ember color palette mapping:
            // Fresh (<2h): Emerald #10B981
            // Normal (<6h): Gold #FBBF24
            // Overdue (<12h): Ember Orange #F97316
            // Critical (>12h): Crimson #EF4444
            const color =
              cell.hoursMissing <= 1
                ? '#10B981'
                : cell.hoursMissing <= 5
                ? '#FBBF24'
                : cell.hoursMissing <= 11
                ? '#F97316'
                : '#EF4444';

            const isHovered =
              selectedCell?.bedId === cell.bedId &&
              selectedCell?.biomarker === cell.biomarker;

            return (
              <mesh
                key={idx}
                position={[x, h / 2, z]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setSelectedCell(cell);
                }}
                onPointerOut={() => setSelectedCell(null)}
              >
                <boxGeometry args={[0.62, h, 0.58]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isHovered ? 0.8 : 0.25}
                  roughness={0.3}
                  metalness={0.4}
                />
              </mesh>
            );
          })}
        </group>

        {/* Axis Labels */}
        <Text
          position={[0, 0.1, 5.2]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          color="#FBBF24"
          anchorX="center"
        >
          Biomarkers: Vitals (Left) → Blood Gas → Chemistry → Hematology (Right)
        </Text>
        <Text
          position={[-6.8, 0.1, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.35}
          color="#A09689"
          anchorX="center"
        >
          ICU Ward Beds (Bed 1 to 12)
        </Text>

        <gridHelper args={[16, 16, '#F97316', '#332E29']} position={[0, -0.05, 0]} />
        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={22} />
      </Canvas>

      {/* Floating Header */}
      <div className="absolute top-3 left-3 bg-[#151311]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs font-mono">
        <span className="text-amber-400 font-bold uppercase tracking-wider">
          3D Data Quality & Missingness Radar
        </span>
        <div className="text-[10px] text-[#A09689] mt-0.5">
          Elevation = Observation Latency (Hours since last measurement)
        </div>
      </div>

      {/* Dynamic Hover Tooltip */}
      {selectedCell && (
        <div className="absolute bottom-3 left-3 bg-[#151311]/95 px-3 py-2 rounded-lg border border-amber-500/40 text-xs font-mono shadow-glow-gold">
          <div className="flex items-center space-x-2 text-amber-300 font-bold">
            <span>Bed {selectedCell.bedId}</span>
            <span>•</span>
            <span>{selectedCell.biomarker} ({selectedCell.category})</span>
          </div>
          <div className="text-[11px] text-[#F3EEE8] mt-0.5">
            {selectedCell.hoursMissing === 0
              ? 'Fresh observation recorded within the current hour.'
              : `Last observed ${selectedCell.hoursMissing}h ago (${selectedCell.hoursMissing > 12 ? 'Severe Sparsity Alert' : 'Forward-filled delta-t active'}).`}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-[#151311]/90 px-3 py-2 rounded-lg border border-[#332E29] text-[10px] font-mono flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[#A09689]">Fresh (&lt;2h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          <span className="text-[#A09689]">Cadence (2-5h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-[#A09689]">Stale (6-11h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-[#A09689]">Sparse (&ge;12h)</span>
        </div>
      </div>
    </div>
  );
};
