// backend/utils/logEnricher.js
const mlService = require('../services/mlService');

class LogEnricher {
  /**
   * Enrich a single log with ML predictions
   */
  async enrichLog(log) {
    if (!mlService.isAvailable()) {
      return log;
    }

    try {
      const mlResult = await mlService.classifyLog(log.message);
      
      if (mlResult) {
        return {
          ...log,
          ml: {
            predicted_severity: mlResult.predicted_severity,
            confidence: mlResult.confidence,
            probabilities: mlResult.probabilities,
            severity_match: log.severity === mlResult.predicted_severity
          }
        };
      }
      
      return log;
    } catch (error) {
      console.error('Log enrichment error:', error.message);
      return log;
    }
  }

  /**
   * Enrich multiple logs with ML predictions
   */
  async enrichLogs(logs) {
    if (!mlService.isAvailable() || !logs || logs.length === 0) {
      return logs;
    }

    try {
      const messages = logs.map(log => log.message);
      const mlResults = await mlService.classifyBatch(messages);
      
      if (mlResults && mlResults.length === logs.length) {
        return logs.map((log, index) => ({
          ...log,
          ml: {
            predicted_severity: mlResults[index].predicted_severity,
            confidence: mlResults[index].confidence,
            probabilities: mlResults[index].probabilities,
            severity_match: log.severity === mlResults[index].predicted_severity
          }
        }));
      }
      
      return logs;
    } catch (error) {
      console.error('Batch log enrichment error:', error.message);
      return logs;
    }
  }

  /**
   * Calculate ML accuracy from enriched logs
   */
  calculateAccuracy(enrichedLogs) {
    if (!enrichedLogs || enrichedLogs.length === 0) {
      return 0;
    }

    const logsWithML = enrichedLogs.filter(log => log.ml);
    if (logsWithML.length === 0) {
      return 0;
    }

    const matches = logsWithML.filter(log => log.ml.severity_match).length;
    return (matches / logsWithML.length) * 100;
  }

  /**
   * Get ML statistics from enriched logs
   */
  getMLStats(enrichedLogs) {
    if (!enrichedLogs || enrichedLogs.length === 0) {
      return null;
    }

    const logsWithML = enrichedLogs.filter(log => log.ml);
    
    if (logsWithML.length === 0) {
      return null;
    }

    const matches = logsWithML.filter(log => log.ml.severity_match).length;
    const accuracy = (matches / logsWithML.length) * 100;
    
    const avgConfidence = logsWithML.reduce((sum, log) => 
      sum + log.ml.confidence, 0) / logsWithML.length;

    return {
      total_classified: logsWithML.length,
      correct_predictions: matches,
      accuracy: accuracy.toFixed(2),
      avg_confidence: (avgConfidence * 100).toFixed(2)
    };
  }
}

module.exports = new LogEnricher();