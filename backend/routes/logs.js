// backend/routes/logs.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mlService = require('../services/mlService');
const logEnricher = require('../utils/logEnricher');

// In-memory storage (replace with database in production)
let logs = [];
let logStats = {
  total: 0,
  bySeverity: {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
    debug: 0
  }
};

// Log generator state
let generatorInterval = null;
let generatorActive = false;

/**
 * GET /api/logs
 * Get all logs with optional limit and ML enrichment
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const withML = req.query.ml === 'true';
    
    let responseLogs = logs.slice(-limit);
    
    // Enrich with ML if requested and service is available
    if (withML && mlService.isAvailable()) {
      responseLogs = await logEnricher.enrichLogs(responseLogs);
    }
    
    res.json({
      status: 'success',
      data: responseLogs,
      count: responseLogs.length,
      ml_enabled: mlService.isAvailable()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/logs
 * Create a new log entry with ML classification
 */
router.post('/', async (req, res) => {
  try {
    const { message, severity, source } = req.body;

    if (!message || !severity) {
      return res.status(400).json({
        status: 'error',
        message: 'Message and severity are required'
      });
    }

    const log = {
      id: uuidv4(),
      message,
      severity,
      source: source || 'unknown',
      timestamp: new Date().toISOString()
    };

    // Enrich with ML classification
    const enrichedLog = await logEnricher.enrichLog(log);
    
    logs.push(enrichedLog);
    
    // Update stats
    logStats.total++;
    logStats.bySeverity[severity]++;

    // Emit to connected clients via WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('new-log', enrichedLog);
      req.app.get('io').emit('log-stats', logStats);
    }

    res.status(201).json({
      status: 'success',
      data: enrichedLog
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/stats
 * Get log statistics including ML accuracy
 */
router.get('/stats', (req, res) => {
  try {
    const mlStats = logEnricher.getMLStats(logs);
    
    res.json({
      status: 'success',
      data: {
        ...logStats,
        ml: mlStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/severity/:level
 * Get logs by severity level
 */
router.get('/severity/:level', (req, res) => {
  try {
    const { level } = req.params;
    const filteredLogs = logs.filter(log => log.severity === level);

    res.json({
      status: 'success',
      data: filteredLogs,
      count: filteredLogs.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/logs/generator/start
 * Start automatic log generation with ML classification
 */
router.post('/generator/start', (req, res) => {
  try {
    if (generatorActive) {
      return res.json({
        status: 'success',
        message: 'Generator already running'
      });
    }

    const interval = req.body.interval || 2000;
    const io = req.app.get('io');

    const severities = ['critical', 'error', 'warning', 'info', 'debug'];
    const sources = ['api', 'database', 'auth', 'cache', 'payment'];
    const messages = {
      critical: ['System crash detected', 'Fatal error occurred', 'Security breach detected'],
      error: ['Connection failed', 'Operation failed', 'Invalid request received'],
      warning: ['High memory usage', 'Slow query detected', 'Rate limit approaching'],
      info: ['Request processed', 'User logged in', 'Cache refreshed'],
      debug: ['Processing request', 'Function called', 'Variable state updated']
    };

    generatorInterval = setInterval(async () => {
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const messageTemplates = messages[severity];
      const message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

      const log = {
        id: uuidv4(),
        message: `${message} in ${source}`,
        severity,
        source,
        timestamp: new Date().toISOString()
      };

      // Enrich with ML
      const enrichedLog = await logEnricher.enrichLog(log);
      
      logs.push(enrichedLog);
      logStats.total++;
      logStats.bySeverity[severity]++;

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.shift();
      }

      if (io) {
        io.emit('new-log', enrichedLog);
        io.emit('log-stats', logStats);
      }
    }, interval);

    generatorActive = true;

    res.json({
      status: 'success',
      message: 'Log generator started',
      interval
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/logs/generator/stop
 * Stop automatic log generation
 */
router.post('/generator/stop', (req, res) => {
  try {
    if (!generatorActive) {
      return res.json({
        status: 'success',
        message: 'Generator not running'
      });
    }

    clearInterval(generatorInterval);
    generatorInterval = null;
    generatorActive = false;

    res.json({
      status: 'success',
      message: 'Log generator stopped'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/generator/status
 * Get generator status
 */
router.get('/generator/status', (req, res) => {
  res.json({
    status: 'success',
    data: {
      isActive: generatorActive
    }
  });
});

/**
 * GET /api/logs/ml/info
 * Get ML model information
 */
router.get('/ml/info', async (req, res) => {
  try {
    if (!mlService.isAvailable()) {
      return res.json({
        status: 'success',
        data: {
          available: false,
          message: 'ML service not available'
        }
      });
    }

    const modelInfo = await mlService.getModelInfo();
    
    res.json({
      status: 'success',
      data: {
        available: true,
        ...modelInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;