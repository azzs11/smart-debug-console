require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};