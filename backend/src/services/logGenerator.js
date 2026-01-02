const { emitLog } = require('./socketService');

const LOG_MESSAGES = [
  // Info messages
  { message: 'User authentication successful', severity: 'info', source: 'auth-service' },
  { message: 'Database connection established', severity: 'info', source: 'database' },
  { message: 'API request completed successfully', severity: 'info', source: 'api-gateway' },
  { message: 'Cache hit for user profile', severity: 'info', source: 'cache-service' },
  { message: 'Payment processed successfully', severity: 'info', source: 'payment-service' },
  
  // Warning messages
  { message: 'High memory usage detected: 85%', severity: 'warning', source: 'monitoring' },
  { message: 'API response time exceeded 500ms', severity: 'warning', source: 'api-gateway' },
  { message: 'Cache miss - fetching from database', severity: 'warning', source: 'cache-service' },
  { message: 'Retry attempt 2 of 3 for external API', severity: 'warning', source: 'integration' },
  
  // Error messages
  { message: 'Failed to connect to database', severity: 'error', source: 'database' },
  { message: 'Invalid user credentials provided', severity: 'error', source: 'auth-service' },
  { message: 'Payment gateway timeout', severity: 'error', source: 'payment-service' },
  { message: 'File upload failed: size exceeded', severity: 'error', source: 'storage-service' },
  
  // Critical messages
  { message: 'Database connection pool exhausted', severity: 'critical', source: 'database' },
  { message: 'System running out of memory', severity: 'critical', source: 'monitoring' },
  { message: 'Security breach detected', severity: 'critical', source: 'security-service' },
  
  // Debug messages
  { message: 'Query execution time: 45ms', severity: 'debug', source: 'database' },
  { message: 'User session initialized', severity: 'debug', source: 'session-manager' },
  { message: 'HTTP request received: GET /api/users', severity: 'debug', source: 'api-gateway' }
];

let isGenerating = false;
let generatorInterval = null;
let logIdCounter = 1000; // Start from 1000 for generated logs

// Import the log storage functions
let logStorage = null;

/**
 * Set log storage reference
 */
function setLogStorage(storage) {
  logStorage = storage;
}

/**
 * Start generating random logs
 */
function startLogGeneration(intervalMs = 2000) {
  if (isGenerating) {
    console.log('⚠️ Log generation already running');
    return false;
  }

  isGenerating = true;
  console.log(`🤖 Started automatic log generation (interval: ${intervalMs}ms)`);

  generatorInterval = setInterval(() => {
    const randomLog = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
    
    const generatedLog = {
      id: logIdCounter++,
      message: randomLog.message,
      severity: randomLog.severity,
      source: randomLog.source,
      metadata: {
        generated: true,
        responseTime: Math.floor(Math.random() * 1000) + 'ms',
        userId: `user_${Math.floor(Math.random() * 1000)}`
      },
      timestamp: new Date().toISOString()
    };

    // Store log in memory
    if (logStorage) {
      logStorage.addLog(generatedLog);
    }

    // Emit via WebSocket
    emitLog(generatedLog);
    
    console.log(`📤 Generated log [${generatedLog.severity.toUpperCase()}]: ${generatedLog.message}`);
  }, intervalMs);

  return true;
}

/**
 * Stop generating logs
 */
function stopLogGeneration() {
  if (!isGenerating) {
    console.log('⚠️ Log generation not running');
    return false;
  }

  clearInterval(generatorInterval);
  isGenerating = false;
  generatorInterval = null;
  console.log('🛑 Stopped automatic log generation');
  return true;
}

/**
 * Check if generation is active
 */
function isGenerationActive() {
  return isGenerating;
}

module.exports = {
  startLogGeneration,
  stopLogGeneration,
  isGenerationActive,
  setLogStorage
};