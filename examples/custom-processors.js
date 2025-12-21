import makeLog, { postprocessors, preprocessors } from 'log-lazy';

// Example 1: Adding timestamps to all logs
const logWithTimestamp = makeLog({
  level: 'info',
  postprocessors: [postprocessors.timestamp('iso')]
});

logWithTimestamp('Server started');
// Output: [2024-01-15T10:30:45.123Z] Server started

// Example 2: Adding log level prefix
const logWithLevel = makeLog({
  level: 'all',
  postprocessors: [postprocessors.level()]
});

logWithLevel.info('User logged in');
logWithLevel.warn('High memory usage');
logWithLevel.error('Connection failed');
// Output:
// [INFO] User logged in
// [WARN] High memory usage
// [ERROR] Connection failed

// Example 3: Combining multiple postprocessors
const structuredLog = makeLog({
  level: 'all',
  postprocessors: [
    postprocessors.level(),
    postprocessors.timestamp('time'),
    postprocessors.prefix('[MyApp]')
  ]
});

structuredLog.info('Processing payment');
// Output: [MyApp] [10:30:45 AM] [INFO] Processing payment

// Example 4: Custom postprocessor for JSON formatting
const jsonLogger = makeLog({
  level: 'info',
  postprocessors: [
    (message, level, levelName) => {
      return JSON.stringify({
        level: levelName,
        timestamp: new Date().toISOString(),
        message: message
      });
    }
  ]
});

jsonLogger('Database query completed');
// Output: {"level":"info","timestamp":"2024-01-15T10:30:45.123Z","message":"Database query completed"}

// Example 5: Preprocessor to add context
const requestLog = makeLog({
  level: 'info',
  preprocessors: [
    preprocessors.addContext({ requestId: 'req-123', userId: 'user-456' })
  ]
});

requestLog('API call started');
// Output: API call started { requestId: 'req-123', userId: 'user-456' }

// Example 6: Filter sensitive data with preprocessor
const secureLog = makeLog({
  level: 'info',
  preprocessors: [
    (args) => args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized = { ...arg };
        if ('password' in sanitized) sanitized.password = '***';
        if ('token' in sanitized) sanitized.token = '***';
        return sanitized;
      }
      return arg;
    })
  ]
});

secureLog('User data:', { username: 'john', password: 'secret123' });
// Output: User data: { username: 'john', password: '***' }

// Example 7: Production-ready logger with all features
const productionLog = makeLog({
  level: process.env.LOG_LEVEL || 'info',
  preprocessors: [
    // Add request context if available
    (args) => {
      const context = globalThis.currentRequestContext;
      return context ? [context, ...args] : args;
    }
  ],
  postprocessors: [
    postprocessors.level(),
    postprocessors.timestamp('iso'),
    postprocessors.pid()
  ]
});

productionLog.info('Application started');
productionLog.error('Unexpected error occurred');
// Output:
// [PID:1234] [2024-01-15T10:30:45.123Z] [INFO] Application started
// [PID:1234] [2024-01-15T10:30:45.456Z] [ERROR] Unexpected error occurred

// Example 8: Lazy evaluation still works
const lazyLog = makeLog({
  level: 'debug',
  postprocessors: [
    postprocessors.level(),
    postprocessors.timestamp('ms')
  ]
});

// This expensive operation only runs if debug is enabled
lazyLog.debug(() => {
  const complexData = computeExpensiveMetrics();
  return `Metrics: ${JSON.stringify(complexData)}`;
});

function computeExpensiveMetrics() {
  // Expensive computation here
  return { cpu: 45, memory: 78, requests: 1234 };
}
