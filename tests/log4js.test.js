// For Bun: test functions are globals - use them directly
// For Node/Deno: import from test-setup.js

import makeLog from '../src/index.js';

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
const spyOn = typeof Bun !== 'undefined' ? jest.spyOn : globalThis.spyOn;

describe('Log4js Integration', () => {
  test('should integrate with Log4js-style logging', () => {
    // Mock log4js-style logger
    const mockLogger = {
      fatal: mock((..._args) => {}),
      error: mock((..._args) => {}),
      warn: mock((..._args) => {}),
      info: mock((..._args) => {}),
      debug: mock((..._args) => {}),
      trace: mock((..._args) => {})
    };
    
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => mockLogger.fatal(...args),
        error: (...args) => mockLogger.error(...args),
        warn: (...args) => mockLogger.warn(...args),
        info: (...args) => mockLogger.info(...args),
        debug: (...args) => mockLogger.debug(...args),
        verbose: (...args) => mockLogger.trace(...args),
        trace: (...args) => mockLogger.trace(...args),
        silly: (...args) => mockLogger.trace('SILLY:', ...args)
      }
    });
    
    log.info('Test message');
    expect(mockLogger.info).toHaveBeenCalledWith('Test message');
    
    log.debug('Debug message');
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug message');
  });
  
  test('should handle lazy evaluation with Log4js-style logging', () => {
    const mockLogger = {
      debug: mock((..._args) => {})
    };
    
    const log = makeLog({
      level: 'all',
      log: {
        debug: (...args) => mockLogger.debug(...args)
      }
    });
    
    const expensiveFunc = mock(() => ({
      computed: 'value',
      timestamp: Date.now()
    }));
    
    log.debug('Debug data:', expensiveFunc);
    
    expect(expensiveFunc).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockLogger.debug.mock.calls[0][0]).toBe('Debug data:');
    expect(mockLogger.debug.mock.calls[0][1]).toHaveProperty('computed', 'value');
  });
  
  test('lazy evaluation should prevent execution when disabled', () => {
    const mockLogger = {
      error: mock((..._args) => {}),
      debug: mock((..._args) => {})
    };
    
    const log = makeLog({
      level: 'error', // Only error level
      log: {
        error: (...args) => mockLogger.error(...args),
        debug: (...args) => mockLogger.debug(...args)
      }
    });
    
    const expensiveFunc = mock(() => 'expensive result');
    
    log.debug('Debug message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(mockLogger.debug).not.toHaveBeenCalled();
    
    log.error('Error message:', expensiveFunc);
    expect(expensiveFunc).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
  });
  
  test('should work with Log4js-style categories simulation', () => {
    const defaultLogger = {
      info: mock((..._args) => {})
    };
    const errorLogger = {
      error: mock((..._args) => {})
    };
    
    const log = makeLog({
      level: 'all',
      log: {
        error: (...args) => errorLogger.error(...args),
        info: (...args) => defaultLogger.info(...args)
      }
    });
    
    log.info('Info message');
    expect(defaultLogger.info).toHaveBeenCalledWith('Info message');
    
    log.error('Error message');
    expect(errorLogger.error).toHaveBeenCalledWith('Error message');
  });
  
  test('should map verbose and silly to trace level', () => {
    const mockLogger = {
      trace: mock((..._args) => {})
    };
    
    const log = makeLog({
      level: 'all',
      log: {
        verbose: (...args) => mockLogger.trace(...args),
        silly: (...args) => mockLogger.trace('SILLY:', ...args)
      }
    });
    
    log.verbose('Verbose message');
    expect(mockLogger.trace).toHaveBeenCalledWith('Verbose message');
    
    log.silly('Silly message');
    expect(mockLogger.trace.mock.calls[1][0]).toBe('SILLY:');
    expect(mockLogger.trace.mock.calls[1][1]).toBe('Silly message');
  });
});
