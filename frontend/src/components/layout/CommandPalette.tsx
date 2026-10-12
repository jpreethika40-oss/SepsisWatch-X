import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Search, X, LayoutDashboard, UserCheck, Bell, Sliders, Swords, Radar, FileText } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, patients, setSelectedPatientId } = useStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const quickLinks = [
    { name: 'Command Center (Ward 3D)', path: '/', icon: LayoutDashboard },
    { name: 'Patient Detail View', path: '/patient', icon: UserCheck },
    { name: 'Alert Center', path: '/alerts', icon: Bell },
    { name: 'What-If Physiological Lab', path: '/what-if', icon: Sliders },
    { name: 'Model Arena (LightGBM vs GRU-D)', path: '/arena', icon: Swords },
    { name: 'Drift Monitor Radar', path: '/drift', icon: Radar },
    { name: 'Admin & Audit Log', path: '/admin', icon: FileText },
  ];

  const filteredLinks = quickLinks.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));
  const filteredBeds = patients.filter(p => 
    `bed ${p.bed_number}`.includes(query.toLowerCase()) || 
    p.patient_code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden glass-panel">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Type a page, bed number, or action (e.g., 'Bed 3', 'Arena', 'Drift')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button onClick={() => setCommandPaletteOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Patients Section */}
          {filteredBeds.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-mono uppercase text-slate-500 font-semibold mb-1">
                Patients / Beds
              </p>
              <div className="space-y-1">
                {filteredBeds.slice(0, 6).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedPatientId(b.id);
                      navigate('/patient');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-cyan-500/20 text-slate-200 transition text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-cyan-400">Bed {b.bed_number}</span>
                      <span className="text-slate-400 font-mono">({b.patient_code})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      b.risk >= 0.7 ? 'bg-red-950 text-red-300' : b.risk >= 0.4 ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      Risk: {(b.risk * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Section */}
          <div>
            <p className="px-2 text-[10px] font-mono uppercase text-slate-500 font-semibold mb-1">
              Navigation
            </p>
            <div className="space-y-1">
              {filteredLinks.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      navigate(item.path);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition text-left"
                  >
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between font-mono">
          <span>Navigate with arrow keys</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
