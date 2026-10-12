import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  LayoutDashboard, UserCheck, Bell, Sliders, Swords, ShieldAlert,
  GitCompare, Radar, FlaskConical, LineChart, Cpu, UploadCloud,
  FileText, Info
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { unreadAlertCount, drift } = useStore();

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Clinical Operations',
      items: [
        { name: 'Command Center', path: '/', icon: LayoutDashboard },
        { name: 'Patient Detail', path: '/patient', icon: UserCheck },
        { 
          name: 'Alert Center', 
          path: '/alerts', 
          icon: Bell, 
          badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
          badgeColor: 'bg-red-500 text-white animate-pulse'
        },
        { name: 'What-If Lab', path: '/what-if', icon: Sliders },
      ]
    },
    {
      title: 'ML Intelligence',
      items: [
        { name: 'Model Arena', path: '/arena', icon: Swords },
        { name: 'Alarm Budget', path: '/policy', icon: ShieldAlert },
        { name: 'Scoreboard', path: '/scoreboard', icon: GitCompare },
        { 
          name: 'Drift Monitor', 
          path: '/drift', 
          icon: Radar,
          badge: drift.overall_status.toUpperCase(),
          badgeColor: drift.overall_status === 'green' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
        },
      ]
    },
    {
      title: 'Science & Evidence',
      items: [
        { name: 'Insights Lab', path: '/insights', icon: FlaskConical },
        { name: 'Benchmark & Errors', path: '/benchmark', icon: LineChart },
        { name: 'Experiments', path: '/experiments', icon: Cpu },
        { name: 'Data Upload', path: '/upload', icon: UploadCloud },
      ]
    },
    {
      title: 'Governance',
      items: [
        { name: 'Admin & Audit', path: '/admin', icon: FileText },
        { name: 'About / Limits', path: '/about', icon: Info },
      ]
    }
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-clinical-surface/60 backdrop-blur-md flex flex-col justify-between overflow-y-auto">
      <div className="p-3 space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h2 className="px-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              {sec.title}
            </h2>
            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold glow-cyan'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/60 bg-slate-950/40">
        <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 text-[11px] space-y-1">
          <div className="flex justify-between text-slate-400 font-mono">
            <span>Stack:</span>
            <span className="text-cyan-400 font-bold">LightGBM + GRU-D + DANN</span>
          </div>
          <div className="flex justify-between text-slate-400 font-mono">
            <span>Coverage:</span>
            <span className="text-emerald-400">90% Split Conformal</span>
          </div>
          <div className="flex justify-between text-slate-400 font-mono">
            <span>Utility Score:</span>
            <span className="text-cyan-300 font-bold">0.452 (CinC)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
