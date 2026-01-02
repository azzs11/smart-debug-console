// backend/test-ml.js
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testMLIntegration() {
  console.log('🧪 Testing ML Integration...\n');

  try {
    // Test 1: Create a critical log
    console.log('1️⃣ Creating a CRITICAL log...');
    const criticalLog = await axios.post(`${API_URL}/api/logs`, {
      message: 'System crash detected in auth module',
      severity: 'critical',
      source: 'auth'
    });
    console.log('✅ Response:', JSON.stringify(criticalLog.data, null, 2));
    console.log('\n');

    // Test 2: Create an error log
    console.log('2️⃣ Creating an ERROR log...');
    const errorLog = await axios.post(`${API_URL}/api/logs`, {
      message: 'Failed to connect to PostgreSQL database',
      severity: 'error',
      source: 'database'
    });
    console.log('✅ Response:', JSON.stringify(errorLog.data, null, 2));
    console.log('\n');

    // Test 3: Create a warning log
    console.log('3️⃣ Creating a WARNING log...');
    const warningLog = await axios.post(`${API_URL}/api/logs`, {
      message: 'High memory usage detected: 87%',
      severity: 'warning',
      source: 'api'
    });
    console.log('✅ Response:', JSON.stringify(warningLog.data, null, 2));
    console.log('\n');

    // Test 4: Create an info log
    console.log('4️⃣ Creating an INFO log...');
    const infoLog = await axios.post(`${API_URL}/api/logs`, {
      message: 'User logged in successfully',
      severity: 'info',
      source: 'auth'
    });
    console.log('✅ Response:', JSON.stringify(infoLog.data, null, 2));
    console.log('\n');

    // Test 5: Get ML info
    console.log('5️⃣ Getting ML model info...');
    const mlInfo = await axios.get(`${API_URL}/api/logs/ml/info`);
    console.log('✅ ML Info:', JSON.stringify(mlInfo.data, null, 2));
    console.log('\n');

    // Test 6: Get stats with ML accuracy
    console.log('6️⃣ Getting statistics with ML accuracy...');
    const stats = await axios.get(`${API_URL}/api/logs/stats`);
    console.log('✅ Stats:', JSON.stringify(stats.data, null, 2));
    console.log('\n');

    // Test 7: Get logs with ML enrichment
    console.log('7️⃣ Getting logs with ML enrichment...');
    const logs = await axios.get(`${API_URL}/api/logs?ml=true&limit=10`);
    console.log('✅ Logs Count:', logs.data.count);
    console.log('✅ ML Enabled:', logs.data.ml_enabled);
    if (logs.data.data.length > 0) {
      console.log('✅ Sample Log:', JSON.stringify(logs.data.data[0], null, 2));
    }
    console.log('\n');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testMLIntegration();