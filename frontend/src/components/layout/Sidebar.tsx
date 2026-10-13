import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  LayoutDashboard, UserCheck, Bell, Sliders, Swords, ShieldAlert,
  GitCompare, Radar, FlaskConical, LineChart, Cpu, UploadCloud,
  FileText, Info, Sparkles, Terminal
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
        { 
          name: 'Gradio ML Studio', 
          path: '/gradio-studio', 
          icon: Sparkles, 
          badge: 'STUDIO', 
          badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
        },
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
      title: 'Governance & APIs',
      items: [
        { name: 'Admin & Audit', path: '/admin', icon: FileText },
        { 
          name: 'Interactive API Docs', 
          path: '/api-explorer', 
          icon: Terminal, 
          badge: 'SWAGGER', 
          badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
        },
        { name: 'About / Limits', path: '/about', icon: Info },
      ]
    }
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#332E29] bg-[#151311]/70 backdrop-blur-md flex flex-col justify-between overflow-y-auto">
      <div className="p-3 space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h2 className="px-3 text-[11px] font-mono uppercase tracking-wider text-[#A09689] font-semibold">
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
                          ? 'bg-orange-500/15 text-amber-300 border border-orange-500/30 font-semibold glow-ember'
                          : 'text-[#A09689] hover:text-[#F3EEE8] hover:bg-[#1E1B18]'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-[#1E1B18] text-[#F3EEE8]'}`}>
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
      <div className="p-3 border-t border-[#332E29] bg-[#0C0B0A]/60">
        <div className="bg-[#151311]/80 rounded-lg p-2.5 border border-[#332E29] text-[11px] space-y-1">
          <div className="flex justify-between text-[#A09689] font-mono">
            <span>Stack:</span>
            <span className="text-orange-400 font-bold">LightGBM + GRU-D + DANN</span>
          </div>
          <div className="flex justify-between text-[#A09689] font-mono">
            <span>Coverage:</span>
            <span className="text-emerald-400">90% Split Conformal</span>
          </div>
          <div className="flex justify-between text-[#A09689] font-mono">
            <span>Utility Score:</span>
            <span className="text-amber-300 font-bold">0.452 (CinC)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
