const logger = require('../config/logger');

/**
 * Admin API key guard.
 *
 * Checks the X-API-Key request header against the ADMIN_API_KEY env var.
 * Applied to mutating admin routes (generator start/stop, model retrain).
 *
 * If ADMIN_API_KEY is not set in the environment the server refuses to serve
 * these routes entirely — fail-closed is safer than fail-open.
 */
function requireApiKey(req, res, next) {
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    logger.warn('Admin route accessed but ADMIN_API_KEY is not configured');
    return res.status(503).json({
      status: 'error',
      message: 'Admin API key not configured on this server'
    });
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    return res.status(401).json({
      status: 'error',
      message: 'Missing X-API-Key header'
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(providedKey, expectedKey)) {
    logger.warn('Invalid admin API key attempt', {
      ip:     req.ip,
      path:   req.path,
      method: req.method
    });
    return res.status(403).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }

  next();
}

/** Constant-time string comparison (pure JS — no crypto needed for this length) */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

module.exports = { requireApiKey };
