const axios = require('axios');
const { ML_TIMEOUT_MS, ML_RETRY_ATTEMPTS } = require('../config/constants');
const logger = require('../config/logger');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
let mlAvailable = false;

async function checkHealth() {
  try {
    const { data } = await axios.get(`${ML_URL}/health`, { timeout: 2000 });
    const wasAvailable = mlAvailable;
    mlAvailable = data.model_loaded === true;
    if (mlAvailable !== wasAvailable) {
      logger.info(`ML service ${mlAvailable ? 'came online' : 'went offline'}`);
    }
  } catch {
    mlAvailable = false;
  }
  return mlAvailable;
}

async function classify(message) {
  if (!mlAvailable) return null;

  for (let attempt = 0; attempt < ML_RETRY_ATTEMPTS; attempt++) {
    try {
      const { data } = await axios.post(
        `${ML_URL}/api/classify`,
        { message },
        { timeout: ML_TIMEOUT_MS }
      );
      if (data.status === 'success') return data.data;
    } catch (err) {
      logger.debug('ML classify attempt failed', { attempt: attempt + 1, error: err.message });
    }
  }
  return null;
}

async function classifyBatch(messages) {
  if (!mlAvailable || !messages?.length) return null;
  try {
    const { data } = await axios.post(
      `${ML_URL}/api/classify/batch`,
      { messages },
      { timeout: ML_TIMEOUT_MS * 2 }
    );
    if (data.status === 'success') return data.data;
  } catch (err) {
    logger.debug('ML batch classify failed', { error: err.message });
  }
  return null;
}

function isAvailable() { return mlAvailable; }

// Initial health check — deferred to avoid blocking module load
setImmediate(checkHealth);

module.exports = { classify, classifyBatch, checkHealth, isAvailable };
