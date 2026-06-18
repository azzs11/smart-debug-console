import { useState } from 'react';
import { Database, AlertCircle, AlertTriangle, Info, Bug, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import StatsCard from './StatsCard';
import LogStream from './LogStream';
import CausalChainPanel from './CausalChainPanel';
import AnomalyTimeline from './AnomalyTimeline';
import MLChartsPanel from './MLChartsPanel';

const Dashboard = ({ logs, stats, causalChains, anomalies, mlStats, isMLEnabled, onClearLogs }) => {
  const [showML, setShowML] = useState(true);

  const bySev = stats?.bySeverity || {};

  return (
    <div className="space-y-5">
      {/* Row 1: Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard title="Total Logs" value={stats?.total || 0} icon={<Database size={20} />} color="blue" />
        <StatsCard title="Critical"   value={bySev.critical || 0} icon={<AlertCircle size={20} />} color="red"
          glow={(bySev.critical || 0) > 0} />
        <StatsCard title="Errors"     value={bySev.error    || 0} icon={<AlertCircle size={20} />} color="orange" />
        <StatsCard title="Warnings"   value={bySev.warning  || 0} icon={<AlertTriangle size={20} />} color="yellow" />
        <StatsCard title="Info"       value={bySev.info     || 0} icon={<Info size={20} />} color="blue" />
        <StatsCard title="Debug"      value={bySev.debug    || 0} icon={<Bug size={20} />} color="gray" />
      </div>

      {/* Row 2: Anomaly stats */}
      {(stats?.anomalyCount > 0 || stats?.causalChainCount > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <StatsCard title="Anomalies Detected" value={stats?.anomalyCount || 0} icon={<Activity size={20} />} color="yellow"
            subtitle="Temporal rhythm breaks" />
          <StatsCard title="Causal Chains" value={stats?.causalChainCount || 0} icon={<Activity size={20} />} color="purple"
            subtitle="Active root-cause chains" />
        </div>
      )}

      {/* Row 3: Log stream + Causal panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 480 }}>
        {/* Terminal log stream — 60% */}
        <div className="lg:col-span-3">
          <LogStream logs={logs} onClear={onClearLogs} maxHeight={480} />
        </div>

        {/* Causal chain panel — 40% */}
        <div className="lg:col-span-2" style={{ minHeight: 480 }}>
          <CausalChainPanel chains={causalChains} />
        </div>
      </div>

      {/* Row 4: Anomaly timeline */}
      {anomalies.length > 0 && (
        <AnomalyTimeline anomalies={anomalies} />
      )}

      {/* Row 5: ML analytics (collapsible) */}
      <div className="card">
        <button
          onClick={() => setShowML(s => !s)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="font-semibold text-text-primary text-sm">ML Analytics</span>
          {isMLEnabled && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30">ACTIVE</span>
          )}
          <span className="ml-auto text-text-muted">
            {showML ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {showML && (
          <div className="mt-4">
            <MLChartsPanel logs={logs} mlStats={mlStats} isMLEnabled={isMLEnabled} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
