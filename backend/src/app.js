const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const { apiLimiter }      = require('./middleware/rateLimiter');
const { metricsEndpoint } = require('./middleware/metrics');
const logsRouter      = require('./routes/logs');
const causalRouter    = require('./routes/causal');
const healthRouter    = require('./routes/health');
const metricsRouter   = require('./routes/metrics');
const anomaliesRouter = require('./routes/anomalies');
const logger = require('./config/logger');

const app = express();

// ── Security headers (must come first) ───────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false  // allow frontend to fetch metrics/API from same origin
}));

// ── CORS (explicit origins only) ──────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no Origin header) and configured origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id']
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Global rate limit (100 req/min) ──────────────────────────────────────────
app.use(apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/metrics', metricsEndpoint);
app.use('/health',          healthRouter);
app.use('/api/logs',        logsRouter);
app.use('/api/causal',      causalRouter);
app.use('/api/anomalies',   anomaliesRouter);
app.use('/api/metrics',     metricsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ status: 'error', message: err.message });
  }
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

module.exports = app;
