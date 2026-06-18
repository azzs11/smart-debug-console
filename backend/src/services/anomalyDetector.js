/**
 * Temporal Anomaly Fingerprinting
 *
 * Learns the "rhythm" of the log stream and detects when it breaks — even
 * when individual logs look normal. Inspired by how DDoS detection works:
 * not the individual packet, but the pattern.
 *
 * Baseline (recomputed every 10 logs from the last WINDOW_SIZE logs):
 *   - severityRates      : expected proportion of each severity
 *   - severityBigrams    : transition frequencies  (e.g. info→error = 4%)
 *   - interArrivalMean   : average ms between consecutive logs
 *   - interArrivalStddev : stddev of inter-arrival times
 *   - sourceDist         : source frequency distribution
 *
 * Anomaly score (0–1) composed of three independent signals:
 *   1. Severity frequency anomaly : recent rate > 2× baseline rate    → +0.4
 *   2. Sequence (bigram) anomaly  : transition frequency < 2%          → +0.3
 *   3. Burst anomaly              : inter-arrival < 30% of baseline mean → +0.3
 *
 * Fingerprint: SHA-256 of "severity:source:rounded_score" — same failure
 * mode produces the same fingerprint across incidents.
 */

const crypto = require('crypto');
const { ANOMALY_WINDOW_SIZE, SEVERITY_WEIGHTS } = require('../config/constants');
const logger = require('../config/logger');

const ANOMALY_THRESHOLD           = 0.55;
const BIGRAM_RARE_THRESHOLD       = 0.02;
const BURST_FRACTION              = 0.30;
const SEVERITY_FREQ_SPIKE_FACTOR  = 2.0;

class AnomalyDetector {
  constructor() {
    this.window       = [];   // lightweight { severity, source, timestamp }
    this.baseline     = null;
    this.logCount     = 0;
    this.fingerprints = new Map(); // hash → { hash, firstSeen, lastSeen, count, severity, source }
  }

  // ─── Baseline ──────────────────────────────────────────────────────────────

  /**
   * Compute the full baseline rhythm from the current window.
   * Called every 10 logs (cheap — O(WINDOW_SIZE)).
   */
  updateBaseline() {
    const n = this.window.length;
    if (n < 20) return;

    // Severity distribution
    const severityCounts = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
    this.window.forEach(l => severityCounts[l.severity] = (severityCounts[l.severity] || 0) + 1);
    const severityRates = {};
    for (const [sev, cnt] of Object.entries(severityCounts)) {
      severityRates[sev] = cnt / n;
    }

    // Severity bigrams
    const bigramCounts = {};
    for (let i = 1; i < n; i++) {
      const key = `${this.window[i - 1].severity}→${this.window[i].severity}`;
      bigramCounts[key] = (bigramCounts[key] || 0) + 1;
    }
    const bigramTotal   = n - 1;
    const severityBigrams = {};
    for (const [key, cnt] of Object.entries(bigramCounts)) {
      severityBigrams[key] = cnt / bigramTotal;
    }

    // Inter-arrival statistics
    const intervals = [];
    for (let i = 1; i < n; i++) {
      const delta = new Date(this.window[i].timestamp) - new Date(this.window[i - 1].timestamp);
      if (delta >= 0) intervals.push(delta);
    }
    const interArrivalMean = intervals.length
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 2000;
    const variance = intervals.length > 1
      ? intervals.reduce((acc, d) => acc + (d - interArrivalMean) ** 2, 0) / intervals.length
      : 0;
    const interArrivalStddev = Math.sqrt(variance);

    // Source distribution
    const sourceCounts = {};
    this.window.forEach(l => sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1);
    const sourceDist = {};
    for (const [src, cnt] of Object.entries(sourceCounts)) {
      sourceDist[src] = cnt / n;
    }

    this.baseline = { severityRates, severityBigrams, interArrivalMean, interArrivalStddev, sourceDist };
  }

  // ─── Per-signal scorers ────────────────────────────────────────────────────

