import makeLog, { postprocessors, preprocessors } from '../src/index.js';

console.log('=== Preprocessor and Postprocessor Experiments ===\n');

// Experiment 1: Basic postprocessor with timestamp
console.log('1. Basic timestamp postprocessor:');
const log1 = makeLog({
  level: 'info',
  postprocessors: [postprocessors.timestamp('iso')]
});
log1('Server started on port 3000');
console.log();

// Experiment 2: Multiple postprocessors (level + timestamp)
console.log('2. Combining level and timestamp postprocessors:');
const log2 = makeLog({
  level: 'all',
  postprocessors: [
    postprocessors.level(),
    postprocessors.timestamp('time')
  ]
});
log2.info('User logged in');
log2.warn('Rate limit approaching');
log2.error('Database connection failed');
console.log();

// Experiment 3: Custom prefix/suffix
console.log('3. Custom prefix and suffix:');
const log3 = makeLog({
  level: 'info',
  postprocessors: [
    postprocessors.prefix('[MyApp]'),
    postprocessors.suffix('✓')
  ]
});
log3('Payment processed successfully');
console.log();

// Experiment 4: Process ID in logs
console.log('4. Adding process ID:');
const log4 = makeLog({
  level: 'info',
  postprocessors: [
    postprocessors.pid(),
    postprocessors.level()
  ]
});
log4.info('Worker started');
console.log();

// Experiment 5: Preprocessor to add context
console.log('5. Preprocessor adding context:');
const log5 = makeLog({
  level: 'info',
  preprocessors: [
    preprocessors.addContext({ requestId: 'req-12345' })
  ]
});
log5('Processing request');
console.log();

// Experiment 6: Preprocessor to filter args
console.log('6. Preprocessor filtering sensitive data:');
const log6 = makeLog({
  level: 'info',
  preprocessors: [
    preprocessors.filter(arg => {
      // Filter out objects with 'password' property
      if (typeof arg === 'object' && arg !== null && 'password' in arg) {
        return false;
      }
      return true;
    })
  ]
});
log6('Login attempt:', { username: 'john', password: 'secret123' });
console.log();

// Experiment 7: Combining pre and postprocessors
console.log('7. Combining preprocessors and postprocessors:');
const log7 = makeLog({
  level: 'all',
  preprocessors: [
    (args) => ['[Context]', ...args]
  ],
  postprocessors: [
    postprocessors.level(),
    postprocessors.timestamp('ms')
  ]
});
log7.debug('Debug information with full context');
console.log();

// Experiment 8: Custom preprocessor and postprocessor
console.log('8. Custom processors for structured logging:');
const log8 = makeLog({
  level: 'info',
  preprocessors: [
    // Convert first arg to uppercase if it's a string
    (args) => {
      if (args.length > 0 && typeof args[0] === 'string') {
        return [args[0].toUpperCase(), ...args.slice(1)];
      }
      return args;
    }
  ],
  postprocessors: [
    // Wrap in decorative box
    (message) => `╔═══ ${message} ═══╗`
  ]
});
log8('important announcement', 'with details');
console.log();

// Experiment 9: Zero overhead - no processors
console.log('9. Zero overhead (no processors):');
const log9 = makeLog({ level: 'info' });
log9('Plain log message', { data: 'value' });
console.log();

// Experiment 10: Lazy evaluation still works with processors
console.log('10. Lazy evaluation with postprocessors:');
const log10 = makeLog({
  level: 'info',
  postprocessors: [
    postprocessors.prefix('[LAZY]')
  ]
});

let computeCount = 0;
const expensiveOperation = () => {
  computeCount++;
  return `Computed value: ${Math.random()}`;
};

log10(() => expensiveOperation());
console.log(`Computation executed: ${computeCount} time(s)`);

// Disable logging and try again
log10.level = 0; // none
log10(() => expensiveOperation());
console.log(`After disabling: ${computeCount} time(s) (should still be 1)`);
console.log();

// Experiment 11: Real-world example - structured JSON logging
console.log('11. Real-world structured logging:');
const jsonLog = makeLog({
  level: 'all',
  preprocessors: [
    // Add common fields
    (args) => {
      const metadata = {
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        version: '1.0.0'
      };
      return [metadata, ...args];
    }
  ],
  postprocessors: [
    // Format as JSON (just for demo, normally you'd keep objects)
    (message, level, levelName) => {
      return `{"level":"${levelName}","message":"${message}"}`;
    }
  ]
});
jsonLog.info('Request received');
console.log();

console.log('=== All experiments completed ===');
