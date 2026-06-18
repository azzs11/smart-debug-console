const { getPool, isPgAvailable } = require('./client');
const { MAX_LOGS_IN_MEMORY, DEFAULT_LOG_LIMIT } = require('../config/constants');

let memLogs = [];

const insertLog = async (log) => {
  if (!isPgAvailable()) {
    memLogs.push(log);
    if (memLogs.length > MAX_LOGS_IN_MEMORY) memLogs = memLogs.slice(-MAX_LOGS_IN_MEMORY);
    return log;
  }

  const pool = getPool();
  const causal = log.causal || {};
  const { rows } = await pool.query(
    `INSERT INTO logs (
      id, message, severity, source, timestamp,
      ml_predicted_severity, ml_confidence, ml_severity_match, ml_probabilities,
      causal_parent_id, causal_root_id, causal_chain_depth, blast_radius_score,
      fingerprint_hash, is_anomaly, anomaly_score
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (id) DO NOTHING
    RETURNING *`,
    [
      log.id, log.message, log.severity, log.source, log.timestamp,
      log.ml?.predicted_severity ?? null,
      log.ml?.confidence ?? null,
      log.ml?.severity_match ?? null,
      log.ml?.probabilities ? JSON.stringify(log.ml.probabilities) : null,
      causal.causal_parent_id ?? null,
      causal.causal_root_id ?? null,
      causal.causal_chain_depth ?? 0,
      causal.blast_radius_score ?? 0,
      log.fingerprint_hash ?? null,
      log.is_anomaly ?? false,
      log.anomaly_score ?? 0
    ]
  );
  return rows[0] || log;
};

const getLogs = async ({ limit = DEFAULT_LOG_LIMIT, offset = 0, severity, source, search, onlyAnomalies } = {}) => {
  if (!isPgAvailable()) {
    let result = [...memLogs];
    if (severity) result = result.filter(l => l.severity === severity);
    if (source) result = result.filter(l => l.source === source);
    if (search) result = result.filter(l => l.message.toLowerCase().includes(search.toLowerCase()));
    if (onlyAnomalies) result = result.filter(l => l.is_anomaly);
    return result.slice(-limit);
  }

  const pool = getPool();
  let whereClauses = ['1=1'];
  const params = [];

  if (severity) { params.push(severity); whereClauses.push(`severity = $${params.length}`); }
  if (source) { params.push(source); whereClauses.push(`source = $${params.length}`); }
  if (search) { params.push(`%${search}%`); whereClauses.push(`message ILIKE $${params.length}`); }
  if (onlyAnomalies) whereClauses.push('is_anomaly = TRUE');

  params.push(limit, offset);
  const query = `
    SELECT * FROM logs
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await pool.query(query, params);
  return rows.reverse();
};

const getLogById = async (id) => {
  if (!isPgAvailable()) return memLogs.find(l => l.id === id) ?? null;
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM logs WHERE id = $1', [id]);
  return rows[0] ?? null;
};

const updateLogCausalData = async (id, { causalParentId, causalRootId, chainDepth, blastRadiusScore }) => {
  if (!isPgAvailable()) {
    const log = memLogs.find(l => l.id === id);
    if (log) {
      log.causal_parent_id = causalParentId;
      log.causal_root_id = causalRootId;
      log.causal_chain_depth = chainDepth;
      log.blast_radius_score = blastRadiusScore;
    }
    return;
  }
  const pool = getPool();
  await pool.query(
    `UPDATE logs SET causal_parent_id=$2, causal_root_id=$3, causal_chain_depth=$4, blast_radius_score=$5 WHERE id=$1`,
    [id, causalParentId, causalRootId, chainDepth, blastRadiusScore]
  );
};

const getStats = async () => {
  if (!isPgAvailable()) {
    const bySeverity = { critical: 0, error: 0, warning: 0, info: 0, debug: 0 };
    memLogs.forEach(l => { if (bySeverity[l.severity] !== undefined) bySeverity[l.severity]++; });
    return {
      total: memLogs.length,
      bySeverity,
      anomalyCount: memLogs.filter(l => l.is_anomaly).length,
      causalChainCount: new Set(memLogs.map(l => l.causal_root_id).filter(Boolean)).size
    };
  }

  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END)::int AS critical,
      SUM(CASE WHEN severity='error'    THEN 1 ELSE 0 END)::int AS error,
      SUM(CASE WHEN severity='warning'  THEN 1 ELSE 0 END)::int AS warning,
      SUM(CASE WHEN severity='info'     THEN 1 ELSE 0 END)::int AS info,
      SUM(CASE WHEN severity='debug'    THEN 1 ELSE 0 END)::int AS debug,
      SUM(CASE WHEN is_anomaly          THEN 1 ELSE 0 END)::int AS anomaly_count,
      COUNT(DISTINCT causal_root_id) FILTER (WHERE causal_root_id IS NOT NULL)::int AS causal_chain_count
    FROM logs
  `);
  const r = rows[0];
  return {
    total: r.total,
    bySeverity: { critical: r.critical, error: r.error, warning: r.warning, info: r.info, debug: r.debug },
    anomalyCount: r.anomaly_count,
    causalChainCount: r.causal_chain_count
  };
};

const getCausalChain = async (rootLogId) => {
  if (!isPgAvailable()) {
    return memLogs
      .filter(l => l.id === rootLogId || l.causal_root_id === rootLogId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM logs WHERE id=$1 OR causal_root_id=$1 ORDER BY timestamp ASC`,
    [rootLogId]
  );
  return rows;
};

const insertCausalChain = async (chainData) => {
  if (!isPgAvailable()) return null;
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO causal_chains (root_log_id, chain_depth, total_affected_logs, blast_radius_score, chain_summary)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [chainData.rootLogId, chainData.chainDepth, chainData.totalAffectedLogs, chainData.blastRadiusScore, chainData.chainSummary]
  );
  return rows[0];
};

const getRecentAnomalies = async (limit = 20) => {
  if (!isPgAvailable()) {
    return [...memLogs].filter(l => l.is_anomaly).slice(-limit).reverse();
  }
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM logs WHERE is_anomaly=TRUE ORDER BY timestamp DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

const getMemLogs = () => memLogs;

module.exports = {
  insertLog, getLogs, getLogById, updateLogCausalData,
  getStats, getCausalChain, insertCausalChain, getRecentAnomalies,
  getMemLogs
};
