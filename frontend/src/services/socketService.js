import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(url = process.env.REACT_APP_WS_URL || 'http://localhost:5000') {
    if (this.socket?.connected) {
      console.log('Already connected to WebSocket');
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('❌ Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Listen for new logs
   */
  onNewLog(callback) {
    if (this.socket) {
      this.socket.on('new-log', callback);
    }
  }

  /**
   * Listen for stats updates
   */
  onStatsUpdate(callback) {
    if (this.socket) {
      this.socket.on('log-stats', callback);
    }
  }

  /**
   * Listen for connection success
   */
  onConnectionSuccess(callback) {
    if (this.socket) {
      this.socket.on('connection-success', callback);
    }
  }

  /**
   * Send a log manually
   */
  sendLog(logData) {
    if (this.socket?.connected) {
      this.socket.emit('send-log', logData);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;