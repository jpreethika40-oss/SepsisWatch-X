import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  LayoutDashboard, UserCheck, Bell, Sliders, ShieldAlert,
  GitCompare, Radar, UploadCloud,
  FileText, Info, Sparkles, Bot, Stethoscope, HeartPulse, Building2
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { unreadAlertCount, drift, currentRole } = useStore();

  // Role-specific quick launch item
  const roleWorkspaceItem: NavItem = 
    currentRole === 'doctor'
      ? { name: 'Doctor Workspace', path: '/doctor', icon: Stethoscope, badge: 'ATTENDING', badgeColor: 'bg-orange-950 text-orange-400 border border-orange-500/30' }
      : currentRole === 'nurse'
      ? { name: 'Nurse Bedside', path: '/nurse', icon: HeartPulse, badge: 'CHARGE RN', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' }
      : { name: 'Chief Dashboard', path: '/chief', icon: Building2, badge: 'CHIEF', badgeColor: 'bg-amber-950 text-amber-400 border border-amber-500/30' };

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Active Workspace',
      items: [
        roleWorkspaceItem,
        { name: '3D Command Center', path: '/', icon: LayoutDashboard },
        { name: 'Patient Detail (EHR)', path: '/patient', icon: UserCheck },
        { 
          name: 'Alert Center', 
          path: '/alerts', 
          icon: Bell, 
          badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
          badgeColor: 'bg-red-500 text-white animate-pulse'
        },
      ]
    },
    {
      title: 'Clinical AI & Simulation',
      items: [
        { 
          name: 'AI Clinical Assistant', 
          path: '/assistant', 
          icon: Bot,
          badge: 'ONLINE',
          badgeColor: 'bg-amber-950 text-amber-300 border border-amber-500/40 glow-ember'
        },
        { name: 'What-If Prediction Lab', path: '/what-if', icon: Sliders },
        { name: 'Explainable AI (SHAP)', path: '/insights', icon: Sparkles },
        { 
          name: 'Gradio ML Studio', 
          path: '/gradio-studio', 
          icon: Sparkles, 
          badge: 'STUDIO', 
          badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
        },
      ]
    },
    {
      title: 'ICU Telemetry & Safety',
      items: [
        { 
          name: 'Drift Monitor (3D)', 
          path: '/drift', 
          icon: Radar,
          badge: drift.overall_status.toUpperCase(),
          badgeColor: drift.overall_status === 'green' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
        },
        { name: 'Alarm Policy Simulator', path: '/policy', icon: ShieldAlert },
        { name: 'Model Arena & Metrics', path: '/scoreboard', icon: GitCompare },
        { name: 'Dataset Upload Studio', path: '/upload', icon: UploadCloud },
        { name: 'Admin & Audit Trail', path: '/admin', icon: FileText },
        { name: 'Clinical Governance', path: '/about', icon: Info },
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
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.badgeColor || 'bg-[#332E29] text-[#A09689]'}`}>
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

      {/* Footer System Provenance Note */}
      <div className="p-4 border-t border-[#332E29] text-[11px] font-mono text-[#A09689] space-y-1">
        <div className="flex items-center justify-between text-stone-400">
          <span>Active Role</span>
          <span className="capitalize text-amber-400 font-semibold">{currentRole.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center justify-between text-stone-500">
          <span>Platform</span>
          <span>SepsisWatch-X v1.0</span>
        </div>
      </div>
    </aside>
  );
};
