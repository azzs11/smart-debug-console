const express = require('express');
const router  = express.Router();
const logRepository  = require('../db/logRepository');
const anomalyDetector = require('../services/anomalyDetector');
const { validateQueryLimit } = require('../middleware/validation');

/** GET /api/anomalies — paginated recent anomalies */
router.get('/', validateQueryLimit, async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 50;
    const anomalies = await logRepository.getRecentAnomalies(limit);
    res.json({ status: 'success', data: anomalies, count: anomalies.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/anomalies/fingerprints — recurring anomaly patterns */
router.get('/fingerprints', (req, res) => {
  try {
    const fingerprints = anomalyDetector.getFingerprints();
    res.json({ status: 'success', data: fingerprints, count: fingerprints.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
