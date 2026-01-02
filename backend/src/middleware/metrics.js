const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const logsProcessed = new client.Counter({
  name: 'logs_processed_total',
  help: 'Total number of logs processed',
  labelNames: ['severity'],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

module.exports = {
  register,
  httpRequestDuration,
  logsProcessed,
  activeConnections
};