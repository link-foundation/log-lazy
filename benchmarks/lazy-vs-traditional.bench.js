import { bench, run } from 'mitata';
import makeLog from '../src/index.js';

// Create a mock console to prevent actual output during benchmarks
const mockConsole = {
  log: () => {},
  error: () => {},
  warn: () => {},
};

// Test data
const largeObject = {
  users: new Array(100).fill(0).map((_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    metadata: {
      created: Date.now(),
      lastLogin: Date.now() - Math.random() * 1000000,
      preferences: {
        theme: 'dark',
        notifications: true,
      }
    }
  }))
};

// Traditional logging simulation (always evaluates)
class TraditionalLogger {
  constructor(level) {
    this.level = level;
  }
  
  debug(message) {
    if (this.level === 'debug') {
      mockConsole.log(message);
    }
  }
  
  info(message) {
    if (this.level === 'info' || this.level === 'debug') {
      mockConsole.log(message);
    }
  }
}

// Benchmark: Disabled debug logs with expensive operations
bench('Traditional logging (debug disabled) - JSON.stringify', () => {
  const logger = new TraditionalLogger('error');
  
  // This ALWAYS evaluates the expensive JSON.stringify
  for (let i = 0; i < 100; i++) {
    logger.debug(`Debug data: ${JSON.stringify(largeObject)}`);
  }
});

bench('Lazy logging (debug disabled) - JSON.stringify', () => {
  const log = makeLog({ 
    level: 'error',
    log: {
      debug: mockConsole.log,
      error: mockConsole.error,
      info: mockConsole.log,
    }
  });
  
  // This NEVER evaluates JSON.stringify when debug is disabled
  for (let i = 0; i < 100; i++) {
    log.debug(() => `Debug data: ${JSON.stringify(largeObject)}`);
  }
});

// Benchmark: Complex calculations
bench('Traditional logging (info disabled) - calculations', () => {
  const logger = new TraditionalLogger('error');
  
  for (let i = 0; i < 1000; i++) {
    // Always performs the calculations
    logger.info(`Stats: ${largeObject.users.filter(u => u.id % 2 === 0).length} even users, ` +
                `total: ${largeObject.users.reduce((sum, u) => sum + u.id, 0)}`);
  }
});

bench('Lazy logging (info disabled) - calculations', () => {
  const log = makeLog({ 
    level: 'error',
    log: {
      info: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  for (let i = 0; i < 1000; i++) {
    // Never performs the calculations
    log(() => `Stats: ${largeObject.users.filter(u => u.id % 2 === 0).length} even users, ` +
              `total: ${largeObject.users.reduce((sum, u) => sum + u.id, 0)}`);
  }
});

// Benchmark: Multiple string concatenations
bench('Traditional logging (disabled) - string concatenation', () => {
  const logger = new TraditionalLogger('error');
  
  for (let i = 0; i < 10000; i++) {
    logger.debug(`Iteration ${i}: timestamp=${Date.now()}, random=${Math.random()}, ` +
                 `calculation=${i * 2 + 1}, substr=${JSON.stringify(largeObject).substring(0, 50)}`);
  }
});

bench('Lazy logging (disabled) - string concatenation', () => {
  const log = makeLog({ 
    level: 'error',
    log: {
      debug: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  for (let i = 0; i < 10000; i++) {
    log.debug(() => `Iteration ${i}: timestamp=${Date.now()}, random=${Math.random()}, ` +
                    `calculation=${i * 2 + 1}, substr=${JSON.stringify(largeObject).substring(0, 50)}`);
  }
});

// Benchmark: When logging IS enabled (to show the overhead is minimal)
bench('Traditional logging (enabled) - simple message', () => {
  const logger = new TraditionalLogger('info');
  
  for (let i = 0; i < 1000; i++) {
    logger.info(`Simple message ${i}`);
  }
});

bench('Lazy logging (enabled) - simple message', () => {
  const log = makeLog({ 
    level: 'info',
    log: {
      info: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  for (let i = 0; i < 1000; i++) {
    log(() => `Simple message ${i}`);
  }
});

// Run benchmarks
await run();