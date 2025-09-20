import makeLog from './src/index.js';

// Create logger with production level (only fatal, error, warn)
const log = makeLog({ level: 'production' });

// ❌ Traditional logging - ALWAYS executes expensive operations
console.time('traditional');
if (console.debug) {
  console.debug('User data:', JSON.stringify({
    id: 1,
    details: Array.from({ length: 100000 }, (_, i) => ({
      index: i,
      value: Math.random()
    }))
  }));
}
console.timeEnd('traditional');

// ✅ Lazy logging - expensive operation NEVER runs when disabled
console.time('lazy');
log.debug('User data:', () => JSON.stringify({
  id: 1,
  details: Array.from({ length: 100000 }, (_, i) => ({
    index: i,
    value: Math.random()
  }))
}));
console.timeEnd('lazy');

// Output:
// traditional: ~25ms (expensive operation always runs)
// lazy: ~0.01ms (function never called, zero cost!)

// 🎯 Result: 2500x faster when debug is disabled!