import { useEffect, useRef, useState } from 'react';
import { Terminal, Pause, Play, Trash2 } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
    second: '2-digit', fractionalSecondDigits: 3
  });
};

const LogRow = ({ log, isNew }) => {
  const isCritical = log.severity === 'critical';
  return (
    <div className={`log-row group ${isNew ? 'log-entry-new' : ''} ${isCritical && isNew ? 'log-critical-flash' : ''}`}>
      {/* Timestamp */}
      <span className="font-mono text-xs text-text-muted w-24 shrink-0 pt-0.5 tabular-nums">
        {formatTime(log.timestamp)}
      </span>

      {/* Severity badge */}
      <SeverityBadge severity={log.severity} size="xs" />

      {/* Source */}
      <span className="font-mono text-xs text-purple-400 w-28 shrink-0 truncate pt-0.5">
        {log.source || 'unknown'}
      </span>

      {/* Message */}
      <span className="font-mono text-sm text-text-primary flex-1 leading-relaxed min-w-0 break-words">
        {log.message}
      </span>

      {/* Right-side badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {log.is_anomaly && (
          <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-mono font-semibold">
            ⚡ ANOMALY
          </span>
        )}
        {log.causal && log.causal.causal_chain_depth > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 font-mono">
            ↳ L{log.causal.causal_chain_depth}
          </span>
        )}
        {log.ml && (
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${log.ml.severity_match ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-text-muted font-mono tabular-nums">
              {(log.ml.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const LogStream = ({ logs, onClear, maxHeight = 480 }) => {
  const [paused, setPaused]       = useState(false);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [visibleLogs, setVisible] = useState(logs);
  const [newIds, setNewIds]       = useState(new Set());
  const bottomRef = useRef(null);
  const prevCount = useRef(logs.length);

  // Track new arrivals for animation
  useEffect(() => {
    if (logs.length > prevCount.current) {
      const freshIds = new Set(logs.slice(prevCount.current).map(l => l.id));
      setNewIds(freshIds);
      setTimeout(() => setNewIds(new Set()), 400);
    }
    prevCount.current = logs.length;
  }, [logs]);

  // Apply filters
  useEffect(() => {
    let result = logs;
    if (filter !== 'all') result = result.filter(l => l.severity === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.message?.toLowerCase().includes(q) || l.source?.toLowerCase().includes(q));
    }
    setVisible(result);
  }, [logs, filter, search]);

  // Auto-scroll
  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleLogs, paused]);

  const severities = ['all', 'critical', 'error', 'warning', 'info', 'debug'];

  return (
    <div className="log-stream flex flex-col" style={{ height: maxHeight }}>
      {/* Header */}
      <div className="log-stream-header justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-accent-primary" />
          <span className="text-sm font-semibold text-text-secondary">Live Log Stream</span>
          <span className="text-xs text-text-muted font-mono tabular-nums">{visibleLogs.length} logs</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="filter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-bg-base border border-border-dim rounded px-2 py-0.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary w-28"
          />

          {/* Severity filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-bg-base border border-border-dim rounded px-2 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
          >
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Pause / play */}
          <button
            onClick={() => setPaused(p => !p)}
            className={`p-1.5 rounded transition-colors ${paused ? 'text-amber-400 hover:bg-amber-500/10' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'}`}
            title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>

          {/* Clear */}
          <button
            onClick={onClear}
            className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Clear logs"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Log body */}
      <div className="log-stream-body flex-1 overflow-y-auto">
        {visibleLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <Terminal size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-mono">Waiting for logs...</p>
          </div>
        ) : (
          <>
            {visibleLogs.map(log => (
              <LogRow key={log.id} log={log} isNew={newIds.has(log.id)} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default LogStream;