  /** Signal 1: is this severity appearing at > 2× its baseline rate? */
  severityFrequencyAnomaly(newSeverity) {
    if (!this.baseline) return 0;
    const expectedRate = this.baseline.severityRates[newSeverity] ?? 0;
    if (expectedRate === 0) return 0; // never seen before — skip (cold start)

    // Look at last 20 logs for the recent rate
    const recent = this.window.slice(-20);
    const recentRate = recent.filter(l => l.severity === newSeverity).length / recent.length;

    return recentRate > expectedRate * SEVERITY_FREQ_SPIKE_FACTOR ? 0.40 : 0;
  }

  /** Signal 2: is the severity transition (bigram) unusually rare? */
  bigramSequenceAnomaly(newSeverity) {
    if (!this.baseline || this.window.length === 0) return 0;
    const prevSeverity = this.window[this.window.length - 1]?.severity;
    if (!prevSeverity) return 0;

    const key      = `${prevSeverity}→${newSeverity}`;
    const bigramFreq = this.baseline.severityBigrams[key] ?? 0;
    return bigramFreq < BIGRAM_RARE_THRESHOLD ? 0.30 : 0;
  }

  /** Signal 3: are logs bursting in faster than baseline? */
  burstAnomaly() {
    if (!this.baseline || this.baseline.interArrivalMean <= 0) return 0;
    const recent = this.window.slice(-5);
    if (recent.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(new Date(recent[i].timestamp) - new Date(recent[i - 1].timestamp));
    }
    const recentMean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return recentMean < this.baseline.interArrivalMean * BURST_FRACTION ? 0.30 : 0;
  }

  // ─── Fingerprint ──────────────────────────────────────────────────────────

  /**
   * Generate a deterministic fingerprint for the current anomaly pattern.
   * Same failure mode (same severity, same source, same score bucket)
   * produces the same fingerprint — enabling deduplication across incidents.
   */
  generateFingerprint(log, score) {
    const scoreBucket = Math.round(score * 10); // 0–10
    const pattern     = `${log.severity}:${log.source}:${scoreBucket}`;
    return crypto.createHash('sha256').update(pattern).digest('hex').slice(0, 64);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Analyse a log entry and return anomaly metadata.
   * @returns {{ isAnomaly: boolean, anomalyScore: number, fingerprintHash: string }}
   */
  analyze(log) {
    this.window.push({ severity: log.severity, source: log.source, timestamp: log.timestamp });
    if (this.window.length > ANOMALY_WINDOW_SIZE) this.window.shift();
    this.logCount++;

    if (this.logCount % 10 === 0) this.updateBaseline();

    const freqScore       = this.severityFrequencyAnomaly(log.severity);
    const bigramScore     = this.bigramSequenceAnomaly(log.severity);
    const burstScore      = this.burstAnomaly();
    const anomalyScore    = Math.min(freqScore + bigramScore + burstScore, 1.0);
    const isAnomaly       = anomalyScore >= ANOMALY_THRESHOLD;
    const fingerprintHash = this.generateFingerprint(log, anomalyScore);

    if (isAnomaly) {
      logger.debug('Temporal anomaly detected', {
        logId: log.id?.slice(0, 8), severity: log.severity,
        score: anomalyScore.toFixed(3),
        signals: { freq: freqScore, bigram: bigramScore, burst: burstScore },
        fingerprint: fingerprintHash.slice(0, 16)
      });
      // Track fingerprint occurrences
      const existing = this.fingerprints.get(fingerprintHash);
      if (existing) {
        existing.count++;
        existing.lastSeen = log.timestamp || new Date().toISOString();
        existing.lastSeverity = log.severity;
      } else {
        this.fingerprints.set(fingerprintHash, {
          hash: fingerprintHash,
          firstSeen: log.timestamp || new Date().toISOString(),
          lastSeen: log.timestamp || new Date().toISOString(),
          count: 1,
          severity: log.severity,
          source: log.source,
          avgScore: anomalyScore
        });
      }
    }

    return { isAnomaly, anomalyScore: parseFloat(anomalyScore.toFixed(4)), fingerprintHash };
  }

  getFingerprints() {
    return [...this.fingerprints.values()].sort((a, b) => b.count - a.count);
  }

  _reset() {
    this.window   = [];
    this.baseline = null;
    this.logCount = 0;
    this.fingerprints.clear();
  }
}

const detector = new AnomalyDetector();

module.exports = {
  analyze:         (log) => detector.analyze(log),
  getFingerprints: ()    => detector.getFingerprints(),
  _reset:          ()    => detector._reset()
};
