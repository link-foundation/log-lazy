// Use Bun's test framework when available, fallback to cross-runtime setup
const isBun = typeof Bun !== 'undefined';
const testModule = isBun 
  ? await import('bun:test')
  : await import('./test-setup.js');

const { describe, test, expect, beforeEach, mock } = testModule;
import makeLog from '../src/index.js';
import pino from 'pino';
import { Writable } from 'node:stream';

describe('Pino Integration', () => {
  let pinoLogger;
  let logOutput;
  
  beforeEach(() => {
    logOutput = [];
    
    // Create a writable stream to capture output
    const stream = new Writable({
      write(chunk, encoding, callback) {
        try {
          const log = JSON.parse(chunk.toString());
          logOutput.push(log);
        } catch (_e) {
          // Handle non-JSON output
          logOutput.push(chunk.toString());
        }
        callback();
      }
    });
    
    pinoLogger = pino({ level: 'trace' }, stream);
  });
  
  test('should integrate with Pino logger', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.fatal(rest[0] || {}, msg);
        },
        error: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.error(rest[0] || {}, msg);
        },
        warn: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.warn(rest[0] || {}, msg);
        },
        info: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.info(rest[0] || {}, msg);
        },
        debug: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.debug(rest[0] || {}, msg);
        },
        verbose: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.trace(rest[0] || {}, msg);
        },
        trace: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.trace(rest[0] || {}, msg);
        },
        silly: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.trace(rest[0] || {}, msg);
        }
      }
    });
    
    log.info('Test message');
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].msg).toBe('Test message');
    expect(logOutput[0].level).toBe(30); // Pino info level
  });
  
  test('should handle Pino structured logging with lazy evaluation', () => {
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => {
          const [msg, ...rest] = args;
          const metadata = rest[0] || {};
          pinoLogger.info(metadata, msg);
        }
      }
    });
    
    const expensiveMetadata = mock(() => ({
      userId: 123,
      action: 'login',
      timestamp: Date.now()
    }));
    
    log.info('User action', expensiveMetadata);
    
    expect(expensiveMetadata).toHaveBeenCalled();
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].msg).toBe('User action');
    expect(logOutput[0].userId).toBe(123);
    expect(logOutput[0].action).toBe('login');
  });
  
  test('lazy evaluation should prevent execution when disabled', () => {
    const log = makeLog({
      level: 'error', // Only error level
      log: {
        error: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.error(rest[0] || {}, msg);
        },
        info: (...args) => {
          const [msg, ...rest] = args;
          pinoLogger.info(rest[0] || {}, msg);
        }
      }
    });
    
    const expensiveFunc = mock(() => ({ data: 'expensive' }));
    
    log.info('Info message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(logOutput.length).toBe(0);
    
    log.error('Error message:', expensiveFunc);
    expect(expensiveFunc).toHaveBeenCalled();
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].level).toBe(50); // Pino error level
  });
  
  test('should map log levels correctly to Pino levels', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => {
          const [msg] = args;
          pinoLogger.fatal(msg);
        },
        error: (...args) => {
          const [msg] = args;
          pinoLogger.error(msg);
        },
        warn: (...args) => {
          const [msg] = args;
          pinoLogger.warn(msg);
        },
        info: (...args) => {
          const [msg] = args;
          pinoLogger.info(msg);
        },
        debug: (...args) => {
          const [msg] = args;
          pinoLogger.debug(msg);
        },
        trace: (...args) => {
          const [msg] = args;
          pinoLogger.trace(msg);
        }
      }
    });
    
    log.fatal('Fatal');
    expect(logOutput[0].level).toBe(60); // Pino fatal
    
    log.error('Error');
    expect(logOutput[1].level).toBe(50); // Pino error
    
    log.warn('Warn');
    expect(logOutput[2].level).toBe(40); // Pino warn
    
    log.info('Info');
    expect(logOutput[3].level).toBe(30); // Pino info
    
    log.debug('Debug');
    expect(logOutput[4].level).toBe(20); // Pino debug
    
    log.trace('Trace');
    expect(logOutput[5].level).toBe(10); // Pino trace
  });
  
  test('should work with Pino child loggers', () => {
    const childLogger = pinoLogger.child({ component: 'api' });
    
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => {
          const [msg, ...rest] = args;
          childLogger.info(rest[0] || {}, msg);
        }
      }
    });
    
    log.info('API request', () => ({
      method: 'GET',
      path: '/users'
    }));
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].component).toBe('api');
    expect(logOutput[0].method).toBe('GET');
    expect(logOutput[0].path).toBe('/users');
  });
});