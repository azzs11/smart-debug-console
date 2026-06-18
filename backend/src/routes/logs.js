const express = require('express');
const router  = express.Router();
const { DEFAULT_LOG_LIMIT, GENERATOR_DEFAULT_INTERVAL_MS } = require('../config/constants');
const { validateLog, validateQueryLimit } = require('../middleware/validation');
const logRepository = require('../db/logRepository');
const { processLog } = require('../services/logProcessor');

let generatorInterval = null;
let generatorActive   = false;

// Weighted severity distribution biased toward realistic "normal" traffic
const GENERATOR_SEVERITY_POOL = [
  'critical', 'error', 'error',
  'warning', 'warning', 'warning',
  'info', 'info', 'info', 'info', 'info',
  'debug', 'debug'
];

const LOG_TEMPLATES = {
  critical: [
    { msg: 'Database connection pool exhausted',            src: 'database' },
    { msg: 'System running out of memory',                  src: 'monitoring' },
    { msg: 'Security breach detected in auth-service',      src: 'auth-service' },
    { msg: 'Fatal error: kernel panic in api-gateway',      src: 'api-gateway' }
  ],
  error: [
    { msg: 'Failed to connect to database after 3 retries', src: 'api' },
    { msg: 'Authentication failed: invalid credentials',     src: 'auth-service' },
    { msg: 'Payment gateway timeout after 30s',              src: 'payment-service' },
    { msg: 'API request failed with HTTP 500',               src: 'api-gateway' },
    { msg: 'File upload rejected: size limit exceeded',      src: 'storage-service' }
  ],
  warning: [
    { msg: 'High memory usage detected: {pct}%',            src: 'monitoring' },
    { msg: 'Slow query detected: {time}ms response time',   src: 'database' },
    { msg: 'Rate limit approaching for downstream service',  src: 'api-gateway' },
    { msg: 'Cache miss ratio elevated: {pct}%',             src: 'cache-service' },
    { msg: 'Retry attempt {n} of 3 for external API call',  src: 'integration' }
  ],
  info: [
    { msg: 'User authentication successful',                 src: 'auth-service' },
    { msg: 'Request completed in {time}ms',                  src: 'api-gateway' },
    { msg: 'Service health check passed',                    src: 'monitoring' },
    { msg: 'Data sync completed successfully',               src: 'database' },
    { msg: 'Cache warmed up for user_{id}',                  src: 'cache-service' }
  ],
  debug: [
    { msg: 'Processing request ID: req_{id}',               src: 'api-gateway' },
    { msg: 'Query execution time: {time}ms',                src: 'database' },
    { msg: 'Cache hit for session key: sess_{id}',          src: 'cache-service' },
    { msg: 'User session initialised for user_{id}',        src: 'session-manager' }
  ]
};

function generateLogData() {
  const severity  = GENERATOR_SEVERITY_POOL[Math.floor(Math.random() * GENERATOR_SEVERITY_POOL.length)];
  const templates = LOG_TEMPLATES[severity];
  const tpl       = templates[Math.floor(Math.random() * templates.length)];

  const message = tpl.msg
    .replace('{pct}',  () => Math.floor(Math.random() * 30) + 70)
    .replace('{time}', () => Math.floor(Math.random() * 500) + 10)
    .replace('{id}',   () => Math.floor(Math.random() * 10000))
    .replace('{n}',    () => Math.floor(Math.random() * 2) + 1);

  return { message, severity, source: tpl.src };
}

/** GET /api/logs */
router.get('/', validateQueryLimit, async (req, res) => {
  try {
    const limit        = parseInt(req.query.limit) || DEFAULT_LOG_LIMIT;
    const { severity, source, search } = req.query;
    const onlyAnomalies = req.query.anomalies === 'true';

    const logs = await logRepository.getLogs({ limit, severity, source, search, onlyAnomalies });
    res.json({ status: 'success', data: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** POST /api/logs */
router.post('/', validateLog, async (req, res) => {
  try {
    const log = await processLog(req.body);
    res.status(201).json({ status: 'success', data: log });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/logs/stats */
router.get('/stats', async (req, res) => {
  try {
    const stats = await logRepository.getStats();
    res.json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/logs/anomalies */
router.get('/anomalies', async (req, res) => {
  try {
    const limit     = parseInt(req.query.limit) || 20;
    const anomalies = await logRepository.getRecentAnomalies(limit);
    res.json({ status: 'success', data: anomalies, count: anomalies.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/logs/severity/:severity */
router.get('/severity/:severity', async (req, res) => {
  try {
    const logs = await logRepository.getLogs({ severity: req.params.severity, limit: 100 });
    res.json({ status: 'success', data: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/logs/generator/status */
router.get('/generator/status', (req, res) => {
  res.json({ status: 'success', data: { isActive: generatorActive } });
});

/** POST /api/logs/generator/start */
router.post('/generator/start', (req, res) => {
  if (generatorActive) {
    return res.json({ status: 'success', message: 'Generator already running' });
  }
  const interval = parseInt(req.body.interval) || GENERATOR_DEFAULT_INTERVAL_MS;
  generatorInterval = setInterval(() => processLog(generateLogData()), interval);
  generatorActive   = true;
  res.json({ status: 'success', message: 'Log generator started', interval });
});

/** POST /api/logs/generator/stop */
router.post('/generator/stop', (req, res) => {
  if (!generatorActive) {
    return res.json({ status: 'success', message: 'Generator not running' });
  }
  clearInterval(generatorInterval);
  generatorInterval = null;
  generatorActive   = false;
  res.json({ status: 'success', message: 'Log generator stopped' });
});

module.exports = router;
