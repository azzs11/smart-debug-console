import { useState } from 'react';
import {
  LayoutDashboard, Radio, GitCommit, AlertTriangle,
  Brain, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';

// Colors for the always-dark sidebar surface
const D = {
  textPrimary:   '#f0faf5',
  textSecondary: 'rgba(240,250,245,0.55)',
  textMuted:     'rgba(240,250,245,0.28)',
  accent:        '#22d3a5',
  accentSecondary: '#c4b5fd',
  activeBg:      'rgba(34,211,165,0.1)',
  activeBorder:  'rgba(34,211,165,0.25)',
  hoverBg:       'rgba(255,255,255,0.05)',
  border:        'rgba(255,255,255,0.07)',
};

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'live-logs',      label: 'Live Logs',      icon: Radio },
  { id: 'causal-graph',   label: 'Causal Graph',   icon: GitCommit,      badge: 'NEW' },
  { id: 'anomalies',      label: 'Anomalies',      icon: AlertTriangle },
  { id: 'ml-performance', label: 'ML Performance', icon: Brain },
  { id: 'settings',       label: 'Settings',       icon: Settings },
];

const SideNav = ({ activeView, setActiveView, anomalyCount = 0, chainCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('chronolog_sidebar') === 'collapsed'
  );

  const toggle = () => setCollapsed(c => {
    const next = !c;
    localStorage.setItem('chronolog_sidebar', next ? 'collapsed' : 'expanded');
    return next;
  });

  return (
    <nav
      className="sidenav"
      style={{
        width: collapsed ? 56 : 220,
        minWidth: collapsed ? 56 : 220,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Toggle */}
      <div className={`flex mb-3 px-2 ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: D.textMuted }}
          onMouseEnter={e => { e.currentTarget.style.color = D.accent; e.currentTarget.style.background = D.hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.color = D.textMuted; e.currentTarget.style.background = 'transparent'; }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const isActive = activeView === id;
          const count = id === 'anomalies' ? anomalyCount : id === 'causal-graph' ? chainCount : 0;

          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              title={collapsed ? label : undefined}
              className="relative flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 border whitespace-nowrap"
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 12px',
                gap: collapsed ? 0 : 12,
                color:      isActive ? D.accent        : D.textSecondary,
                background: isActive ? D.activeBg      : 'transparent',
                borderColor: isActive ? D.activeBorder : 'transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = D.hoverBg;
                  e.currentTarget.style.color = D.textPrimary;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = D.textSecondary;
                }
              }}
            >
              <Icon size={17} className="shrink-0" />

              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{label}</span>
                  {badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0"
                      style={{
                        background: 'rgba(196,181,253,0.15)',
                        border: '1px solid rgba(196,181,253,0.3)',
                        color: D.accentSecondary,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  {count > 0 && !badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0"
                      style={{
                        background: id === 'anomalies' ? 'rgba(251,191,36,0.15)' : D.activeBg,
                        color:      id === 'anomalies' ? '#fbbf24'               : D.accent,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </>
              )}

              {collapsed && count > 0 && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: D.accent, minWidth: 6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto px-5 pt-4" style={{ borderTop: D.border }}>
          <p className="text-xs font-display" style={{ color: D.textMuted }}>Chronolog v2.0</p>
          <p className="text-xs opacity-50" style={{ color: D.textMuted }}>Causal Log Intelligence</p>
        </div>
      )}
    </nav>
  );
};

export default SideNav;
