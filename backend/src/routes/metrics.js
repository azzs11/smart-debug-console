const express = require('express');
const router  = express.Router();
const logRepository   = require('../db/logRepository');
const causalEngine    = require('../services/causalEngine');
const mlService       = require('../services/mlService');

let _mlAccuracy = 0;
let _mlClassified = 0;

/** Called by the log processor to keep running ML accuracy */
function updateMLStats({ accuracy, classified }) {
  _mlAccuracy   = accuracy   ?? _mlAccuracy;
  _mlClassified = classified ?? _mlClassified;
}

/** GET /api/metrics/summary */
router.get('/summary', async (req, res) => {
  try {
    const stats  = await logRepository.getStats();
    const chains = causalEngine.getActiveCausalChains();

    const maxBlastRadius = chains.length
      ? Math.max(...chains.map(c => c.blast_radius_score))
      : 0;

    const topErrorSource = (() => {
      const mem = logRepository.getMemLogs?.() || [];
      const errorLogs = mem.filter(l => l.severity === 'error' || l.severity === 'critical');
      if (!errorLogs.length) return null;
      const counts = {};
      errorLogs.forEach(l => counts[l.source] = (counts[l.source] || 0) + 1);
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    })();

    res.json({
      status: 'success',
      data: {
        total_logs:           stats.total,
        anomaly_count:        stats.anomalyCount,
        anomaly_rate:         stats.total > 0
          ? parseFloat((stats.anomalyCount / stats.total).toFixed(4))
          : 0,
        active_causal_chains: chains.length,
        blast_radius_max:     parseFloat(maxBlastRadius.toFixed(3)),
        top_error_source:     topErrorSource,
        ml_available:         mlService.isAvailable(),
        ml_accuracy:          parseFloat(_mlAccuracy.toFixed(4)),
        ml_classified:        _mlClassified,
        by_severity:          stats.bySeverity
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
module.exports.updateMLStats = updateMLStats;
