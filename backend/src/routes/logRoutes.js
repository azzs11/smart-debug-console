const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { startLogGeneration, stopLogGeneration, isGenerationActive, setLogStorage } = require('../services/logGenerator');

// Initialize log storage for generator
setLogStorage(logController.logStorage);

// Get all logs
router.get('/', logController.getAllLogs);

// Create a new log entry
router.post('/', logController.createLog);

// Get logs by severity
router.get('/severity/:level', logController.getLogsBySeverity);

// Get log statistics
router.get('/stats', logController.getLogStats);

// Start automatic log generation
router.post('/generator/start', (req, res) => {
  const { interval = 2000 } = req.body;
  
  const started = startLogGeneration(interval);
  
  if (started) {
    res.status(200).json({
      status: 'success',
      message: 'Log generation started',
      interval: interval
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'Log generation already running'
    });
  }
});

// Stop automatic log generation
router.post('/generator/stop', (req, res) => {
  const stopped = stopLogGeneration();
  
  if (stopped) {
    res.status(200).json({
      status: 'success',
      message: 'Log generation stopped'
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'Log generation not running'
    });
  }
});

// Get generator status
router.get('/generator/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      isActive: isGenerationActive()
    }
  });
});

module.exports = router;