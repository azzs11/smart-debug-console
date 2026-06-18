const { body, query, validationResult } = require('express-validator');
const { VALID_SEVERITIES, MAX_LOG_LIMIT } = require('../config/constants');

// ── Shared error formatter ────────────────────────────────────────────────────

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

// ── Log body validation ───────────────────────────────────────────────────────

const validateLog = [
  body('message')
    .isString().withMessage('message must be a string')
    .trim()
    .notEmpty().withMessage('message is required')
    .isLength({ max: 2000 }).withMessage('message must not exceed 2000 characters'),

  body('severity')
    .optional()
    .isString().withMessage('severity must be a string')
    .customSanitizer(v => v?.toLowerCase())
    .isIn(VALID_SEVERITIES).withMessage(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`),

  body('source')
    .optional()
    .isString().withMessage('source must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('source must not exceed 100 characters'),

  handleValidationErrors
];

// ── Query-param limit validation ─────────────────────────────────────────────

const validateQueryLimit = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_LOG_LIMIT })
    .withMessage(`limit must be an integer between 1 and ${MAX_LOG_LIMIT}`),

  handleValidationErrors
];

// ── Generator interval validation ────────────────────────────────────────────

const validateGeneratorStart = [
  body('interval')
    .optional()
    .isInt({ min: 200, max: 60000 })
    .withMessage('interval must be between 200 and 60000 milliseconds'),

  handleValidationErrors
];

module.exports = { validateLog, validateQueryLimit, validateGeneratorStart, handleValidationErrors };
