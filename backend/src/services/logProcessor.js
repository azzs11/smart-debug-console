/**
 * Log Processor — central orchestrator for all log enrichment.
 *
 * Every incoming log (from REST, WebSocket, or the generator) flows through
 * this function in order:
 *   1. Normalise fields
 *   2. ML classification  (optional — degrades gracefully)
 *   3. Causal analysis    (always on, in-memory)
 *   4. Anomaly detection  (always on, in-memory)
 *   5. Persist to DB      (in-memory fallback when Postgres unavailable)
 *   6. Broadcast via WebSocket + update Prometheus counters
 */

const { v4: uuidv4 } = require('uuid');
const { VALID_SEVERITIES } = require('../config/constants');
const mlService       = require('./mlService');
const causalEngine    = require('./causalEngine');
const anomalyDetector = require('./anomalyDetector');
const logRepository   = require('../db/logRepository');
const { logsProcessed, causalLinksDetected, anomaliesDetected } = require('../middleware/metrics');
const logger = require('../config/logger');

// Socket emitters injected lazily to avoid circular imports at module load
let _emitLog    = () => {};
let _emitStats  = () => {};
let _emitCausal = () => {};

function setEmitters({ emitLog, emitStats, emitCausalEvent }) {
  _emitLog    = emitLog        || _emitLog;
  _emitStats  = emitStats      || _emitStats;
  _emitCausal = emitCausalEvent || _emitCausal;
}

async function processLog(logData) {
  // 1. Normalise
  const log = {
    id:        logData.id        || uuidv4(),
    message:   (logData.message  || 'No message').trim().slice(0, 2000),
    severity:  VALID_SEVERITIES.includes(logData.severity) ? logData.severity : 'info',
    source:    (logData.source   || 'unknown').slice(0, 100),
    timestamp: logData.timestamp || new Date().toISOString(),
    ml:              null,
    causal:          null,
    is_anomaly:      false,
    anomaly_score:   0,
    fingerprint_hash: null
  };

  // 2. ML classification
  try {
    const mlResult = await mlService.classify(log.message);
    if (mlResult) {
      log.ml = {
        predicted_severity: mlResult.predicted_severity,
        confidence:         mlResult.confidence,
        probabilities:      mlResult.probabilities,
        severity_match:     mlResult.predicted_severity === log.severity
      };
    }
  } catch (err) {
    logger.debug('ML classification skipped', { error: err.message });
  }

  // 3. Causal analysis
  const causalResult = causalEngine.analyzeLog(log);
  log.causal = causalResult;

  // 4. Anomaly detection
  const anomalyResult      = anomalyDetector.analyze(log);
  log.is_anomaly           = anomalyResult.isAnomaly;
  log.anomaly_score        = anomalyResult.anomalyScore;
  log.fingerprint_hash     = anomalyResult.fingerprintHash;

  // 5. Persist
  try {
    await logRepository.insertLog(log);
  } catch (err) {
    logger.error('Failed to persist log', { logId: log.id, error: err.message });
  }

  // 6. Prometheus counters
  logsProcessed.inc({ severity: log.severity });
  if (causalResult.causal_parent_id) causalLinksDetected.inc();
  if (anomalyResult.isAnomaly)       anomaliesDetected.inc();

  // 7. Broadcast
  _emitLog(log);

  logRepository.getStats()
    .then(stats => _emitStats(stats))
    .catch(() => {});

  if (causalResult.causal_parent_id) {
    _emitCausal({
      type:         'new-causal-link',
      log_id:       log.id,
      parent_id:    causalResult.causal_parent_id,
      root_id:      causalResult.causal_root_id,
      depth:        causalResult.causal_chain_depth,
      blast_radius: causalResult.blast_radius_score
    });

    // Deep chain alert — frontend can surface the full root-cause narrative
    if (causalResult.causal_chain_depth >= 3) {
      const chain = causalEngine.getChainById(causalResult.causal_root_id);
      _emitCausal({
        type:               'causal-chain-detected',
        root_id:            causalResult.causal_root_id,
        triggering_log_id:  log.id,
        chain_depth:        causalResult.causal_chain_depth,
        total_affected:     chain.length,
        blast_radius_score: parseFloat(chain.reduce((s, l) => s + (l.blast_radius_score ?? 0), 0).toFixed(3)),
        chain_preview:      chain.slice(0, 6).map(l => ({
          id: l.id, severity: l.severity, message: l.message.slice(0, 60), source: l.source
        }))
      });
    }
  }

  return log;
}

module.exports = { processLog, setEmitters };
