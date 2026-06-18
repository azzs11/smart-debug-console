/**
 * Temporal Anomaly Fingerprinting
 *
 * Learns the normal "rhythm" of the log stream — what severities appear in
 * what ratios and sequence — and detects when that rhythm breaks, even if
 * each individual log looks ordinary.
 *
 * Algorithm:
 *   1. Maintain a sliding window of the last ANOMALY_WINDOW_SIZE logs.
 *   2. Recompute a baseline distribution every 10 logs.
 *   3. For each new log, compare the recent 10-log slice against baseline
 *      using a weighted relative deviation (heavier on critical/error).
 *   4. Add a spike bonus when high-severity logs appear at >2x baseline rate.
 *   5. Compute a SHA-256 fingerprint of the last-20 severity sequence.
 */

const crypto = require('crypto');
const { ANOMALY_WINDOW_SIZE, SEVERITY_WEIGHTS } = require('../config/constants');
const logger = require('../config/logger');

let window = [];
let baseline = null;
let processedCount = 0;

const ANOMALY_THRESHOLD = 0.60;
const SEVERITY_DEVIATION_WEIGHTS = { critical: 3.0, error: 2.0, warning: 1.2, info: 0.8, debug: 0.5 };

function updateWindow(log) {
  window.push({ severity: log.severity, timestamp: log.timestamp });
  if (window.length > ANOMALY_WINDOW_SIZE) window.shift();
  processedCount++;
}

function computeBaseline() {
  if (window.length < 20) return null;

  const counts = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
  window.forEach(l => counts[l.severity] = (counts[l.severity] || 0) + 1);
  const total = window.length;

  const distribution = {};
  for (const [sev, count] of Object.entries(counts)) {
    distribution[sev] = count / total;
  }

  let totalInterval = 0, intervalCount = 0;
  for (let i = 1; i < window.length; i++) {
    const delta = new Date(window[i].timestamp) - new Date(window[i - 1].timestamp);
    if (delta >= 0) { totalInterval += delta; intervalCount++; }
  }

  return { distribution, avgIntervalMs: intervalCount > 0 ? totalInterval / intervalCount : 2000 };
}

function computeAnomalyScore(log) {
  if (!baseline || window.length < 20) return 0;

  const recentSlice = window.slice(-10);
  const recentTotal = recentSlice.length;
  const recentCounts = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
  recentSlice.forEach(l => recentCounts[l.severity] = (recentCounts[l.severity] || 0) + 1);

  let deviationScore = 0;
  for (const sev of Object.keys(SEVERITY_WEIGHTS)) {
    const expected = (baseline.distribution[sev] || 0) * recentTotal;
    const observed = recentCounts[sev] || 0;
    if (expected > 0.1) {
      const relDeviation = Math.abs(observed - expected) / expected;
      deviationScore += relDeviation * (SEVERITY_DEVIATION_WEIGHTS[sev] || 1);
    }
  }

  const recentHighRate   = (recentCounts.critical + recentCounts.error) / recentTotal;
  const baselineHighRate = (baseline.distribution.critical || 0) + (baseline.distribution.error || 0);
  const spikeBonus = baselineHighRate > 0 && recentHighRate > baselineHighRate * 2 ? 0.35 : 0;

  const lastTwo = window.slice(-2);
  let intervalBonus = 0;
  if (lastTwo.length === 2 && baseline.avgIntervalMs > 0) {
    const gap = new Date(lastTwo[1].timestamp) - new Date(lastTwo[0].timestamp);
    if (gap < baseline.avgIntervalMs * 0.1) intervalBonus = 0.1;
  }

  return Math.min((deviationScore / 8) + spikeBonus + intervalBonus, 1);
}

function buildFingerprintHash() {
  const sequence = window.slice(-20).map(l => l.severity[0]).join('');
  return crypto.createHash('sha256').update(sequence).digest('hex').slice(0, 64);
}

/**
 * Analyse a log entry for temporal anomalies.
 * @returns {{ isAnomaly: boolean, anomalyScore: number, fingerprintHash: string }}
 */
function analyze(log) {
  updateWindow(log);

  if (processedCount % 10 === 0) {
    baseline = computeBaseline();
  }

  const anomalyScore    = computeAnomalyScore(log);
  const isAnomaly       = anomalyScore >= ANOMALY_THRESHOLD;
  const fingerprintHash = buildFingerprintHash();

  if (isAnomaly) {
    logger.debug('Anomaly detected in log stream', {
      logId:       log.id?.slice(0, 8),
      severity:    log.severity,
      score:       anomalyScore.toFixed(3),
      fingerprint: fingerprintHash.slice(0, 16)
    });
  }

  return { isAnomaly, anomalyScore: parseFloat(anomalyScore.toFixed(4)), fingerprintHash };
}

module.exports = { analyze };
