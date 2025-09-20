import { describe, test, expect, mock } from 'bun:test';
import makeLog from '../src/index.js';

describe('Log4js Integration', () => {
  test('should integrate with Log4js-style logging', () => {
    // Mock log4js-style logger
    const mockLogger = {
      fatal: mock((...args) => {}),
      error: mock((...args) => {}),
      warn: mock((...args) => {}),
      info: mock((...args) => {}),
      debug: mock((...args) => {}),
      trace: mock((...args) => {})
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
      debug: mock((...args) => {})
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
      error: mock((...args) => {}),
      debug: mock((...args) => {})
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
      info: mock((...args) => {})
    };
    const errorLogger = {
      error: mock((...args) => {})
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
      trace: mock((...args) => {})
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