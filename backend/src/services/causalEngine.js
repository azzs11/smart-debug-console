/**
 * Causal Log Intelligence Engine
 *
 * Builds a real-time causal graph of log events. For each incoming log it
 * finds the most likely parent event within the causal window, computes a
 * blast-radius score for the chain, and maintains an in-memory graph that
 * can be queried for root-cause chains and graph visualisation.
 *
 * Scoring dimensions (each 0–1, weighted):
 *   - Time proximity  : 35% — closer events are more likely causal
 *   - Severity weight : 30% — high-severity parents propagate to lower-severity children
 *   - Source relation : 20% — known service-dependency graph increases score
 *   - Message overlap : 15% — Jaccard similarity of log message keywords
 */

const { SEVERITY_WEIGHTS, CAUSAL_WINDOW_MS, CAUSAL_MAX_CHAIN_DEPTH, BLAST_RADIUS_DECAY } = require('../config/constants');
const logger = require('../config/logger');

// In-memory ring buffer of the last 200 logs — fast window for causal lookups
const RING_SIZE = 200;
const CAUSALITY_THRESHOLD = 0.42;
let recentLogs = [];

// Directed service dependency graph: key depends on value[]
const SERVICE_DEPS = {
  'api':             ['database', 'cache', 'auth'],
  'api-gateway':     ['database', 'cache', 'auth'],
  'auth':            ['database', 'cache'],
  'auth-service':    ['database', 'cache'],
  'cache-service':   ['database'],
  'payment':         ['api', 'auth', 'database'],
  'payment-service': ['api', 'auth', 'database'],
  'notification':    ['api', 'database'],
  'integration':     ['api', 'database'],
  'storage-service': ['database'],
  'session-manager': ['database', 'cache']
};

function sourceRelationScore(parentSrc, childSrc) {
  if (parentSrc === childSrc) return 1.0;
  const deps = SERVICE_DEPS[childSrc] || [];
  if (deps.some(d => parentSrc === d || parentSrc.startsWith(d) || d.startsWith(parentSrc))) return 0.75;
  const parentDeps = SERVICE_DEPS[parentSrc] || [];
  if (parentDeps.some(d => childSrc === d || childSrc.startsWith(d) || d.startsWith(childSrc))) return 0.35;
  return 0.1;
}

function extractKeywords(msg) {
  const stop = new Set(['the','a','an','in','at','for','to','of','is','was','are','were','has','have','had','not','this','from']);
  return msg.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w));
}

function jaccardScore(msgA, msgB) {
  const setA = new Set(extractKeywords(msgA));
  const setB = new Set(extractKeywords(msgB));
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter(k => setB.has(k)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function causalityScore(candidate, newLog) {
  const delta = new Date(newLog.timestamp) - new Date(candidate.timestamp);
  if (delta <= 0 || delta > CAUSAL_WINDOW_MS) return 0;

  const timeScore     = 1 - delta / CAUSAL_WINDOW_MS;
  const pW            = SEVERITY_WEIGHTS[candidate.severity] ?? 1;
  const cW            = SEVERITY_WEIGHTS[newLog.severity]   ?? 1;
  const severityScore = pW >= cW ? 1 : 0.25;
  const srcScore      = sourceRelationScore(candidate.source, newLog.source);
  const msgScore      = jaccardScore(candidate.message, newLog.message);

  return (timeScore * 0.35) + (severityScore * 0.30) + (srcScore * 0.20) + (msgScore * 0.15);
}

function findBestParent(newLog) {
  let bestParent = null;
  let bestScore  = CAUSALITY_THRESHOLD;

  for (const candidate of recentLogs) {
    if (candidate.id === newLog.id) continue;
    const score = causalityScore(candidate, newLog);
    if (score > bestScore) { bestScore = score; bestParent = candidate; }
  }
  return bestParent ? { parent: bestParent, score: bestScore } : null;
}

/**
 * Analyse an incoming log for causal relationships.
 * Returns causal metadata to be attached to the log record.
 */
function analyzeLog(newLog) {
  const result = {
    causal_parent_id:   null,
    causal_root_id:     null,
    causal_chain_depth: 0,
    blast_radius_score: 0
  };

  const match = findBestParent(newLog);

  if (match) {
    const { parent } = match;
    const parentDepth  = parent.causal_chain_depth ?? 0;
    const parentRootId = parent.causal_root_id ?? parent.id;

    result.causal_parent_id   = parent.id;
    result.causal_root_id     = parentRootId;
    result.causal_chain_depth = Math.min(parentDepth + 1, CAUSAL_MAX_CHAIN_DEPTH);
    result.blast_radius_score = parseFloat(
      ((SEVERITY_WEIGHTS[newLog.severity] ?? 1) * Math.pow(BLAST_RADIUS_DECAY, result.causal_chain_depth)).toFixed(3)
    );

    logger.debug('Causal link established', {
      log: newLog.id?.slice(0, 8),
      parent: parent.id?.slice(0, 8),
      depth: result.causal_chain_depth,
      root: result.causal_root_id?.slice(0, 8),
      score: match.score.toFixed(2)
    });
  }

  // Store enriched copy in ring buffer
  recentLogs.push({ ...newLog, ...result });
  if (recentLogs.length > RING_SIZE) recentLogs.shift();

  return result;
}

/** Return all active causal chains, sorted by blast radius descending */
function getActiveCausalChains() {
  const chains = new Map();

  for (const log of recentLogs) {
    const rootId = log.causal_root_id;
    if (!rootId) continue;

    if (!chains.has(rootId)) chains.set(rootId, { logs: [], maxDepth: 0, blastRadius: 0 });
    const chain = chains.get(rootId);
    chain.logs.push(log);
    chain.maxDepth    = Math.max(chain.maxDepth, log.causal_chain_depth ?? 0);
    chain.blastRadius += log.blast_radius_score ?? 0;
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
      affected_preview:    data.logs.slice(0, 5).map(l => ({ id: l.id, message: l.message, severity: l.severity }))
    });
  }

  return result.sort((a, b) => b.blast_radius_score - a.blast_radius_score);
}

/** Get every log in a chain by root ID */
function getChainById(rootId) {
  return recentLogs
    .filter(l => l.id === rootId || l.causal_root_id === rootId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/** Graph-friendly nodes + edges for visualisation */
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

module.exports = { analyzeLog, getActiveCausalChains, getChainById, getGraphData };
