const rateLimit = require('express-rate-limit');

const onLimitReached = (req, res) => {
  res.status(429).json({ status: 'error', message: 'Too many requests — please slow down' });
};

/**
 * Global API limiter — 100 req/min on all routes.
 * Applied in app.js before all routes.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached
});

/**
 * Log ingestion limiter — 500 req/min on POST /api/logs.
 * High throughput for stream ingestion.
 */
const logsIngestionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached
});

/**
 * Generator endpoint limiter — 10 req/min.
 * Prevents accidental rapid start/stop loops.
 */
const generatorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached
});

module.exports = { apiLimiter, logsIngestionLimiter, generatorLimiter };
