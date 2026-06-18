import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Brain, TrendingUp, Target, BarChart3 } from 'lucide-react';

const CONFIDENCE_COLORS = { 'High (90%+)': '#10b981', 'Medium (70-89%)': '#f59e0b', 'Low (<70%)': '#ef4444' };
const SEVERITY_PIE_COLORS = { critical: '#dc2626', error: '#f97316', warning: '#f59e0b', info: '#3b82f6', debug: '#6b7280' };

const MetricBlock = ({ label, value, sub, color = 'text-accent-primary' }) => (
  <div className="bg-bg-base rounded-lg p-3">
    <p className="text-xs text-text-muted mb-1">{label}</p>
    <p className={`text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</p>
    {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
  </div>
);

const MLChartsPanel = ({ logs = [], mlStats, isMLEnabled }) => {
  const [accuracyHistory, setAccuracyHistory] = useState([]);

  useEffect(() => {
    if (mlStats?.accuracy !== undefined) {
      setAccuracyHistory(prev => [
        ...prev.slice(-29),
        {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          accuracy:   parseFloat(mlStats.accuracy ?? 0) * 100,
          confidence: parseFloat(mlStats.avg_confidence ?? 0)
        }
      ]);
    }
  }, [mlStats]);

  // Confidence distribution
  const mlLogs = logs.filter(l => l.ml?.confidence != null);
  const confBuckets = { 'High (90%+)': 0, 'Medium (70-89%)': 0, 'Low (<70%)': 0 };
  mlLogs.forEach(l => {
    const c = l.ml.confidence * 100;
    if (c >= 90) confBuckets['High (90%+)']++;
    else if (c >= 70) confBuckets['Medium (70-89%)']++;
    else confBuckets['Low (<70%)']++;
  });
  const confData = Object.entries(confBuckets).map(([name, value]) => ({ name, value }));

  // Severity distribution
  const sevCounts = logs.reduce((acc, l) => { acc[l.severity] = (acc[l.severity] || 0) + 1; return acc; }, {});
  const sevData = Object.entries(sevCounts).map(([name, value]) => ({ name, value }));

  const accuracyPct = mlStats?.accuracy != null
    ? (parseFloat(mlStats.accuracy) * 100).toFixed(1) + '%'
    : (mlStats?.accuracy != null ? `${parseFloat(mlStats.accuracy).toFixed(1)}%` : 'N/A');

  const AccuracyColor = mlStats?.accuracy >= 0.88 ? 'text-green-400' : 'text-amber-400';

  if (!isMLEnabled) {
    return (
      <div className="card flex flex-col items-center justify-center h-40 text-text-muted">
        <Brain size={32} className="mb-2 opacity-20" />
        <p className="text-sm font-semibold">ML Service Offline</p>
        <p className="text-xs opacity-60 mt-1">Start the ML service to enable AI classification</p>
      </div>
    );
  }

  const tick = { fill: '#6b7280', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' };
  const gridStroke = '#1f2937';
  const tooltipStyle = { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12, fontFamily: '"JetBrains Mono"' };

  return (
    <div className="space-y-4">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBlock label="Accuracy"       value={accuracyPct}                                 color={AccuracyColor} sub="vs 88% target" />
        <MetricBlock label="Avg Confidence" value={mlStats?.avg_confidence != null ? `${parseFloat(mlStats.avg_confidence).toFixed(1)}%` : 'N/A'} color="text-accent-secondary" sub="prediction certainty" />
        <MetricBlock label="Classified"     value={(mlStats?.total_classified || 0).toLocaleString()} color="text-text-primary" sub="log messages" />
        <MetricBlock label="Correct"        value={(mlStats?.correct_predictions || 0).toLocaleString()} color="text-green-400" sub="exact matches" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accuracy over time */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-green-400" />
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Accuracy Over Time</h4>
          </div>
          {accuracyHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={accuracyHistory} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="time" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: '"JetBrains Mono"' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Accuracy %" />
                <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={2} dot={false} name="Confidence %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-text-muted text-xs">
              Collecting data…
            </div>
          )}
        </div>

        {/* Severity pie */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-orange-400" />
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Log Distribution</h4>
          </div>
          {sevData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sevData} cx="50%" cy="50%" outerRadius={65} dataKey="value"
                  label={({ name, percent }) => `${name[0].toUpperCase()}${name.slice(1)} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}
                >
                  {sevData.map(({ name }) => <Cell key={name} fill={SEVERITY_PIE_COLORS[name] || '#6b7280'} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-text-muted text-xs">No logs yet</div>}
        </div>
      </div>

      {/* Confidence distribution */}
      {mlLogs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-blue-400" />
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Confidence Distribution</h4>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={confData} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {confData.map(({ name }) => <Cell key={name} fill={CONFIDENCE_COLORS[name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MLChartsPanel;
