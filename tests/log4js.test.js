import { describe, test, expect, mock } from 'bun:test';
import { LazyLog } from '../src/index.js';

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
    
    const logger = new LazyLog({
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
    
    logger.info('Test message');
    expect(mockLogger.info).toHaveBeenCalledWith('Test message');
    
    logger.debug('Debug message');
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug message');
  });
  
  test('should handle lazy evaluation with Log4js-style logging', () => {
    const mockLogger = {
      debug: mock((...args) => {})
    };
    
    const logger = new LazyLog({
      level: 'all',
      log: {
        debug: (...args) => mockLogger.debug(...args)
      }
    });
    
    const expensiveFunc = mock(() => ({
      computed: 'value',
      timestamp: Date.now()
    }));
    
    logger.debug('Debug data:', expensiveFunc);
    
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
    
    const logger = new LazyLog({
      level: 'error', // Only error level
      log: {
        error: (...args) => mockLogger.error(...args),
        debug: (...args) => mockLogger.debug(...args)
      }
    });
    
    const expensiveFunc = mock(() => 'expensive result');
    
    logger.debug('Debug message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(mockLogger.debug).not.toHaveBeenCalled();
    
    logger.error('Error message:', expensiveFunc);
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
    
    const logger = new LazyLog({
      level: 'all',
      log: {
        error: (...args) => errorLogger.error(...args),
        info: (...args) => defaultLogger.info(...args)
      }
    });
    
    logger.info('Info message');
    expect(defaultLogger.info).toHaveBeenCalledWith('Info message');
    
    logger.error('Error message');
    expect(errorLogger.error).toHaveBeenCalledWith('Error message');
  });
  
  test('should map verbose and silly to trace level', () => {
    const mockLogger = {
      trace: mock((...args) => {})
    };
    
    const logger = new LazyLog({
      level: 'all',
      log: {
        verbose: (...args) => mockLogger.trace(...args),
        silly: (...args) => mockLogger.trace('SILLY:', ...args)
      }
    });
    
    logger.verbose('Verbose message');
    expect(mockLogger.trace).toHaveBeenCalledWith('Verbose message');
    
    logger.silly('Silly message');
    expect(mockLogger.trace.mock.calls[1][0]).toBe('SILLY:');
    expect(mockLogger.trace.mock.calls[1][1]).toBe('Silly message');
  });
});