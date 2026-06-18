import { Brain, Settings } from 'lucide-react';

// Colors for the always-dark topbar surface
const D = {
  textPrimary:   '#f0faf5',
  textSecondary: 'rgba(240,250,245,0.55)',
  textMuted:     'rgba(240,250,245,0.28)',
  accent:        '#22d3a5',
  accentSecondary: '#c4b5fd',
  divider:       'rgba(240,250,245,0.12)',
};

const SparkLine = ({ data = [] }) => {
  if (data.length < 2) return <div className="w-16 h-4" />;
  const max = Math.max(...data, 1);
  const w = 64, h = 16;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - (v / max) * h}`
  ).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={D.accent} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
};

const Divider = () => (
  <span className="text-sm select-none" style={{ color: D.divider }}>|</span>
);

const TopBar = ({ mlEnabled, logsPerMin, logRateHistory, stats, onOpenSettings }) => {
  const mlAccuracy = stats?.ml_accuracy != null
    ? `${(stats.ml_accuracy * 100).toFixed(1)}%`
    : 'N/A';

  return (
    <div className="topbar">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6 shrink-0">
        <span className="text-xl font-bold select-none" style={{ color: D.accent }}>◈</span>
        <span className="font-bold tracking-wide text-base font-display" style={{ color: D.textPrimary }}>
          CHRONOLOG
        </span>
      </div>

      {/* Live stats */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <SparkLine data={logRateHistory} />
          <span className="font-mono text-sm tabular-nums" style={{ color: D.textSecondary }}>
            <span className="font-semibold" style={{ color: D.textPrimary }}>
              {logsPerMin.toLocaleString()}
            </span>
            {' '}logs/min
          </span>
        </div>

        <Divider />

        <span className="font-mono text-sm shrink-0 hidden md:block" style={{ color: D.textSecondary }}>
          <span className="font-semibold" style={{ color: D.accent }}>
            {stats?.active_causal_chains ?? 0}
          </span>
          {' '}causal chain{stats?.active_causal_chains !== 1 ? 's' : ''}
        </span>

        <Divider />

        <div className="flex items-center gap-1.5 shrink-0 hidden lg:flex">
          <Brain size={14} style={{ color: mlEnabled ? D.accentSecondary : D.textMuted }} />
          <span className="font-mono text-sm" style={{ color: D.textSecondary }}>
            ML{' '}
            <span
              className="font-semibold"
              style={{ color: mlEnabled ? D.accentSecondary : D.textMuted }}
            >
              {mlEnabled ? mlAccuracy : 'offline'}
            </span>
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors"
            style={{ color: D.textMuted }}
            onMouseEnter={e => e.currentTarget.style.color = D.textPrimary}
            onMouseLeave={e => e.currentTarget.style.color = D.textMuted}
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
