const { VALID_SEVERITIES, MAX_LOG_LIMIT } = require('../config/constants');

function validateLog(req, res, next) {
  const { message, severity } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: 'message is required and must be a non-empty string' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ status: 'error', message: 'message must not exceed 2000 characters' });
  }
  if (severity && !VALID_SEVERITIES.includes(severity.toLowerCase())) {
    return res.status(400).json({ status: 'error', message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  req.body.message = message.trim();
  if (req.body.severity) req.body.severity = req.body.severity.toLowerCase();
  next();
}

function validateQueryLimit(req, res, next) {
  const limit = parseInt(req.query.limit);
  if (req.query.limit !== undefined && (isNaN(limit) || limit < 1 || limit > MAX_LOG_LIMIT)) {
    return res.status(400).json({ status: 'error', message: `limit must be between 1 and ${MAX_LOG_LIMIT}` });
  }
  next();
}

module.exports = { validateLog, validateQueryLimit };
