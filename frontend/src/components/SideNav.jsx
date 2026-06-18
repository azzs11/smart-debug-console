import { LayoutDashboard, Radio, GitCommit, AlertTriangle, Brain, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'live-logs',     label: 'Live Logs',     icon: Radio },
  { id: 'causal-graph',  label: 'Causal Graph',  icon: GitCommit,     badge: 'NEW' },
  { id: 'anomalies',     label: 'Anomalies',     icon: AlertTriangle },
  { id: 'ml-performance',label: 'ML Performance',icon: Brain },
  { id: 'settings',      label: 'Settings',      icon: Settings },
];

const SideNav = ({ activeView, setActiveView, anomalyCount = 0, chainCount = 0 }) => (
  <nav className="sidenav">
    <div className="px-3 mb-4">
      <p className="text-xs text-text-muted uppercase tracking-widest font-semibold px-2 mb-2">Navigation</p>
    </div>

    <div className="flex flex-col gap-0.5 px-3 flex-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
        const isActive = activeView === id;
        const count = id === 'anomalies' ? anomalyCount : id === 'causal-graph' ? chainCount : 0;

        return (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
              isActive
                ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary border border-transparent'
            }`}
          >
            <Icon size={17} className={isActive ? 'text-accent-primary' : ''} />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="text-xs bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 px-1.5 py-0.5 rounded font-semibold">
                {badge}
              </span>
            )}
            {count > 0 && !badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                id === 'anomalies' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>

    <div className="mt-auto px-5 pt-4 border-t border-border-dim">
      <p className="text-xs text-text-muted">Chronolog v2.0</p>
      <p className="text-xs text-text-muted opacity-60">Causal Log Intelligence</p>
    </div>
  </nav>
);

export default SideNav;
