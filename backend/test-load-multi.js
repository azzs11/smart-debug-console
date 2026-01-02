const io = require('socket.io-client');

const NUM_CLIENTS = 10;
const LOGS_PER_CLIENT_PER_MIN = 100; // Each client sends 100/min
const INTERVAL = 60000 / LOGS_PER_CLIENT_PER_MIN; // 600ms

console.log('='.repeat(60));
console.log('🚀 MULTI-CLIENT LOAD TEST');
console.log('='.repeat(60));
console.log(`👥 Concurrent clients: ${NUM_CLIENTS}`);
console.log(`📊 Logs per client: ${LOGS_PER_CLIENT_PER_MIN}/min`);
console.log(`📈 Expected total: ${NUM_CLIENTS * LOGS_PER_CLIENT_PER_MIN} logs/min`);
console.log('='.repeat(60) + '\n');

let totalLogsSent = 0;
let clientsFinished = 0;
const startTime = Date.now();

for (let clientId = 0; clientId < NUM_CLIENTS; clientId++) {
  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnection: false
  });
  
  socket.on('connect', () => {
    console.log(`✅ Client ${clientId + 1} connected`);
    
    let clientLogs = 0;
    const interval = setInterval(() => {
      socket.emit('send-log', {
        message: `Log from service-${clientId + 1} [msg ${clientLogs}]`,
        severity: ['info', 'warning', 'error'][clientLogs % 3],
        source: `service-${clientId + 1}`
      });
      
      totalLogsSent++;
      clientLogs++;
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= 60000) {
        clearInterval(interval);
        socket.disconnect();
        clientsFinished++;
        
        if (clientsFinished === NUM_CLIENTS) {
          setTimeout(() => {
            const duration = (Date.now() - startTime) / 1000;
            const rate = Math.floor(totalLogsSent / duration * 60);
            
            console.log('\n' + '='.repeat(60));
            console.log('✅ MULTI-CLIENT TEST COMPLETE');
            console.log('='.repeat(60));
            console.log(`📊 Total logs sent: ${totalLogsSent}`);
            console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
            console.log(`📈 Actual throughput: ${rate} logs/minute`);
            console.log(`🎯 Expected: ${NUM_CLIENTS * LOGS_PER_CLIENT_PER_MIN} logs/min`);
            console.log('='.repeat(60));
            process.exit(0);
          }, 1000);
        }
      }
    }, INTERVAL);
  });
}