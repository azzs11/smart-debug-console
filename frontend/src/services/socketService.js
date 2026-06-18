import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this._handlers = {};
  }

  connect(url = process.env.REACT_APP_WS_URL || 'http://localhost:5000') {
    if (this.socket?.connected) return this.socket;

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect',    () => { this.isConnected = true; });
    this.socket.on('disconnect', () => { this.isConnected = false; });
    this.socket.on('connect_error', (err) => console.warn('WS error:', err.message));

    return this.socket;
  }

  disconnect() {
    if (this.socket) { this.socket.disconnect(); this.socket = null; this.isConnected = false; }
  }

  on(event, cb) {
    if (this.socket) this.socket.on(event, cb);
  }

  off(event, cb) {
    if (this.socket) this.socket.off(event, cb);
  }

  onNewLog(cb)           { this.on('new-log', cb); }
  onStatsUpdate(cb)      { this.on('log-stats', cb); }
  onConnectionSuccess(cb){ this.on('connection-success', cb); }
  onCausalEvent(cb)      { this.on('causal-event', cb); }

  sendLog(logData) {
    if (this.socket?.connected) this.socket.emit('send-log', logData);
  }

  getConnectionStatus() { return this.isConnected; }
  removeAllListeners()  { if (this.socket) this.socket.removeAllListeners(); }
}

const socketService = new SocketService();
export default socketService;
