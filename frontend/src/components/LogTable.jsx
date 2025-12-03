// frontend/src/components/LogTable.jsx
import { AlertCircle, AlertTriangle, Bug, CheckCircle, Info, XCircle, XOctagon } from 'lucide-react';
import { useEffect, useRef } from 'react';

const LogTable = ({ logs, autoScroll }) => {
  const tableEndRef = useRef(null);

  useEffect(() => {
    if (autoScroll && tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: <XCircle size={18} />,
      error: <AlertCircle size={18} />,
      warning: <AlertTriangle size={18} />,
      info: <Info size={18} />,
      debug: <Bug size={18} />
    };
    return icons[severity] || <Info size={18} />;
  };

  const getSeverityClass = (severity) => {
    const classes = {
      critical: 'bg-red-100 border-red-500 text-red-900',
      error: 'bg-orange-100 border-orange-500 text-orange-900',
      warning: 'bg-yellow-100 border-yellow-500 text-yellow-900',
      info: 'bg-blue-100 border-blue-500 text-blue-900',
      debug: 'bg-gray-100 border-gray-500 text-gray-900'
    };
    return classes[severity] || 'bg-gray-100 border-gray-500 text-gray-900';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Info size={48} className="mx-auto mb-2" />
          <p className="text-lg">No logs to display</p>
          <p className="text-sm">Waiting for logs to arrive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
        <table className="w-full">
          <thead className="bg-gray-800 text-white sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Message</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">AI Prediction</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr 
                key={`${log.id}-${index}`}
                className={`border-l-4 ${getSeverityClass(log.severity)} hover:bg-opacity-50 transition-colors duration-150 animate-slideIn`}
              >
                <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(log.severity)}
                    <span className="text-sm font-semibold uppercase">
                      {log.severity}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                    {log.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.message}
                </td>
                <td className="px-4 py-3 text-sm">
                  {log.ml ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {log.ml.severity_match ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XOctagon size={16} className="text-red-600" />
                        )}
                        <span className="font-semibold text-xs uppercase">
                          {log.ml.predicted_severity}
                        </span>
                      </div>
                      <div className={`text-xs ${getConfidenceColor(log.ml.confidence)}`}>
                        {(log.ml.confidence * 100).toFixed(1)}% confident
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No ML data</span>
                  )}
                </td>
              </tr>
            ))}
            <tr ref={tableEndRef} />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogTable;