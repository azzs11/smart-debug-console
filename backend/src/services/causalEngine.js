/**
 * Causal Log Intelligence Engine
 *
 * For every incoming log, finds the most likely causal parent within a 30-second
 * sliding window using a multi-rule scoring model:
 *
 *   Rule A (40%) — temporal proximity with non-linear decay:
 *                  ≤5s → 1.0 | ≤10s → 0.8 | ≤20s → 0.5 | ≤30s → 0.2
 *   Rule B (30%) — severity escalation: higher/equal severity children score 0.3/0.15
 *   Rule C (30%) — entity overlap: Jaccard over extracted services, IPs, ports, paths, error codes
 *   Bonus  (+0.2) — same source (strong signal)
 *   Bonus  (+0.2) — ERROR/CRITICAL child follows WARNING from same/dependent source
 *
 * Blast radius formula (top-down cumulative):
 *   BR(node) = severity_weight(node) + BLAST_RADIUS_DECAY × BR(parent)
 *
 * When chain depth reaches 3, a `causal-chain-detected` socket event is emitted.
 */

const {
  SEVERITY_WEIGHTS,
  CAUSAL_WINDOW_MS,
  CAUSAL_MAX_CHAIN_DEPTH,
  BLAST_RADIUS_DECAY
} = require('../config/constants');
const logger = require('../config/logger');

// In-memory ring buffer (last 200 logs) — never hits the database for causal lookups
const RING_SIZE = 200;
const CAUSALITY_THRESHOLD = 0.30;
const CHAIN_ALERT_DEPTH   = 3;

let recentLogs = [];
let _onChainDetected = () => {};

/** Register callback for chain-detected events (called from server.js) */
function onChainDetected(cb) { _onChainDetected = cb; }

// ─── Directed service dependency graph ───────────────────────────────────────
const SERVICE_DEPS = {
  'api':             ['database', 'redis', 'cache', 'auth'],
  'api-gateway':     ['database', 'redis', 'cache', 'auth'],
  'auth':            ['database', 'redis', 'cache'],
  'auth-service':    ['database', 'redis', 'cache'],
  'cache':           ['database'],
  'cache-service':   ['database', 'redis'],
  'payment':         ['api', 'auth', 'database'],
  'payment-service': ['api', 'auth', 'database'],
  'notification':    ['api', 'database'],
  'integration':     ['api', 'database'],
  'storage-service': ['database'],
  'session-manager': ['database', 'redis', 'cache'],
  'queue':           ['database', 'redis']
};

function sourceRelationScore(parentSrc, childSrc) {
  if (parentSrc === childSrc) return 1.0;
  // child depends on parent
  const childDeps = SERVICE_DEPS[childSrc] || [];
  if (childDeps.some(d => parentSrc === d || parentSrc.startsWith(d) || d.startsWith(parentSrc))) return 0.75;
  // parent depends on child (reverse — still weakly correlated in cascading failures)
  const parentDeps = SERVICE_DEPS[parentSrc] || [];
  if (parentDeps.some(d => childSrc === d || childSrc.startsWith(d) || d.startsWith(childSrc))) return 0.30;
  return 0.08;
}

// ─── Entity extraction ────────────────────────────────────────────────────────

/**
 * Extract named resources from a log message.
 * These are used for entity-overlap scoring — shared resources imply causal relationship.
 */
function extractEntities(message) {
  const m = message || '';
  return {
    services:   (m.match(/\b(database|redis|postgres|mongodb|mysql|api|auth|cache|payment|queue|elasticsearch|kafka|rabbitmq)\b/gi) || []).map(s => s.toLowerCase()),
    ips:        m.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)              || [],
    ports:      (m.match(/(?:port\s*:?\s*|:)(\d{2,5})/gi) || []).map(p => p.replace(/\D/g, '')),
    paths:      m.match(/\/[a-zA-Z0-9/_-]{2,}/g)                                  || [],
    errorCodes: m.match(/\b[45]\d{2}\b/g)                                         || []
  };
}

function entitySets(entities) {
  return [
    ...entities.services,
    ...entities.ips,
    ...entities.ports,
    ...entities.paths,
    ...entities.errorCodes
  ];
}

function computeEntityOverlap(entA, entB) {
  const setA = new Set(entitySets(entA));
  const setB = new Set(entitySets(entB));
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter(e => setB.has(e)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Temporal proximity ───────────────────────────────────────────────────────

/**
 * Non-linear temporal proximity score.
 * ≤5s  → 1.0
 * ≤10s → 0.8   (linear interpolation within each band)
 * ≤20s → 0.5
 * ≤30s → 0.2
 */
function temporalProximityScore(ageSec) {
  if (ageSec <= 0)  return 0;
  if (ageSec <= 5)  return 1.0;
  if (ageSec <= 10) return 0.8 + (1.0 - 0.8) * (10 - ageSec) / 5;
  if (ageSec <= 20) return 0.5 + (0.8 - 0.5) * (20 - ageSec) / 10;
  if (ageSec <= 30) return 0.2 + (0.5 - 0.2) * (30 - ageSec) / 10;
  return 0;
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

function computeCausalScore(parent, child) {
  const parentTime = new Date(parent.timestamp).getTime();
  const childTime  = new Date(child.timestamp).getTime();
  if (parentTime >= childTime) return 0;

  const ageSec = (childTime - parentTime) / 1000;
  if (ageSec > 30) return 0;

  // Rule A: temporal proximity (40%)
  const timeScore = temporalProximityScore(ageSec);
  let score = timeScore * 0.4;

  // Rule B: severity relationship (30%)
  const pW = SEVERITY_WEIGHTS[parent.severity] ?? 0;
  const cW = SEVERITY_WEIGHTS[child.severity]  ?? 0;
  if (cW > pW)      score += 0.30; // escalation — strongest signal
  else if (cW === pW) score += 0.15; // propagation at same level

  // Rule C: entity overlap (30%)
  const overlap = computeEntityOverlap(
    extractEntities(parent.message),
    extractEntities(child.message)
  );
  score += overlap * 0.30;

  // Bonus: same source (cascading within same service)
  if (parent.source === child.source) score += 0.20;

  // Bonus: ERROR/CRITICAL follows WARNING from same/dependent source
  if (cW >= SEVERITY_WEIGHTS.error && pW === SEVERITY_WEIGHTS.warning) {
    const srcScore = sourceRelationScore(parent.source, child.source);
    if (srcScore >= 0.50) score += 0.20;
  }

  return Math.min(score, 1.0);
}

function findBestParent(newLog) {
  const cutoffMs = new Date(newLog.timestamp).getTime() - CAUSAL_WINDOW_MS;
  let bestParent = null;
  let bestScore  = CAUSALITY_THRESHOLD;

  for (const candidate of recentLogs) {
    if (candidate.id === newLog.id) continue;
    if (new Date(candidate.timestamp).getTime() < cutoffMs) continue;
    const score = computeCausalScore(candidate, newLog);
    if (score > bestScore) { bestScore = score; bestParent = candidate; }
  }
  return bestParent ? { parent: bestParent, score: bestScore } : null;
}

/**
 * Blast radius (top-down cumulative):
 *   BR(node) = severity_weight(node) + BLAST_RADIUS_DECAY × BR(parent)
 *
 * Root nodes: BR = severity_weight only.
 * Each child accumulates the decayed impact of its ancestors.
 */
function computeBlastRadius(log, parent) {
  const weight = SEVERITY_WEIGHTS[log.severity] ?? 1;
  if (!parent) return weight;
  return parseFloat((weight + BLAST_RADIUS_DECAY * (parent.blast_radius_score ?? 0)).toFixed(3));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse an incoming log for causal relationships.
 * Returns causal metadata to be merged into the log record.
 */
function analyzeLog(newLog) {
  const match = findBestParent(newLog);
  const parent = match?.parent ?? null;

  const result = {
    causal_parent_id:   parent?.id ?? null,
    causal_root_id:     parent ? (parent.causal_root_id ?? parent.id) : null,
    causal_chain_depth: parent ? Math.min((parent.causal_chain_depth ?? 0) + 1, CAUSAL_MAX_CHAIN_DEPTH) : 0,
    blast_radius_score: computeBlastRadius(newLog, parent)
  };

  if (parent) {
    logger.debug('Causal link established', {
      log:    newLog.id?.slice(0, 8),
      parent: parent.id?.slice(0, 8),
      depth:  result.causal_chain_depth,
      root:   result.causal_root_id?.slice(0, 8),
      score:  match.score.toFixed(2)
    });
  }

  // Push enriched entry into ring buffer
  recentLogs.push({ ...newLog, ...result });
  if (recentLogs.length > RING_SIZE) recentLogs.shift();

  // Emit chain-detected event when depth threshold is crossed
  if (result.causal_chain_depth >= CHAIN_ALERT_DEPTH && result.causal_root_id) {
    const chain = getChainById(result.causal_root_id);
    const totalBR = parseFloat(chain.reduce((s, l) => s + (l.blast_radius_score ?? 0), 0).toFixed(3));
    _onChainDetected({
      type:               'causal-chain-detected',
      root_id:            result.causal_root_id,
      triggering_log_id:  newLog.id,
      chain_depth:        result.causal_chain_depth,
      total_affected:     chain.length,
      blast_radius_score: totalBR,
      chain_preview:      chain.slice(0, 6).map(l => ({ id: l.id, severity: l.severity, message: l.message.slice(0, 60), source: l.source }))
    });
  }

  return result;
}

/** All active causal chains sorted by blast radius descending */
function getActiveCausalChains() {
  const chains = new Map();

  for (const log of recentLogs) {
    const rootId = log.causal_root_id;
    if (!rootId) continue;
    if (!chains.has(rootId)) chains.set(rootId, { logs: [], maxDepth: 0, blastRadius: 0 });
    const c = chains.get(rootId);
    c.logs.push(log);
    c.maxDepth    = Math.max(c.maxDepth, log.causal_chain_depth ?? 0);
    c.blastRadius += log.blast_radius_score ?? 0;
  }

  const result = [];
  for (const [rootId, data] of chains) {
    const rootLog = recentLogs.find(l => l.id === rootId);
    if (!rootLog) continue;
    result.push({
      root_log_id:         rootId,
      root_message:        rootLog.message,
      root_severity:       rootLog.severity,
      root_source:         rootLog.source,
      root_timestamp:      rootLog.timestamp,
      chain_depth:         data.maxDepth,
      total_affected_logs: data.logs.length,
      blast_radius_score:  parseFloat(data.blastRadius.toFixed(3)),
      affected_preview:    data.logs.slice(0, 5).map(l => ({
        id: l.id, message: l.message, severity: l.severity, source: l.source, depth: l.causal_chain_depth
      }))
    });
  }

  return result.sort((a, b) => b.blast_radius_score - a.blast_radius_score);
}

/** All logs belonging to a causal chain, sorted by timestamp */
function getChainById(rootId) {
  return recentLogs
    .filter(l => l.id === rootId || l.causal_root_id === rootId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/** Graph-ready nodes + edges for front-end visualisation */
function getGraphData() {
  const nodes = new Map();
  const edges = [];

  for (const log of recentLogs) {
    if (!log.causal_root_id && !log.causal_parent_id) continue;

    if (!nodes.has(log.id)) {
      nodes.set(log.id, {
        id:          log.id,
        label:       log.message.slice(0, 45) + (log.message.length > 45 ? '…' : ''),
        severity:    log.severity,
        source:      log.source,
        depth:       log.causal_chain_depth ?? 0,
        isRoot:      log.id === log.causal_root_id,
        blastRadius: log.blast_radius_score ?? 0
      });
    }

    if (log.causal_parent_id) {
      const parent = recentLogs.find(l => l.id === log.causal_parent_id);
      if (parent && !nodes.has(parent.id)) {
        nodes.set(parent.id, {
          id: parent.id, label: parent.message.slice(0, 45), severity: parent.severity,
          source: parent.source, depth: parent.causal_chain_depth ?? 0,
          isRoot: parent.id === parent.causal_root_id, blastRadius: parent.blast_radius_score ?? 0
        });
      }
      edges.push({ from: log.causal_parent_id, to: log.id });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

function _reset() { recentLogs = []; }

module.exports = { analyzeLog, getActiveCausalChains, getChainById, getGraphData, onChainDetected, _reset };
