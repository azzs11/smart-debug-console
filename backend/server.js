require('dotenv').config();
const http = require('http');
const app  = require('./src/app');
const { initializeSocket, setLogProcessor, emitLog, emitStats, emitCausalEvent } = require('./src/socket/socketHandler');
const { processLog, setEmitters } = require('./src/services/logProcessor');
const { onChainDetected } = require('./src/services/causalEngine');
const { connectDB }  = require('./src/db/client');
const { checkHealth } = require('./src/services/mlService');
const logger = require('./src/config/logger');

const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

initializeSocket(server);
setLogProcessor(processLog);
setEmitters({ emitLog, emitStats, emitCausalEvent });
onChainDetected(emitCausalEvent);

connectDB().catch(err => logger.warn('PostgreSQL unavailable — using in-memory fallback', { error: err.message }));

server.listen(PORT, () => {
  logger.info(`Smart Debug Console v2.0 running on :${PORT}`);
  logger.info(`Prometheus metrics → http://localhost:${PORT}/metrics`);
  logger.info(`Causal graph API  → http://localhost:${PORT}/api/causal/chains`);
});

setInterval(checkHealth, 30000);
