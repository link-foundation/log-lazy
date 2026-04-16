import makeLog from '../src/index.js';

// Create logger with production level (fatal, error, warn only)
const log = makeLog({ level: 'production' });

// Simulate some application state
const userId = 123;
const requestId = 'abc-456';
const responseTime = 234.56;
const errorDetails = { code: 'DB_CONN_FAIL', retry: 3 };

// ✅ Default log() - acts as info level (disabled in production)
log(() => `Request ${requestId} started for user ${userId}`);

// ✅ Error logging - always enabled in production
log.error(() => `Database connection failed: ${JSON.stringify(errorDetails)}`);

// ✅ Warning - enabled in production
log.warn(() => `Slow response time: ${responseTime}ms for request ${requestId}`);

// ✅ Debug logging - ZERO cost in production
log.debug(() => `Processing user ${userId} with data: ${JSON.stringify({
  timestamp: Date.now(),
  memory: process.memoryUsage().heapUsed,
  details: Array.from({ length: 1000 }, () => Math.random())
})}`);

// ✅ Trace logging - completely skipped in production
log.trace(() => `[TRACE] Entering function with params: ${JSON.stringify(arguments)}`);

/*
In Production Mode:
- log() → skipped (no cost)
- log.error() → executed (important for monitoring)
- log.warn() → executed (important for monitoring)  
- log.debug() → skipped (expensive operation never runs!)
- log.trace() → skipped (no cost)

Result: Full observability in development, blazing fast in production!
*/