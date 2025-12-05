// frontend/src/components/MLChartsPanel.jsx
import { BarChart3, Brain, PieChart, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart as RechartsPie, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MLChartsPanel = ({ logs, mlStats, isMLEnabled }) => {
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [severityData, setSeverityData] = useState([]);

  useEffect(() => {
    if (!logs || logs.length === 0) return;

    // Update accuracy history (last 20 data points)
    if (mlStats && mlStats.accuracy !== undefined) {
      setAccuracyHistory(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString(),
          accuracy: parseFloat(mlStats.accuracy) || 0,
          confidence: parseFloat(mlStats.avg_confidence) || 0
        }];
        return newData.slice(-20); // Keep last 20 points
      });
    }

    // Calculate confidence distribution
    const mlLogs = logs.filter(log => log.ml && log.ml.confidence);
    if (mlLogs.length > 0) {
      const confidenceBuckets = {
        'High (90-100%)': 0,
        'Medium (70-89%)': 0,
        'Low (<70%)': 0
      };

      mlLogs.forEach(log => {
        const conf = log.ml.confidence * 100;
        if (conf >= 90) confidenceBuckets['High (90-100%)']++;
        else if (conf >= 70) confidenceBuckets['Medium (70-89%)']++;
        else confidenceBuckets['Low (<70%)']++;
      });

      setConfidenceData([
        { name: 'High (90-100%)', value: confidenceBuckets['High (90-100%)'], color: '#10b981' },
        { name: 'Medium (70-89%)', value: confidenceBuckets['Medium (70-89%)'], color: '#f59e0b' },
        { name: 'Low (<70%)', value: confidenceBuckets['Low (<70%)'], color: '#ef4444' }
      ]);
    }

    // Calculate severity distribution
    const severityCounts = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {});

    const severityColors = {
      critical: '#dc2626',
      error: '#f97316',
      warning: '#eab308',
      info: '#3b82f6',
      debug: '#6b7280'
    };

    setSeverityData(
      Object.entries(severityCounts).map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count,
        color: severityColors[severity]
      }))
    );

  }, [logs, mlStats]);

  if (!isMLEnabled) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-8 text-white text-center">
        <Brain size={48} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-bold mb-2">ML Analytics Unavailable</h3>
        <p className="text-gray-400">Start ML service to see visualizations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={28} className="text-purple-500" />
        <h2 className="text-2xl font-bold text-white">ML Analytics Dashboard</h2>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Accuracy Over Time */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-green-500" />
            <h3 className="text-lg font-bold text-gray-800">Accuracy Over Time</h3>
          </div>
          {accuracyHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={accuracyHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                  name="Accuracy (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                  name="Confidence (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Waiting for data...
            </div>
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-gray-800">Confidence Distribution</h3>
          </div>
          {confidenceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count">
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Waiting for data...
            </div>
          )}
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-orange-500" />
            <h3 className="text-lg font-bold text-gray-800">Log Severity Distribution</h3>
          </div>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Waiting for data...
            </div>
          )}
        </div>

        {/* ML Performance Stats */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} />
            <h3 className="text-lg font-bold">Model Performance</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">Current Accuracy</div>
              <div className="text-3xl font-bold">
                {mlStats?.accuracy ? `${parseFloat(mlStats.accuracy).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs opacity-75 mt-1">
                Target: 88%+ accuracy
              </div>
            </div>
            
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">Average Confidence</div>
              <div className="text-3xl font-bold">
                {mlStats?.avg_confidence ? `${parseFloat(mlStats.avg_confidence).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs opacity-75 mt-1">
                Higher is better
              </div>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">Total Predictions</div>
              <div className="text-3xl font-bold">
                {mlStats?.total_classified || 0}
              </div>
              <div className="text-xs opacity-75 mt-1">
                Correct: {mlStats?.correct_predictions || 0}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MLChartsPanel;