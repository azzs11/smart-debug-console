const express = require('express');
const cors    = require('cors');
const { rateLimiter }    = require('./middleware/rateLimiter');
const { metricsEndpoint } = require('./middleware/metrics');
const logsRouter   = require('./routes/logs');
const causalRouter = require('./routes/causal');
const healthRouter = require('./routes/health');
const logger = require('./config/logger');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

app.get('/metrics', metricsEndpoint);
app.use('/health',     healthRouter);
app.use('/api/logs',   logsRouter);
app.use('/api/causal', causalRouter);

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.path} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

module.exports = app;
