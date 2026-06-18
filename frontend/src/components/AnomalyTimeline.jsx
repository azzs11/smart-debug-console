import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Zap, Clock } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const SEVERITY_COLORS = {
  critical: '#dc2626', error: '#f97316', warning: '#f59e0b', info: '#3b82f6', debug: '#6b7280'
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-bg-elevated border border-border-dim rounded-lg p-3 shadow-xl text-xs max-w-xs">
      <SeverityBadge severity={d.severity} size="xs" />
      <p className="text-text-primary font-mono mt-2 leading-relaxed break-words">{d.message?.slice(0, 100)}</p>
      <div className="grid grid-cols-2 gap-1 mt-2">
        <span className="text-text-muted">Score</span>
        <span className="text-amber-400 font-semibold">{(d.anomaly_score * 100).toFixed(1)}%</span>
        <span className="text-text-muted">Source</span>
        <span className="text-purple-400 font-mono">{d.source}</span>
        <span className="text-text-muted">Fingerprint</span>
        <span className="text-text-secondary font-mono truncate">{d.fingerprint_hash?.slice(0, 12)}…</span>
      </div>
    </div>
  );
};

const AnomalyTimeline = ({ anomalies = [] }) => {
  const [selected, setSelected] = useState(null);

  const data = anomalies.map(a => ({
    ...a,
    x: new Date(a.timestamp).getTime(),
    y: a.anomaly_score ?? a.anomalyScore ?? 0.6,
    r: Math.max(4, (a.blast_radius_score || a.blastRadius || 1) * 3)
  }));

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-amber-400" />
          <h3 className="font-semibold text-text-primary text-sm">Anomaly Timeline</h3>
          {anomalies.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
              {anomalies.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock size={11} />
          <span>Last {anomalies.length} anomalies</span>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-text-muted">
          <Zap size={32} className="mb-2 opacity-20" />
          <p className="text-xs">No anomalies detected yet</p>
          <p className="text-xs opacity-60 mt-1">Anomalies appear when log rhythm breaks</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="x" type="number" domain={['auto', 'auto']}
              tickFormatter={formatTime} tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1f2937' }} tickLine={false} scale="time"
            />
            <YAxis
              dataKey="y" domain={[0, 1]}
              tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1f2937' }} tickLine={false}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 10 }}
            />
            <ReferenceLine y={0.6} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'threshold', fill: '#f59e0b', fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} onClick={(d) => setSelected(d)}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={SEVERITY_COLORS[entry.severity] || '#f59e0b'}
                  fillOpacity={0.8}
                  r={entry.r}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {selected && (
        <div className="mt-3 pt-3 border-t border-border-dim">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={selected.severity} size="xs" />
                <span className="text-xs text-purple-400 font-mono">{selected.source}</span>
              </div>
              <p className="text-xs font-mono text-text-secondary leading-relaxed">{selected.message?.slice(0, 120)}</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                Fingerprint: <span className="text-accent-secondary">{selected.fingerprint_hash?.slice(0, 16)}…</span>
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary shrink-0 text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnomalyTimeline;
