const express = require('express');
const router  = express.Router();
const mlService       = require('../services/mlService');
const { isPgAvailable } = require('../db/client');

router.get('/', async (req, res) => {
  res.json({
    status:  'success',
    service: 'smart-debug-console',
    version: '2.0.0',
    features: {
      ml_classification:   mlService.isAvailable(),
      causal_intelligence: true,
      anomaly_detection:   true,
      persistence:         isPgAvailable() ? 'postgresql' : 'in-memory'
    },
    uptime:    process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
