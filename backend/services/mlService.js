// backend/services/mlService.js
const axios = require('axios');

class MLService {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.isConnected = false;
    this.retryAttempts = 3;
    this.retryDelay = 2000;
  }

  /**
   * Initialize connection to ML service
   */
  async initialize() {
    console.log('🤖 Initializing ML Service connection...');
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.baseURL}/health`, {
          timeout: 5000
        });
        
        if (response.data.status === 'success' && response.data.model_loaded) {
          this.isConnected = true;
          console.log('✅ ML Service connected and model loaded');
          return true;
        } else {
          console.log('⚠️ ML Service connected but model not loaded');
          return false;
        }
      } catch (error) {
        console.log(`⚠️ ML Service connection attempt ${attempt}/${this.retryAttempts} failed`);
        
        if (attempt < this.retryAttempts) {
          console.log(`   Retrying in ${this.retryDelay/1000}s...`);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    console.log('❌ ML Service not available - continuing without ML classification');
    this.isConnected = false;
    return false;
  }

  /**
   * Classify a single log message
   */
  async classifyLog(message) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/classify`,
        { message },
        { timeout: 3000 }
      );

      if (response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('ML classification error:', error.message);
      return null;
    }
  }

  /**
   * Classify multiple log messages in batch
   */
  async classifyBatch(messages) {
    if (!this.isConnected || !messages || messages.length === 0) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/classify/batch`,
        { messages },
        { timeout: 5000 }
      );

      if (response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Batch ML classification error:', error.message);
      return null;
    }
  }

  /**
   * Get ML model information
   */
  async getModelInfo() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/api/model/info`,
        { timeout: 3000 }
      );

      if (response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Get model info error:', error.message);
      return null;
    }
  }

  /**
   * Check if ML service is available
   */
  isAvailable() {
    return this.isConnected;
  }

  /**
   * Sleep utility for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const mlService = new MLService();
module.exports = mlService;