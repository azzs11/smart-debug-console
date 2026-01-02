// backend/test-load.js
const io = require('socket.io-client');

console.log('='.repeat(60));
console.log('🚀 LOAD TEST - Smart Debug Console');
console.log('='.repeat(60));

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: false
});

let logsGenerated = 0;
let startTime;
let logsReceived = 0;

// Track received logs
socket.on('new-log', (log) => {
  logsReceived++;
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('📊 Starting load test...\n');
  
  startTime = Date.now();
  
  // Send logs at specified interval
  const INTERVAL = 50; // milliseconds (50ms = 1,200 logs/min)
  const TEST_DURATION = 60000; // 1 minute
  
  console.log(`⚙️  Configuration:`);
  console.log(`   - Interval: ${INTERVAL}ms per log`);
  console.log(`   - Expected rate: ${Math.floor(60000 / INTERVAL)} logs/minute`);
  console.log(`   - Test duration: ${TEST_DURATION / 1000} seconds\n`);
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    
    // Send log
    socket.emit('send-log', {
      message: `Load test log #${logsGenerated} - Testing system capacity`,
      severity: ['info', 'warning', 'error'][logsGenerated % 3],
      source: 'load-test'
    });
    
    logsGenerated++;
    
    // Progress update every 10 seconds
    if (logsGenerated % 200 === 0) {
      const currentRate = Math.floor((logsGenerated / elapsed) * 60000);
      console.log(`📈 Progress: ${logsGenerated} logs sent | Current rate: ${currentRate}/min`);
    }
    
    // Stop after test duration
    if (elapsed >= TEST_DURATION) {
      clearInterval(interval);
      
      // Wait 2 seconds for final logs to arrive
      setTimeout(() => {
        const totalTime = (Date.now() - startTime) / 1000;
        const finalRate = Math.floor(logsGenerated / totalTime * 60);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ LOAD TEST COMPLETE');
        console.log('='.repeat(60));
        console.log(`📊 Results:`);
        console.log(`   - Total logs sent: ${logsGenerated}`);
        console.log(`   - Total logs received: ${logsReceived}`);
        console.log(`   - Test duration: ${totalTime.toFixed(2)} seconds`);
        console.log(`   - Throughput: ${finalRate} logs/minute`);
        console.log(`   - Success rate: ${((logsReceived/logsGenerated)*100).toFixed(2)}%`);
        console.log('='.repeat(60));
        
        socket.disconnect();
        process.exit(0);
      }, 2000);
    }
  }, INTERVAL);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\n⚠️  Make sure backend is running on port 5000');
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});