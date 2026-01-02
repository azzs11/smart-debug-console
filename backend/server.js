// backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configuration
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// In-memory storage
let logs = [];
let stats = {
  total: 0,
  bySeverity: {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
    debug: 0
  },
  ml: {
    total_classified: 0,
    correct_predictions: 0,
    accuracy: 0,
    avg_confidence: 0
  }
};

// Log generator state
let logGenerator = null;
let isGeneratorActive = false;

// ML Service health check
let mlServiceAvailable = false;

async function checkMLService() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    mlServiceAvailable = response.data.model_loaded === true;
    console.log(`🤖 ML Service: ${mlServiceAvailable ? '✅ Available' : '⚠️ Not Available'}`);
    return mlServiceAvailable;
  } catch (error) {
    mlServiceAvailable = false;
    console.log('⚠️ ML Service: Not Available');
    return false;
  }
}

// Classify log with ML service
async function classifyLog(message) {
  if (!mlServiceAvailable) {
    return null;
  }

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/api/classify`,
      { message },
      { timeout: 3000 }
    );

    if (response.data.status === 'success') {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('ML Classification error:', error.message);
    return null;
  }
}

// Update ML stats
function updateMLStats(log) {
  if (!log.ml) return;

  stats.ml.total_classified++;
  
  if (log.ml.severity_match) {
    stats.ml.correct_predictions++;
  }
  
  stats.ml.accuracy = stats.ml.total_classified > 0 
    ? (stats.ml.correct_predictions / stats.ml.total_classified) * 100 
    : 0;
  
  // Update average confidence
  const totalConfidence = logs
    .filter(l => l.ml && l.ml.confidence)
    .reduce((sum, l) => sum + l.ml.confidence, 0);
  
  const classifiedCount = logs.filter(l => l.ml && l.ml.confidence).length;
  stats.ml.avg_confidence = classifiedCount > 0 
    ? (totalConfidence / classifiedCount) * 100 
    : 0;
}

// Socket.io connection
io.on('connection', async (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Check ML service on connection
  const mlAvailable = await checkMLService();
  
  socket.emit('connection-success', {
    message: 'Connected to Smart Debug Console',
    ml_enabled: mlAvailable,
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });

  socket.on('send-log', async (logData) => {
    const log = await createLog(logData);
    socket.broadcast.emit('new-log', log);
  });
});

// Create log with ML classification
async function createLog(logData) {
  const log = {
    id: uuidv4(),
    message: logData.message || 'No message',
    severity: logData.severity || 'info',
    source: logData.source || 'unknown',
    timestamp: new Date().toISOString(),
    ml: null
  };

  // Classify with ML if available
  if (mlServiceAvailable) {
    const mlResult = await classifyLog(log.message);
    if (mlResult) {
      log.ml = {
        predicted_severity: mlResult.predicted_severity,
        confidence: mlResult.confidence,
        probabilities: mlResult.probabilities,
        severity_match: mlResult.predicted_severity === log.severity
      };
      updateMLStats(log);
    }
  }

  // Update stats
  stats.total++;
  if (stats.bySeverity[log.severity] !== undefined) {
    stats.bySeverity[log.severity]++;
  }

  // Store log
  logs.push(log);
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }

  // Emit to all clients
  io.emit('new-log', log);
  io.emit('log-stats', stats);

  return log;
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend server is running',
    ml_service: mlServiceAvailable
  });
});

// Get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const recentLogs = logs.slice(-limit);
    
    res.json({
      status: 'success',
      data: recentLogs,
      count: recentLogs.length,
      ml_enabled: mlServiceAvailable
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create new log
app.post('/api/logs', async (req, res) => {
  try {
    const log = await createLog(req.body);
    
    res.status(201).json({
      status: 'success',
      data: log
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get logs by severity
app.get('/api/logs/severity/:severity', (req, res) => {
  try {
    const severity = req.params.severity.toLowerCase();
    const filteredLogs = logs.filter(log => log.severity === severity);
    
    res.json({
      status: 'success',
      data: filteredLogs,
      count: filteredLogs.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get statistics
app.get('/api/logs/stats', (req, res) => {
  res.json({
    status: 'success',
    data: stats
  });
});

// Log generator templates
const logTemplates = {
  critical: [
    'System crash detected in {module}',
    'Fatal error: out of memory',
    'Database connection lost permanently',
    'Security breach detected',
    'Complete system shutdown required'
  ],
  error: [
    'Failed to connect to database',
    'API request failed: 404 not found',
    'Authentication failed',
    'File upload failed',
    'Payment processing error'
  ],
  warning: [
    'High memory usage: {percent}%',
    'Slow query detected',
    'Rate limit approaching',
    'Cache miss ratio high',
    'Disk space low'
  ],
  info: [
    'User logged in successfully',
    'Request completed in {time}ms',
    'Service health check passed',
    'Data sync completed',
    'Configuration loaded'
  ],
  debug: [
    'Processing request ID: {id}',
    'Function called: {function}',
    'Variable state: {variable}={value}',
    'Query execution time: {time}ms',
    'Cache hit for key: {key}'
  ]
};

const modules = ['auth', 'api', 'database', 'cache', 'payment', 'notification'];

function generateRandomLog() {
  const severities = Object.keys(logTemplates);
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const templates = logTemplates[severity];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const message = template
    .replace('{module}', modules[Math.floor(Math.random() * modules.length)])
    .replace('{percent}', Math.floor(Math.random() * 30) + 70)
    .replace('{time}', Math.floor(Math.random() * 500) + 10)
    .replace('{id}', Math.floor(Math.random() * 10000))
    .replace('{function}', 'process_data')
    .replace('{variable}', 'userId')
    .replace('{value}', Math.floor(Math.random() * 1000))
    .replace('{key}', `key_${Math.floor(Math.random() * 100)}`);
  
  return {
    message,
    severity,
    source: modules[Math.floor(Math.random() * modules.length)]
  };
}

// Start log generator
app.post('/api/logs/generator/start', (req, res) => {
  if (isGeneratorActive) {
    return res.json({
      status: 'error',
      message: 'Generator already running'
    });
  }

  const interval = req.body.interval || 2000;
  
  logGenerator = setInterval(async () => {
    const logData = generateRandomLog();
    await createLog(logData);
  }, interval);
  
  isGeneratorActive = true;
  
  res.json({
    status: 'success',
    message: 'Log generator started',
    interval
  });
});

// Stop log generator
app.post('/api/logs/generator/stop', (req, res) => {
  if (!isGeneratorActive) {
    return res.json({
      status: 'error',
      message: 'Generator not running'
    });
  }

  clearInterval(logGenerator);
  logGenerator = null;
  isGeneratorActive = false;
  
  res.json({
    status: 'success',
    message: 'Log generator stopped'
  });
});

// Get generator status
app.get('/api/logs/generator/status', (req, res) => {
  res.json({
    status: 'success',
    data: {
      isActive: isGeneratorActive
    }
  });
});

// Start server
server.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SMART DEBUG CONSOLE - BACKEND SERVER');
  console.log('='.repeat(60));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready for connections`);
  
  // Check ML service on startup
  await checkMLService();
  
  console.log('='.repeat(60) + '\n');
});

// Periodic ML service health check (every 30 seconds)
setInterval(checkMLService, 30000);

const { register, logsProcessed } = require('./src/middleware/metrics');

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Track logs when they're created
io.on('connection', (socket) => {
  socket.on('send-log', (logData) => {
    // ... existing code ...
    logsProcessed.inc({ severity: logData.severity });
  });
});