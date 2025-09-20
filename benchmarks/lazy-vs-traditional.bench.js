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
  
  warn(message) {
    if (this.level === 'warn' || this.level === 'info' || this.level === 'debug') {
      mockConsole.warn(message);
    }
  }
  
  error(message) {
    if (this.level !== 'none') {
      mockConsole.error(message);
    }
  }
}

// Benchmark 1: JSON.stringify (100 iterations)
bench('Traditional - JSON.stringify (disabled)', () => {
  const logger = new TraditionalLogger('error');
  
  // This ALWAYS evaluates the expensive JSON.stringify
  for (let i = 0; i < 100; i++) {
    logger.debug(`Debug data: ${JSON.stringify(largeObject)}`);
  }
});

bench('Lazy - JSON.stringify (disabled)', () => {
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

// Benchmark 2: Complex calculations (1000 iterations)
bench('Traditional - Calculations (disabled)', () => {
  const logger = new TraditionalLogger('error');
  
  for (let i = 0; i < 1000; i++) {
    // Always performs the calculations
    logger.info(`Stats: ${largeObject.users.filter(u => u.id % 2 === 0).length} even users, ` +
                `total: ${largeObject.users.reduce((sum, u) => sum + u.id, 0)}`);
  }
});

bench('Lazy - Calculations (disabled)', () => {
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

// Benchmark 3: String concatenation (10000 iterations)
bench('Traditional - String concat (disabled)', () => {
  const logger = new TraditionalLogger('error');
  
  for (let i = 0; i < 10000; i++) {
    logger.debug(`Iteration ${i}: timestamp=${Date.now()}, random=${Math.random()}, ` +
                 `calculation=${i * 2 + 1}, substr=${JSON.stringify(largeObject).substring(0, 50)}`);
  }
});

bench('Lazy - String concat (disabled)', () => {
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

// Benchmark 4: When logging IS enabled (to show the overhead)
bench('Traditional - Simple message (enabled)', () => {
  const logger = new TraditionalLogger('info');
  
  for (let i = 0; i < 1000; i++) {
    logger.info(`Simple message ${i}`);
  }
});

bench('Lazy - Simple message (enabled)', () => {
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

// Benchmark 5: Mixed workload (production scenario - warn level)
bench('Traditional - Mixed workload (warn level)', () => {
  const logger = new TraditionalLogger('warn');
  
  for (let i = 0; i < 1000; i++) {
    // Debug (disabled) - but still evaluates expensive operations
    logger.debug(`Debug: ${JSON.stringify(largeObject)}`);
    
    // Info (disabled) - but still evaluates
    logger.info(`Info: ${largeObject.users.filter(u => u.id % 2 === 0).length} even users`);
    
    // Warn (enabled)
    logger.warn(`Warning ${i}`);
    
    // Error (enabled)
    if (i % 100 === 0) {
      logger.error(`Error at ${i}`);
    }
  }
});

bench('Lazy - Mixed workload (warn level)', () => {
  const log = makeLog({ 
    level: 'warn',
    log: {
      debug: mockConsole.log,
      info: mockConsole.log,
      warn: mockConsole.warn,
      error: mockConsole.error,
    }
  });
  
  for (let i = 0; i < 1000; i++) {
    // Debug (disabled) - never evaluates
    log.debug(() => `Debug: ${JSON.stringify(largeObject)}`);
    
    // Info (disabled) - never evaluates
    log.info(() => `Info: ${largeObject.users.filter(u => u.id % 2 === 0).length} even users`);
    
    // Warn (enabled)
    log.warn(() => `Warning ${i}`);
    
    // Error (enabled)
    if (i % 100 === 0) {
      log.error(() => `Error at ${i}`);
    }
  }
});

// Run benchmarks
await run();