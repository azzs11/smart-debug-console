const socketIo = require('socket.io');

let io;
let connectedClients = 0;

/**
 * Initialize Socket.io server
 */
function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: '*', // In production, specify your frontend URL
      methods: ['GET', 'POST']
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    connectedClients++;
    console.log(`✅ New client connected. ID: ${socket.id} | Total clients: ${connectedClients}`);

    // Send welcome message
    socket.emit('connection-success', {
      message: 'Connected to Smart Debug Console',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle client requesting logs
    socket.on('request-logs', (data) => {
      console.log(`📥 Client ${socket.id} requested logs:`, data);
      socket.emit('logs-response', {
        message: 'Logs streaming started',
        timestamp: new Date().toISOString()
      });
    });

    // Handle client sending a log
    socket.on('send-log', (logData) => {
      console.log(`📨 Received log from client ${socket.id}:`, logData);
      
      // Broadcast to all clients (including sender)
      io.emit('new-log', {
        ...logData,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      connectedClients--;
      console.log(`❌ Client disconnected. ID: ${socket.id} | Total clients: ${connectedClients}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error from ${socket.id}:`, error);
    });
  });

  return io;
}

/**
 * Emit a log to all connected clients
 */
function emitLog(logData) {
  if (io) {
    io.emit('new-log', logData);
    return true;
  }
  return false;
}

/**
 * Emit log statistics to all connected clients
 */
function emitStats(stats) {
  if (io) {
    io.emit('log-stats', stats);
    return true;
  }
  return false;
}

/**
 * Get current connection count
 */
function getConnectionCount() {
  return connectedClients;
}

module.exports = {
  initializeSocket,
  emitLog,
  emitStats,
  getConnectionCount
};