import makeLog from '../src/index.js';

// Try different levels to see the performance impact
// LOG_LEVEL=none → Maximum performance (no logging at all)
// LOG_LEVEL=all → All levels enabled (for comparison)
const level = process.env.LOG_LEVEL || 'none';
const log = makeLog({ level });

console.log(`🔧 Running comparison with log level: ${level}\n`);

// Realistic application data
const userData = { 
  id: 123,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  roles: ['admin', 'user'],
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  },
  lastLogin: new Date().toISOString(),
  sessions: [
    { id: 'sess_1', device: 'Chrome/120', ip: '192.168.1.1' },
    { id: 'sess_2', device: 'Mobile/iOS', ip: '192.168.1.2' }
  ]
};

// Run comparison 10,000 times to show the cumulative effect
const iterations = 10000;

// ❌ Traditional logging - ALWAYS runs expensive operations
console.time('traditional-logging');
for (let i = 0; i < iterations; i++) {
  // This JSON.stringify ALWAYS executes, even when not logging
  const _message = `User ${userData.id} activity: ${JSON.stringify(userData)}`;
  // Most common pattern: check level then log
  if (level === 'all' || level === 'debug') {
    console.debug(_message);
  }
}
console.timeEnd('traditional-logging');

// ✅ Lazy logging - expensive operations NEVER run when disabled
console.time('lazy-logging');
for (let i = 0; i < iterations; i++) {
  // Function is NEVER called when debug is disabled
  log.debug(() => `User ${userData.id} activity: ${JSON.stringify(userData)}`);
}
console.timeEnd('lazy-logging');

console.log('\n📊 Results:');
console.log('Traditional: JSON.stringify executes 10,000 times (slow)');
console.log('Lazy: Function never called when disabled (fast)');
console.log('\n💡 In production with thousands of requests, this adds up!');

/*
Try these commands to see the difference:

  LOG_LEVEL=none node examples/comparison.js  # Lazy is much faster
  LOG_LEVEL=all node examples/comparison.js   # Both take similar time

With level='none', the lazy version completely skips the expensive operations!
*/