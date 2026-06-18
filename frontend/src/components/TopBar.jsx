import { Brain, Settings } from 'lucide-react';

const SparkLine = ({ data = [], color = '#6366f1' }) => {
  if (data.length < 2) return <div className="w-16 h-4" />;
  const max = Math.max(...data, 1);
  const w = 64, h = 16;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - (v / max) * h}`
  ).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
};

const Divider = () => <span className="text-text-muted text-sm select-none">|</span>;

const TopBar = ({ isConnected, mlEnabled, logsPerMin, logRateHistory, stats, onOpenSettings }) => {
  const mlAccuracy = stats?.ml_accuracy != null
    ? `${(stats.ml_accuracy * 100).toFixed(1)}%`
    : 'N/A';

  return (
    <div className="topbar">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6 shrink-0">
        <span className="text-accent-primary text-xl font-bold select-none">◈</span>
        <span className="font-bold text-text-primary tracking-wide text-base">CHRONOLOG</span>
      </div>

      {/* Live stats bar */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Logs/min */}
        <div className="flex items-center gap-2 shrink-0">
          <SparkLine data={logRateHistory} color="#6366f1" />
          <span className="font-mono text-sm text-text-secondary tabular-nums">
            <span className="text-text-primary font-semibold">{logsPerMin.toLocaleString()}</span>
            {' '}logs/min
          </span>
        </div>
        <Divider />
        {/* Active causal chains */}
        <span className="font-mono text-sm text-text-secondary shrink-0 hidden md:block">
          <span className="text-accent-primary font-semibold">
            {stats?.active_causal_chains ?? 0}
          </span>
          {' '}causal chain{stats?.active_causal_chains !== 1 ? 's' : ''}
        </span>
        <Divider />
        {/* ML status */}
        <div className="flex items-center gap-1.5 shrink-0 hidden lg:flex">
          <Brain size={14} className={mlEnabled ? 'text-accent-secondary' : 'text-text-muted'} />
          <span className="font-mono text-sm text-text-secondary">
            ML{' '}
            <span className={mlEnabled ? 'text-accent-secondary font-semibold' : 'text-text-muted'}>
              {mlEnabled ? mlAccuracy : 'offline'}
            </span>
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
