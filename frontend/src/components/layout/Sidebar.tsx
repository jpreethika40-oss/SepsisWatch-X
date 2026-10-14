import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  LayoutDashboard, UserCheck, Bell, Sliders, ShieldAlert,
  GitCompare, Radar, UploadCloud,
  FileText, Info, Sparkles, Bot, Stethoscope, HeartPulse, Building2, LogOut
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { unreadAlertCount, escalations, drift, currentRole, logout } = useStore();
  const pendingEscalations = escalations.filter(e => e.status === 'pending').length;

  // Role-specific isolated navigation trees
  let sections: { title: string; items: NavItem[] }[] = [];

  if (currentRole === 'nurse') {
    sections = [
      {
        title: 'Bedside Nursing Care',
        items: [
          { 
            name: 'Bedside Telemetry & Triage', 
            path: '/nurse', 
            icon: HeartPulse, 
            badge: 'CHARGE RN', 
            badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
          },
          { 
            name: 'Bed Vitals & Observations', 
            path: '/patient', 
            icon: UserCheck 
          },
          { 
            name: 'Clinical AI Protocol Guide', 
            path: '/assistant', 
            icon: Bot, 
            badge: 'PROTOCOL', 
            badgeColor: 'bg-amber-950 text-amber-300 border border-amber-500/30' 
          },
        ]
      }
    ];
  } else if (currentRole === 'doctor') {
    sections = [
      {
        title: 'Attending Clinical Workspace',
        items: [
          { 
            name: 'Attending Diagnostic Workspace', 
            path: '/doctor', 
            icon: Stethoscope, 
            badge: pendingEscalations > 0 ? `${pendingEscalations} ESC` : 'ONLINE', 
            badgeColor: pendingEscalations > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-950 text-orange-400 border border-orange-500/30' 
          },
          { 
            name: '3D ICU Command Center', 
            path: '/', 
            icon: LayoutDashboard 
          },
          { 
            name: 'Patient EHR & Risk Detail', 
            path: '/patient', 
            icon: UserCheck 
          },
          { 
            name: 'Alert & Sign-off Center', 
            path: '/alerts', 
            icon: Bell, 
            badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
            badgeColor: 'bg-red-500 text-white' 
          },
        ]
      },
      {
        title: 'Diagnostic AI & Counterfactuals',
        items: [
          { 
            name: 'What-If Prediction Lab', 
            path: '/what-if', 
            icon: Sliders 
          },
          { 
            name: 'Explainable AI (SHAP)', 
            path: '/insights', 
            icon: Sparkles 
          },
          { 
            name: 'Clinical AI Consult', 
            path: '/assistant', 
            icon: Bot 
          },
          { 
            name: 'Interactive ML Studio', 
            path: '/gradio-studio', 
            icon: Sparkles, 
            badge: 'STUDIO', 
            badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
          },
        ]
      }
    ];
  } else {
    // Hospital Chief Executive / Governance
    sections = [
      {
        title: 'Executive Clinical Governance',
        items: [
          { 
            name: 'Chief Executive Dashboard', 
            path: '/chief', 
            icon: Building2, 
            badge: 'CHIEF', 
            badgeColor: 'bg-amber-950 text-amber-400 border border-amber-500/30' 
          },
          { 
            name: 'Clinical Benchmark Comparison', 
            path: '/benchmark', 
            icon: GitCompare,
            badge: 'BENCHMARK',
            badgeColor: 'bg-orange-950 text-orange-300 border border-orange-500/30'
          },
          { 
            name: 'Alarm Budget Policy Control', 
            path: '/policy', 
            icon: ShieldAlert 
          },
        ]
      },
      {
        title: 'Hospital Telemetry & Quality',
        items: [
          { 
            name: 'Model Arena & Evaluation', 
            path: '/scoreboard', 
            icon: GitCompare 
          },
          { 
            name: 'Population Drift Monitor (3D)', 
            path: '/drift', 
            icon: Radar,
            badge: drift.overall_status.toUpperCase(),
            badgeColor: drift.overall_status === 'green' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
          },
          { 
            name: 'Audit Trail & Compliance', 
            path: '/admin', 
            icon: FileText 
          },
          { 
            name: 'Dual-Hospital Overview', 
            path: '/about', 
            icon: Info 
          },
        ]
      }
    ];
  }

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

      {/* Footer System Provenance Note & Persistent Logout Button */}
      <div className="p-4 border-t border-[#332E29] text-[11px] font-mono text-[#A09689] space-y-2">
        <div className="flex items-center justify-between text-stone-400">
          <span>Active Role</span>
          <span className="capitalize text-amber-400 font-semibold">{currentRole.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center justify-between text-stone-500">
          <span>Platform</span>
          <span>SepsisWatch-X v1.0</span>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
          className="w-full mt-2 py-2 px-3 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-red-200 hover:text-white flex items-center justify-center space-x-2 text-xs font-mono font-bold transition shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Logout / Switch Role</span>
        </button>
      </div>
    </aside>
  );
};
