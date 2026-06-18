const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

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

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const causalLinksDetected = new client.Counter({
  name: 'causal_links_detected_total',
  help: 'Total number of causal links detected between logs',
  registers: [register]
});

const anomaliesDetected = new client.Counter({
  name: 'anomalies_detected_total',
  help: 'Total number of anomalous log patterns detected',
  registers: [register]
});

async function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  register,
  logsProcessed,
  activeConnections,
  httpRequestDuration,
  causalLinksDetected,
  anomaliesDetected,
  metricsEndpoint
};
