const socketIo = require('socket.io');
const { activeConnections } = require('../middleware/metrics');
const mlService = require('../services/mlService');
const logger = require('../config/logger');

let io = null;
// Injected after server + logProcessor are both initialised (avoids circular imports)
let _processLog = async () => ({});

function setLogProcessor(fn) { _processLog = fn; }

function initializeSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

  io = socketIo(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Socket.io CORS: origin ${origin} not allowed`));
      },
      methods:      ['GET', 'POST'],
      credentials:  true
    }
  });

  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', { id: socket.id });
    activeConnections.inc();

    socket.emit('connection-success', {
      message: 'Connected to Smart Debug Console v2',
      ml_enabled: mlService.isAvailable(),
      features: ['causal-intelligence', 'anomaly-detection'],
      timestamp: new Date().toISOString()
    });

    // Client can submit a log directly via WebSocket
    socket.on('send-log', async (logData) => {
      try {
        const log = await _processLog(logData);
        // broadcast to OTHER clients (originator gets it via the log processor's emitLog)
        socket.broadcast.emit('new-log', log);
      } catch (err) {
        logger.error('Error processing socket log', { error: err.message });
        socket.emit('error', { message: 'Failed to process log' });
      }
    });

    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', { id: socket.id });
      activeConnections.dec();
    });

    socket.on('error', (err) => {
      logger.warn('WebSocket error', { id: socket.id, error: err.message });
    });
  });

  return io;
}

function emitLog(log)         { io?.emit('new-log', log); }
function emitStats(stats)     { io?.emit('log-stats', stats); }
function emitCausalEvent(evt) { io?.emit('causal-event', evt); }
function getIo()              { return io; }

module.exports = { initializeSocket, setLogProcessor, emitLog, emitStats, emitCausalEvent, getIo };
