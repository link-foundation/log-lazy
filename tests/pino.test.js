import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LazyLog } from '../src/index.js';
import pino from 'pino';
import { Writable } from 'stream';

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
        } catch (e) {
          // Handle non-JSON output
          logOutput.push(chunk.toString());
        }
        callback();
      }
    });
    
    pinoLogger = pino({ level: 'trace' }, stream);
  });
  
  test('should integrate with Pino logger', () => {
    const logger = new LazyLog({
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
    
    logger.info('Test message');
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].msg).toBe('Test message');
    expect(logOutput[0].level).toBe(30); // Pino info level
  });
  
  test('should handle Pino structured logging with lazy evaluation', () => {
    const logger = new LazyLog({
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
    
    logger.info('User action', expensiveMetadata);
    
    expect(expensiveMetadata).toHaveBeenCalled();
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].msg).toBe('User action');
    expect(logOutput[0].userId).toBe(123);
    expect(logOutput[0].action).toBe('login');
  });
  
  test('lazy evaluation should prevent execution when disabled', () => {
    const logger = new LazyLog({
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
    
    logger.info('Info message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(logOutput.length).toBe(0);
    
    logger.error('Error message:', expensiveFunc);
    expect(expensiveFunc).toHaveBeenCalled();
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].level).toBe(50); // Pino error level
  });
  
  test('should map log levels correctly to Pino levels', () => {
    const logger = new LazyLog({
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
    
    logger.fatal('Fatal');
    expect(logOutput[0].level).toBe(60); // Pino fatal
    
    logger.error('Error');
    expect(logOutput[1].level).toBe(50); // Pino error
    
    logger.warn('Warn');
    expect(logOutput[2].level).toBe(40); // Pino warn
    
    logger.info('Info');
    expect(logOutput[3].level).toBe(30); // Pino info
    
    logger.debug('Debug');
    expect(logOutput[4].level).toBe(20); // Pino debug
    
    logger.trace('Trace');
    expect(logOutput[5].level).toBe(10); // Pino trace
  });
  
  test('should work with Pino child loggers', () => {
    const childLogger = pinoLogger.child({ component: 'api' });
    
    const logger = new LazyLog({
      level: 'all',
      log: {
        info: (...args) => {
          const [msg, ...rest] = args;
          childLogger.info(rest[0] || {}, msg);
        }
      }
    });
    
    logger.info('API request', () => ({
      method: 'GET',
      path: '/users'
    }));
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].component).toBe('api');
    expect(logOutput[0].method).toBe('GET');
    expect(logOutput[0].path).toBe('/users');
  });
});