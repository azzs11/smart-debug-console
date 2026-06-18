import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import TopBar from './components/TopBar';
import SideNav from './components/SideNav';
import Dashboard from './components/Dashboard';
import CausalGraph from './components/CausalGraph';
import AnomalyTimeline from './components/AnomalyTimeline';
import MLChartsPanel from './components/MLChartsPanel';
import ToastContainer from './components/Toast';
import Onboarding from './components/Onboarding';
import socketService from './services/socketService';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EMPTY_STATS = {
  total: 0, bySeverity: { critical: 0, error: 0, warning: 0, info: 0, debug: 0 },
  anomalyCount: 0, causalChainCount: 0
};

function App() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [activeView,    setActiveView]    = useState('dashboard');
  const [logs,          setLogs]          = useState([]);
  const [stats,         setStats]         = useState(EMPTY_STATS);
  const [metricsSummary, setMetricsSummary] = useState(null);
  const [causalChains,  setCausalChains]  = useState([]);
  const [graphData,     setGraphData]     = useState({ nodes: [], edges: [] });
  const [anomalies,     setAnomalies]     = useState([]);
  const [mlStats,       setMlStats]       = useState(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [mlEnabled,     setMlEnabled]     = useState(false);
  const [toasts,        setToasts]        = useState([]);
  const [adminKey,      setAdminKey]      = useState(() => sessionStorage.getItem('adminKey') || '');
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('chronolog_onboarded'));

  // ── Logs/min tracking ──────────────────────────────────────────────────────
  const logTimestamps   = useRef([]);
  const [logsPerMin,    setLogsPerMin]    = useState(0);
  const [logRateHistory, setLogRateHistory] = useState(new Array(60).fill(0));

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── New log handler ────────────────────────────────────────────────────────
  const handleNewLog = useCallback((log) => {
    logTimestamps.current.push(Date.now());
    setLogs(prev => [...prev.slice(-199), log]);
  }, []);

  // ── WebSocket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    socketService.connect();

    socketService.onConnectionSuccess((data) => {
      setIsConnected(true);
      setMlEnabled(data.ml_enabled || false);
    });

    socketService.on('connect',    () => setIsConnected(true));
    socketService.on('disconnect', () => setIsConnected(false));

    socketService.onNewLog(handleNewLog);

    socketService.onStatsUpdate((s) => setStats(s));

    socketService.onCausalEvent((evt) => {
      if (evt.type === 'causal-chain-detected') {
        pushToast({
          type:  'causal-chain-detected',
          title: `Causal chain detected — ${evt.total_affected} logs`,
          body:  `Blast radius ${evt.blast_radius_score?.toFixed(1)} · depth ${evt.chain_depth}`,
          duration: 7000
        });
      }
    });

    return () => socketService.disconnect();
  }, [handleNewLog, pushToast]);

  // ── Live logs/min counter ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      logTimestamps.current = logTimestamps.current.filter(ts => ts > now - 60000);
      setLogsPerMin(logTimestamps.current.length);
      const secondCount = logTimestamps.current.filter(ts => ts > now - 1000).length;
      setLogRateHistory(prev => [...prev.slice(1), secondCount]);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Initial data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [logsRes, statsRes] = await Promise.all([
          axios.get(`${API}/api/logs?limit=100`),
          axios.get(`${API}/api/logs/stats`)
        ]);
        if (logsRes.data.status === 'success')  setLogs(logsRes.data.data || []);
        if (statsRes.data.status === 'success') {
          setStats(statsRes.data.data);
          setMlStats(statsRes.data.data.ml || null);
        }
      } catch (err) { console.warn('Initial fetch failed:', err.message); }
    };
    fetchAll();
  }, []);

  // ── Periodic polling ───────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const [chainsRes, graphRes, anomaliesRes, metricsRes] = await Promise.allSettled([
          axios.get(`${API}/api/causal/chains`),
          axios.get(`${API}/api/causal/graph`),
          axios.get(`${API}/api/anomalies?limit=50`),
          axios.get(`${API}/api/metrics/summary`)
        ]);

        if (chainsRes.status === 'fulfilled'    && chainsRes.value.data.status === 'success')
          setCausalChains(chainsRes.value.data.data || []);
        if (graphRes.status === 'fulfilled'     && graphRes.value.data.status === 'success')
          setGraphData(graphRes.value.data.data || { nodes: [], edges: [] });
        if (anomaliesRes.status === 'fulfilled' && anomaliesRes.value.data.status === 'success')
          setAnomalies(anomaliesRes.value.data.data || []);
        if (metricsRes.status === 'fulfilled'   && metricsRes.value.data.status === 'success')
          setMetricsSummary(metricsRes.value.data.data);
      } catch {}
    };

    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  // ── Compute ML stats from log stream ──────────────────────────────────────
  useEffect(() => {
    const ml = logs.filter(l => l.ml?.confidence != null);
    if (!ml.length) return;
    const correct = ml.filter(l => l.ml.severity_match).length;
    const avgConf = ml.reduce((s, l) => s + l.ml.confidence, 0) / ml.length;
    setMlStats({
      total_classified:    ml.length,
      correct_predictions: correct,
      accuracy:            correct / ml.length,
      avg_confidence:      avgConf * 100
    });
    setMlEnabled(true);
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    setStats(EMPTY_STATS);
  };

  // ── Settings view ──────────────────────────────────────────────────────────
  const SettingsView = () => (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-xl font-bold text-text-primary">Settings</h2>
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Admin API Key</h3>
        <p className="text-xs text-text-muted mb-3">
          Required for generator start/stop. Set in backend <code className="text-accent-secondary">.env</code> as <code className="text-accent-secondary">ADMIN_API_KEY</code>.
        </p>
        <input
          type="password"
          value={adminKey}
          onChange={e => { setAdminKey(e.target.value); sessionStorage.setItem('adminKey', e.target.value); }}
          placeholder="Enter admin API key..."
          className="w-full px-3 py-2 bg-bg-base border border-border-dim rounded-lg text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
        />
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Log Generator</h3>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const key = adminKey || window.prompt('Enter admin API key:');
              if (!key) return;
              try {
                await axios.post(`${API}/api/logs/generator/start`, { interval: 2000 }, { headers: { 'x-api-key': key } });
                pushToast({ type: 'anomaly', title: 'Generator started', body: '2s interval', duration: 3000 });
              } catch (e) { pushToast({ type: 'warning', title: 'Generator error', body: e.response?.data?.message || e.message }); }
            }}
            className="px-4 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors"
          >
            ▶ Start Generator
          </button>
          <button
            onClick={async () => {
              const key = adminKey;
              if (!key) { pushToast({ type: 'warning', title: 'Set API key first', body: 'Enter key in Settings' }); return; }
              try {
                await axios.post(`${API}/api/logs/generator/stop`, {}, { headers: { 'x-api-key': key } });
                pushToast({ type: 'anomaly', title: 'Generator stopped', duration: 3000 });
              } catch (e) { pushToast({ type: 'warning', title: 'Generator error', body: e.response?.data?.message || e.message }); }
            }}
            className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors"
          >
            ⏹ Stop Generator
          </button>
        </div>
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold text-text-secondary mb-2">About</h3>
        <p className="text-xs text-text-muted">Chronolog v2.0 — Causal Log Intelligence Platform</p>
        <p className="text-xs text-text-muted mt-1">Novel features: Causal Graph Engine · Temporal Anomaly Fingerprinting</p>
      </div>
    </div>
  );

  // ── Combined stats for top bar ─────────────────────────────────────────────
  const topBarStats = {
    ...stats,
    active_causal_chains: causalChains.length,
    ml_accuracy: mlStats ? mlStats.accuracy : null,
    ...(metricsSummary || {})
  };

  return (
    <div className="app-shell">
      <TopBar
        isConnected={isConnected}
        mlEnabled={mlEnabled}
        logsPerMin={logsPerMin}
        logRateHistory={logRateHistory}
        stats={topBarStats}
        onOpenSettings={() => setActiveView('settings')}
      />

      <div className="app-body">
        <SideNav
          activeView={activeView}
          setActiveView={setActiveView}
          anomalyCount={anomalies.length}
          chainCount={causalChains.length}
        />

        <main className="app-content">
          {activeView === 'dashboard' && (
            <Dashboard
              logs={logs}
              stats={stats}
              causalChains={causalChains}
              anomalies={anomalies}
              mlStats={mlStats}
              isMLEnabled={mlEnabled}
              onClearLogs={clearLogs}
            />
          )}

          {activeView === 'live-logs' && (
            <div style={{ height: 'calc(100vh - 120px)' }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Live Log Stream</h2>
                <span className="text-xs text-text-muted font-mono">{logs.length} logs in memory</span>
              </div>
              <div style={{ height: 'calc(100% - 48px)' }}>
                <div className="log-stream" style={{ height: '100%' }}>
                  {/* reuse LogStream at full height */}
                  <Dashboard
                    logs={logs} stats={stats} causalChains={[]} anomalies={[]}
                    mlStats={mlStats} isMLEnabled={mlEnabled} onClearLogs={clearLogs}
                  />
                </div>
              </div>
            </div>
          )}

          {activeView === 'causal-graph' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Causal Graph</h2>
                  <p className="text-xs text-text-muted mt-0.5">Real-time causal relationships between log events · click nodes for details · scroll to zoom</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="px-2 py-1 rounded bg-bg-elevated border border-border-dim font-mono">{graphData.nodes.length} nodes</span>
                  <span className="px-2 py-1 rounded bg-bg-elevated border border-border-dim font-mono">{graphData.edges.length} edges</span>
                  <span className="px-2 py-1 rounded bg-bg-elevated border border-border-dim font-mono">{causalChains.length} chains</span>
                </div>
              </div>

              {/* Full-page D3 graph */}
              <div style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
                <CausalGraph nodes={graphData.nodes} edges={graphData.edges} />
              </div>

              {/* Chain summaries below graph */}
              {causalChains.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {causalChains.map(chain => (
                    <div key={chain.root_log_id} className="card border-l-4 border-l-indigo-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-accent-primary uppercase">Root Cause</span>
                        <span className="text-xs font-mono text-indigo-400">BR {chain.blast_radius_score?.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-mono text-text-primary leading-snug mb-2">{chain.root_message?.slice(0, 70)}…</p>
                      <p className="text-xs text-text-muted">
                        {chain.total_affected_logs} downstream logs · depth {chain.chain_depth} · from <span className="text-purple-400">{chain.root_source}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'anomalies' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Anomaly Detection</h2>
              <AnomalyTimeline anomalies={anomalies} />
              {anomalies.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-secondary mb-3">Recent Anomalies</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {anomalies.map((a, i) => (
                      <div key={a.id || i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-base border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                        <span className="text-amber-400 shrink-0 text-xs font-mono font-semibold mt-0.5">
                          {((a.anomaly_score || 0) * 100).toFixed(0)}%
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-text-primary leading-snug truncate">{a.message}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {a.source} · {new Date(a.timestamp).toLocaleTimeString()} ·
                            <span className="text-accent-secondary ml-1">#{(a.fingerprint_hash || '').slice(0, 8)}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'ml-performance' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">ML Performance</h2>
              <MLChartsPanel logs={logs} mlStats={mlStats} isMLEnabled={mlEnabled} />
            </div>
          )}

          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showOnboarding && (
        <Onboarding onClose={() => {
          localStorage.setItem('chronolog_onboarded', '1');
          setShowOnboarding(false);
        }} />
      )}
    </div>
  );
}

export default App;
