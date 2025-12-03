// frontend/src/components/Dashboard.jsx
import axios from 'axios';
import { Activity, AlertCircle, AlertTriangle, Database, Info, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import socketService from '../services/socketService';
import FilterBar from './FilterBar';
import LogTable from './LogTable';
import MLInsightsCard from './MLInsightsCard'; // NEW IMPORT
import StatsCard from './StatsCard';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    bySeverity: {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
      debug: 0
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [generatorActive, setGeneratorActive] = useState(false);
  const [mlEnabled, setMlEnabled] = useState(false);  // NEW STATE

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Connect to WebSocket
    socketService.connect();

    // Listen for connection success
    socketService.onConnectionSuccess((data) => {
      setIsConnected(true);
      setMlEnabled(data.ml_enabled || false);  // NEW
      console.log('Connection success:', data);
    });

    // Listen for new logs
    socketService.onNewLog((log) => {
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, log];
        // Keep only last 100 logs in UI
        return newLogs.slice(-100);
      });
    });

    // Listen for stats updates
    socketService.onStatsUpdate((statsData) => {
      setStats(statsData);
    });

    // Fetch initial logs
    fetchInitialLogs();

    // Check generator status
    checkGeneratorStatus();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const fetchInitialLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs?limit=50&ml=true`);  // CHANGED: Added ml=true
      if (response.data.status === 'success') {
        setLogs(response.data.data);
        setMlEnabled(response.data.ml_enabled || false);  // NEW
      }
    } catch (error) {
      console.error('Error fetching initial logs:', error);
    }
  };

  const checkGeneratorStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/generator/status`);
      if (response.data.status === 'success') {
        setGeneratorActive(response.data.data.isActive);
      }
    } catch (error) {
      console.error('Error checking generator status:', error);
    }
  };

  const toggleGenerator = async () => {
    try {
      const endpoint = generatorActive ? 'stop' : 'start';
      const response = await axios.post(`${API_URL}/api/logs/generator/${endpoint}`, {
        interval: 2000
      });
      
      if (response.data.status === 'success') {
        setGeneratorActive(!generatorActive);
      }
    } catch (error) {
      console.error('Error toggling generator:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setStats({
      total: 0,
      bySeverity: { critical: 0, error: 0, warning: 0, info: 0, debug: 0 }
    });
  };

  // Filter logs based on search and severity
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  // Calculate ML stats from current logs - NEW
  const mlStats = stats.ml || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🔍 Smart Debug Console
              </h1>
              <p className="text-gray-300">Real-time log monitoring with AI-powered analysis</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
                <span className="font-semibold">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Generator Toggle */}
              <button
                onClick={toggleGenerator}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  generatorActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {generatorActive ? '⏸️ Stop Generator' : '▶️ Start Generator'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard 
            title="Total Logs" 
            value={stats.total || filteredLogs.length} 
            icon={<Database />} 
            color="blue" 
          />
          <StatsCard 
            title="Critical" 
            value={stats.bySeverity?.critical || 0} 
            icon={<AlertCircle />} 
            color="red" 
          />
          <StatsCard 
            title="Errors" 
            value={stats.bySeverity?.error || 0} 
            icon={<AlertCircle />} 
            color="red" 
          />
          <StatsCard 
            title="Warnings" 
            value={stats.bySeverity?.warning || 0} 
            icon={<AlertTriangle />} 
            color="yellow" 
          />
          <StatsCard 
            title="Info" 
            value={stats.bySeverity?.info || 0} 
            icon={<Info />} 
            color="green" 
          />
          <StatsCard 
            title="Debug" 
            value={stats.bySeverity?.debug || 0} 
            icon={<Activity />} 
            color="gray" 
          />
        </div>

        {/* ML Insights Card - NEW */}
        <div className="mb-6">
          <MLInsightsCard mlStats={mlStats} isMLEnabled={mlEnabled} />
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSeverity={selectedSeverity}
          setSelectedSeverity={setSelectedSeverity}
          onClearLogs={clearLogs}
        />

        {/* Auto-scroll Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-white text-sm">
            Showing {filteredLogs.length} of {logs.length} logs
            {mlEnabled && <span className="ml-2 text-purple-300">🤖 AI Enhanced</span>}
          </div>
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span>Auto-scroll</span>
          </label>
        </div>

        {/* Log Table */}
        <LogTable logs={filteredLogs} autoScroll={autoScroll} />
      </div>
    </div>
  );
};

export default Dashboard;