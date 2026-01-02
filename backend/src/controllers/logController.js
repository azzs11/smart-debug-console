const { emitLog, emitStats } = require('../services/socketService');

// In-memory storage for logs (we'll use a database later)
let logs = [];
let logIdCounter = 1;

/**
 * Add log to storage (used by generator)
 */
function addLog(logData) {
  logs.push(logData);
  
  // Keep only last 1000 logs in memory
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }
  
  // Emit updated stats
  const stats = calculateStats();
  emitStats(stats);
  
  return logData;
}

/**
 * Get all logs
 */
exports.getAllLogs = (req, res) => {
  try {
    const { limit = 100, severity } = req.query;
    
    let filteredLogs = logs;
    
    if (severity) {
      filteredLogs = logs.filter(log => log.severity === severity);
    }
    
    const limitedLogs = filteredLogs.slice(-parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      count: limitedLogs.length,
      data: limitedLogs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Create a new log entry
 */
exports.createLog = (req, res) => {
  try {
    const { message, severity, source, metadata } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Log message is required'
      });
    }
    
    const newLog = {
      id: logIdCounter++,
      message,
      severity: severity || 'info',
      source: source || 'unknown',
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };
    
    // Add to storage
    addLog(newLog);
    
    // Emit log to all connected WebSocket clients
    emitLog(newLog);
    
    res.status(201).json({
      status: 'success',
      data: newLog
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get logs by severity
 */
exports.getLogsBySeverity = (req, res) => {
  try {
    const { level } = req.params;
    const filteredLogs = logs.filter(log => log.severity === level);
    
    res.status(200).json({
      status: 'success',
      count: filteredLogs.length,
      data: filteredLogs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get log statistics
 */
exports.getLogStats = (req, res) => {
  try {
    const stats = calculateStats();
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Helper function to calculate stats
 */
function calculateStats() {
  return {
    total: logs.length,
    bySeverity: {
      critical: logs.filter(l => l.severity === 'critical').length,
      error: logs.filter(l => l.severity === 'error').length,
      warning: logs.filter(l => l.severity === 'warning').length,
      info: logs.filter(l => l.severity === 'info').length,
      debug: logs.filter(l => l.severity === 'debug').length
    },
    lastUpdated: logs.length > 0 ? logs[logs.length - 1].timestamp : null
  };
}

// Export storage functions for log generator
module.exports.logStorage = {
  addLog,
  getLogs: () => logs,
  getStats: calculateStats
};