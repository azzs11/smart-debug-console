import { useState } from 'react';
import { GitCommit, ChevronDown, ChevronRight, Zap, AlertCircle } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const SEVERITY_COLORS = {
  critical: 'text-red-400 border-red-500/40',
  error:    'text-orange-400 border-orange-500/40',
  warning:  'text-amber-400 border-amber-500/40',
  info:     'text-blue-400 border-blue-500/40',
  debug:    'text-gray-400 border-gray-500/40',
};

const BlastRadiusBadge = ({ score }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-primary/15 border border-accent-primary/25 text-accent-primary text-xs font-mono font-semibold">
    <Zap size={10} />
    {score.toFixed(1)}
  </span>
);

const ChainItem = ({ chain }) => {
  const [expanded, setExpanded] = useState(true);
  const severity = chain.root_severity;
  const colorCls = SEVERITY_COLORS[severity] || SEVERITY_COLORS.debug;

  return (
    <div className={`border rounded-lg overflow-hidden ${colorCls} mb-3`}>
      {/* Root node */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-start gap-2 p-3 text-left hover:bg-white/5 transition-colors ${severity === 'critical' ? 'glow-red' : ''}`}
      >
        <div className="mt-0.5 shrink-0 text-text-muted">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={severity} size="xs" />
            <span className="text-xs text-text-muted font-mono">{chain.root_source}</span>
            <BlastRadiusBadge score={chain.blast_radius_score} />
          </div>
          <p className="text-sm text-text-primary font-mono leading-snug truncate" title={chain.root_message}>
            {chain.root_message?.slice(0, 80)}{chain.root_message?.length > 80 ? '…' : ''}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {chain.total_affected_logs} log{chain.total_affected_logs !== 1 ? 's' : ''} affected · depth {chain.chain_depth}
          </p>
        </div>
      </button>

      {/* Downstream effects */}
      {expanded && chain.affected_preview?.length > 0 && (
        <div className="border-t border-white/10 bg-black/20">
          {chain.affected_preview.map((log, i) => (
            <div key={log.id || i} className="flex items-start gap-2 px-4 py-2 border-b border-white/5 last:border-0">
              <div className="text-text-muted shrink-0 mt-0.5">
                <span className="text-xs font-mono text-text-muted">↳ L{log.depth ?? (i + 1)}</span>
              </div>
              <SeverityBadge severity={log.severity} size="xs" />
              <span className="text-xs font-mono text-text-secondary flex-1 min-w-0 truncate" title={log.message}>
                {log.message}
              </span>
            </div>
          ))}
          {chain.total_affected_logs > (chain.affected_preview?.length ?? 0) && (
            <p className="px-4 py-2 text-xs text-text-muted font-mono">
              +{chain.total_affected_logs - chain.affected_preview.length} more downstream effects
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const CausalChainPanel = ({ chains = [] }) => (
  <div className="card flex flex-col h-full overflow-hidden">
    <div className="flex items-center gap-2 mb-4 shrink-0">
      <GitCommit size={16} className="text-accent-primary" />
      <h3 className="font-display font-semibold text-text-primary text-sm">Causal Chains</h3>
      {chains.length > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-xs font-bold">
          {chains.length}
        </span>
      )}
    </div>

    <div className="flex-1 overflow-y-auto">
      {chains.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-text-muted">
          <GitCommit size={28} className="mb-2 opacity-30" />
          <p className="text-xs text-center">No active causal chains.<br />Root causes appear here when detected.</p>
        </div>
      ) : (
        chains.map(chain => <ChainItem key={chain.root_log_id} chain={chain} />)
      )}
    </div>

    {chains.length > 0 && (
      <div className="mt-3 pt-3 border-t border-border-dim shrink-0">
        <p className="text-xs text-text-muted flex items-center gap-1.5">
          <AlertCircle size={11} />
          Fix root cause nodes to resolve all downstream effects
        </p>
      </div>
    )}
  </div>
);

export default CausalChainPanel;
