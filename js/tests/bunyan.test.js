/* eslint-env node */
/* global describe, test, expect, beforeEach, jest */

// For Bun: test functions are globals - use them directly
// For Node/Deno: import from test-setup.js

import makeLog from '../src/index.js';
import bunyan from 'bunyan';
import { Writable } from 'node:stream';

// Runtime detection and setup
if (typeof Bun === 'undefined') {
  // Only import for non-Bun environments
  const testModule = await import('./test-setup.js');
  globalThis.describe = testModule.describe;
  globalThis.test = testModule.test;
  globalThis.expect = testModule.expect;
  globalThis.mock = testModule.mock;
  globalThis.spyOn = testModule.spyOn;
  globalThis.beforeEach = testModule.beforeEach;
  globalThis.afterEach = testModule.afterEach;
}

// In Bun, use jest.fn and jest.spyOn for mocking
const mock = typeof Bun !== 'undefined' ? jest.fn : globalThis.mock;
const _spyOn = typeof Bun !== 'undefined' ? jest.spyOn : globalThis.spyOn;

describe('Bunyan Integration', () => {
  let bunyanLogger;
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
    
    bunyanLogger = bunyan.createLogger({
      name: 'test-app',
      level: 'trace',
      streams: [{ stream: stream }]
    });
  });
  
  test('should integrate with Bunyan logger', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.fatal(rest[0] || {}, msg);
        },
        error: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.error(rest[0] || {}, msg);
        },
        warn: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.warn(rest[0] || {}, msg);
        },
        info: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.info(rest[0] || {}, msg);
        },
        debug: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.debug(rest[0] || {}, msg);
        },
        verbose: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.trace(rest[0] || {}, msg);
        },
        trace: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.trace(rest[0] || {}, msg);
        },
        silly: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.trace({ level: 'silly', ...rest[0] }, msg);
        }
      }
    });
    
    log.info('Test message');
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].msg).toBe('Test message');
    expect(logOutput[0].level).toBe(30); // Bunyan info level
    expect(logOutput[0].name).toBe('test-app');
  });
  
  test('should handle Bunyan structured logging with lazy evaluation', () => {
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => {
          const [msg, ...rest] = args;
          const metadata = rest[0] || {};
          bunyanLogger.info(metadata, msg);
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
          bunyanLogger.error(rest[0] || {}, msg);
        },
        info: (...args) => {
          const [msg, ...rest] = args;
          bunyanLogger.info(rest[0] || {}, msg);
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
    expect(logOutput[0].level).toBe(50); // Bunyan error level
  });
  
  test('should map log levels correctly to Bunyan levels', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => bunyanLogger.fatal(args[0]),
        error: (...args) => bunyanLogger.error(args[0]),
        warn: (...args) => bunyanLogger.warn(args[0]),
        info: (...args) => bunyanLogger.info(args[0]),
        debug: (...args) => bunyanLogger.debug(args[0]),
        trace: (...args) => bunyanLogger.trace(args[0])
      }
    });
    
    log.fatal('Fatal');
    expect(logOutput[0].level).toBe(60); // Bunyan fatal
    
    log.error('Error');
    expect(logOutput[1].level).toBe(50); // Bunyan error
    
    log.warn('Warn');
    expect(logOutput[2].level).toBe(40); // Bunyan warn
    
    log.info('Info');
    expect(logOutput[3].level).toBe(30); // Bunyan info
    
    log.debug('Debug');
    expect(logOutput[4].level).toBe(20); // Bunyan debug
    
    log.trace('Trace');
    expect(logOutput[5].level).toBe(10); // Bunyan trace
  });
  
  test('should work with Bunyan child loggers', () => {
    const childLogger = bunyanLogger.child({ component: 'api', version: '1.0.0' });
    
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
    expect(logOutput[0].version).toBe('1.0.0');
    expect(logOutput[0].method).toBe('GET');
    expect(logOutput[0].path).toBe('/users');
  });
  
  test('should handle Bunyan serializers', () => {
    const loggerWithSerializers = bunyan.createLogger({
      name: 'test-app',
      serializers: {
        err: bunyan.stdSerializers.err,
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
      },
      streams: [{
        stream: new Writable({
          write(chunk, encoding, callback) {
            try {
              const log = JSON.parse(chunk.toString());
              logOutput.push(log);
            } catch (_e) {
              logOutput.push(chunk.toString());
            }
            callback();
          }
        })
      }]
    });
    
    const log = makeLog({
      level: 'all',
      log: {
        error: (...args) => {
          const [msg, ...rest] = args;
          loggerWithSerializers.error(rest[0] || {}, msg);
        }
      }
    });
    
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test';
    
    log.error('Error occurred', () => ({ err: error }));
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0].err).toBeDefined();
    expect(logOutput[0].err.message).toBe('Test error');
    expect(logOutput[0].err.stack).toContain('Error: Test error');
  });
});