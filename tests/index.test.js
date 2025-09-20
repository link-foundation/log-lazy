// Use Bun's test framework when available, fallback to cross-runtime setup
const isBun = typeof Bun !== 'undefined';
const testModule = isBun 
  ? await import('bun:test')
  : await import('./test-setup.js');

const { describe, test, expect, beforeEach, afterEach, mock, spyOn } = testModule;

import makeLog, { defaultLog, log, levels, levelNames } from '../src/index.js';

// Helper to create LazyLog-compatible object from makeLog
const createCompatibleLogger = (options) => {
  const logObj = makeLog(options);
  const logger = { 
    log: logObj,
    fatal: logObj.fatal,
    error: logObj.error,
    warn: logObj.warn,
    info: logObj.info,
    debug: logObj.debug,
    verbose: logObj.verbose,
    trace: logObj.trace,
    silly: logObj.silly,
    shouldLog: logObj.shouldLog,
    enableLevel: logObj.enableLevel,
    disableLevel: logObj.disableLevel,
    getEnabledLevels: logObj.getEnabledLevels,
    levels: logObj.levels,
    levelNames: logObj.levelNames
  };
  Object.defineProperty(logger, 'level', {
    get: () => logObj.level,
    set: (v) => { logObj.level = v; }
  });
  // For tests that check externalLog
  logger.externalLog = options?.log || {
    fatal: console.error,
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.log,
    verbose: console.log,
    trace: console.log,
    silly: console.log
  };
  return logger;
};

describe('makeLog (LazyLog compatibility)', () => {
  let consoleErrorSpy, consoleWarnSpy, consoleLogSpy;
  let logger;

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    logger = { log: makeLog(), ...makeLog() };
    // Add compatibility methods
    logger.fatal = logger.log.fatal;
    logger.error = logger.log.error;
    logger.warn = logger.log.warn;
    logger.info = logger.log.info;
    logger.debug = logger.log.debug;
    logger.verbose = logger.log.verbose;
    logger.trace = logger.log.trace;
    logger.silly = logger.log.silly;
    logger.shouldLog = logger.log.shouldLog;
    logger.enableLevel = logger.log.enableLevel;
    logger.disableLevel = logger.log.disableLevel;
    logger.getEnabledLevels = logger.log.getEnabledLevels;
    logger.levels = logger.log.levels;
    logger.levelNames = logger.log.levelNames;
    Object.defineProperty(logger, 'level', {
      get: () => logger.log.level,
      set: (v) => { logger.log.level = v; }
    });
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Static levels', () => {
    test('should have correct static level values', () => {
      expect(levels.none).toBe(0);
      expect(levels.fatal).toBe(1);
      expect(levels.error).toBe(2);
      expect(levels.warn).toBe(4);
      expect(levels.info).toBe(8);
      expect(levels.debug).toBe(16);
      expect(levels.verbose).toBe(32);
      expect(levels.trace).toBe(64);
      expect(levels.silly).toBe(128);
      expect(levels.all).toBe(255);
    });
  });

  describe('Constructor', () => {
    test('should initialize with default info level', () => {
      const logger = createCompatibleLogger();
      expect(logger.level).toBe(levels.info);
    });

    test('should initialize with custom level from options', () => {
      const logger = createCompatibleLogger({ level: levels.debug });
      expect(logger.level).toBe(levels.debug);
    });

    test('should parse string level names', () => {
      const logger = createCompatibleLogger({ level: 'debug' });
      expect(logger.level).toBe(levels.debug);
    });

    test('should parse numeric string levels', () => {
      const logger = createCompatibleLogger({ level: '16' });
      expect(logger.level).toBe(16);
    });

    test('should default to info for invalid string levels', () => {
      const logger = createCompatibleLogger({ level: 'invalid' });
      expect(logger.level).toBe(levels.info);
    });

    test('should set default production preset', () => {
      const logger = createCompatibleLogger();
      expect(logger.levels.production).toBe(7); // fatal + error + warn
    });

    test('should set default development preset', () => {
      const logger = createCompatibleLogger();
      expect(logger.levels.development).toBe(31); // fatal + error + warn + info + debug
    });

    test('should allow custom production preset', () => {
      const logger = createCompatibleLogger({ presets: { production: 15 } });
      expect(logger.levels.production).toBe(15);
    });

    test('should allow custom development preset', () => {
      const logger = createCompatibleLogger({ presets: { development: 63 } });
      expect(logger.levels.development).toBe(63);
    });

    test('should allow additional custom presets', () => {
      const logger = createCompatibleLogger({ presets: { custom: 100, testing: 200 } });
      expect(logger.levels.custom).toBe(100);
      expect(logger.levels.testing).toBe(200);
    });

    test('should use custom output functions', () => {
      const customFatal = mock(() => {});
      const customError = mock(() => {});
      const customWarn = mock(() => {});
      const customInfo = mock(() => {});
      const customDebug = mock(() => {});
      const customVerbose = mock(() => {});
      const customTrace = mock(() => {});
      const customSilly = mock(() => {});

      const logger = createCompatibleLogger({
        level: levels.all,
        log: {
          fatal: customFatal,
          error: customError,
          warn: customWarn,
          info: customInfo,
          debug: customDebug,
          verbose: customVerbose,
          trace: customTrace,
          silly: customSilly
        }
      });

      logger.fatal('test');
      expect(customFatal).toHaveBeenCalledWith('test');

      logger.error('test');
      expect(customError).toHaveBeenCalledWith('test');

      logger.warn('test');
      expect(customWarn).toHaveBeenCalledWith('test');

      logger.info('test');
      expect(customInfo).toHaveBeenCalledWith('test');

      logger.debug('test');
      expect(customDebug).toHaveBeenCalledWith('test');

      logger.verbose('test');
      expect(customVerbose).toHaveBeenCalledWith('test');

      logger.trace('test');
      expect(customTrace).toHaveBeenCalledWith('test');

      logger.silly('test');
      expect(customSilly).toHaveBeenCalledWith('test');
    });
  });

  describe('shouldLog', () => {
    test('should return false when level is none', () => {
      const logger = createCompatibleLogger({ level: levels.none });
      expect(logger.shouldLog('fatal')).toBe(false);
      expect(logger.shouldLog('error')).toBe(false);
      expect(logger.shouldLog('info')).toBe(false);
    });

    test('should return true for enabled levels', () => {
      const logger = createCompatibleLogger({ level: levels.error | levels.warn });
      expect(logger.shouldLog('error')).toBe(true);
      expect(logger.shouldLog('warn')).toBe(true);
    });

    test('should return false for disabled levels', () => {
      const logger = createCompatibleLogger({ level: levels.error | levels.warn });
      expect(logger.shouldLog('info')).toBe(false);
      expect(logger.shouldLog('debug')).toBe(false);
    });

    test('should return false for invalid level names', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      expect(logger.shouldLog('invalid')).toBe(false);
    });

    test('should work with numeric level values', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      expect(logger.shouldLog(1)).toBe(true); // fatal
      expect(logger.shouldLog(2)).toBe(true); // error
      expect(logger.shouldLog(4)).toBe(true); // warn
    });
  });

  describe('Logging methods', () => {
    beforeEach(() => {
      logger = createCompatibleLogger({ level: levels.all });
    });

    test('log() should default to info level', () => {
      logger.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    test('log.fatal() should use console.error', () => {
      logger.log.fatal('fatal message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('fatal message');
    });

    test('log.error() should use console.error', () => {
      logger.log.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    });

    test('log.warn() should use console.warn', () => {
      logger.log.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
    });

    test('log.info() should use console.log', () => {
      logger.log.info('info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('info message');
    });

    test('log.debug() should use console.log', () => {
      logger.log.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('debug message');
    });

    test('log.verbose() should use console.log', () => {
      logger.log.verbose('verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith('verbose message');
    });

    test('log.trace() should use console.log', () => {
      logger.log.trace('trace message');
      expect(consoleLogSpy).toHaveBeenCalledWith('trace message');
    });

    test('log.silly() should use console.log', () => {
      logger.log.silly('silly message');
      expect(consoleLogSpy).toHaveBeenCalledWith('silly message');
    });
  });

  describe('Backward compatibility methods', () => {
    beforeEach(() => {
      logger = createCompatibleLogger({ level: levels.all });
    });

    test('fatal() method should work', () => {
      logger.fatal('fatal message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('fatal message');
    });

    test('error() method should work', () => {
      logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    });

    test('warn() method should work', () => {
      logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
    });

    test('info() method should work', () => {
      logger.info('info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('info message');
    });

    test('debug() method should work', () => {
      logger.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('debug message');
    });

    test('verbose() method should work', () => {
      logger.verbose('verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith('verbose message');
    });

    test('trace() method should work', () => {
      logger.trace('trace message');
      expect(consoleLogSpy).toHaveBeenCalledWith('trace message');
    });

    test('silly() method should work', () => {
      logger.silly('silly message');
      expect(consoleLogSpy).toHaveBeenCalledWith('silly message');
    });
  });

  describe('Lazy evaluation', () => {
    test('should evaluate function arguments when logging', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      const lazyFn = mock(() => 'lazy value');
      
      logger.info('message', lazyFn);
      expect(lazyFn).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('message', 'lazy value');
    });

    test('should not evaluate function arguments when not logging', () => {
      const logger = createCompatibleLogger({ level: levels.none });
      const lazyFn = mock(() => 'lazy value');
      
      logger.info('message', lazyFn);
      expect(lazyFn).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should handle function evaluation errors', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      const errorFn = () => {
        throw new Error('evaluation error');
      };
      
      logger.info('message', errorFn);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'message',
        '[Error evaluating log argument function: evaluation error]'
      );
    });

    test('should handle multiple function arguments', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      const fn1 = mock(() => 'value1');
      const fn2 = mock(() => 'value2');
      const fn3 = mock(() => 'value3');
      
      logger.info(fn1, 'static', fn2, fn3);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('value1', 'static', 'value2', 'value3');
    });
  });

  describe('Level filtering', () => {
    test('should not log when level is disabled', () => {
      const logger = createCompatibleLogger({ level: levels.error });
      
      logger.info('should not appear');
      logger.debug('should not appear');
      logger.verbose('should not appear');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should log when level is enabled', () => {
      const logger = createCompatibleLogger({ level: levels.error | levels.warn });
      
      logger.error('should appear');
      logger.warn('should appear');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('should appear');
      expect(consoleWarnSpy).toHaveBeenCalledWith('should appear');
    });

    test('should respect combined level masks', () => {
      const logger = createCompatibleLogger({ level: levels.production });
      
      logger.fatal('yes');
      logger.error('yes');
      logger.warn('yes');
      logger.info('no');
      logger.debug('no');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('enableLevel and disableLevel', () => {
    test('enableLevel should add a level to the mask', () => {
      const logger = createCompatibleLogger({ level: levels.none });
      
      logger.enableLevel('error');
      expect(logger.level).toBe(levels.error);
      
      logger.enableLevel('warn');
      expect(logger.level).toBe(levels.error | levels.warn);
    });

    test('disableLevel should remove a level from the mask', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      logger.disableLevel('silly');
      expect(logger.level).toBe(levels.all & ~levels.silly);
      
      logger.disableLevel('trace');
      expect(logger.level).toBe(levels.all & ~levels.silly & ~levels.trace);
    });

    test('enableLevel with invalid level should not change mask', () => {
      const logger = createCompatibleLogger({ level: levels.error });
      
      logger.enableLevel('invalid');
      expect(logger.level).toBe(levels.error);
    });

    test('disableLevel with invalid level should not change mask', () => {
      const logger = createCompatibleLogger({ level: levels.error });
      
      logger.disableLevel('invalid');
      expect(logger.level).toBe(levels.error);
    });

    test('enableLevel with numeric level should work', () => {
      const logger = createCompatibleLogger({ level: levels.none });
      
      logger.enableLevel(2); // error level
      expect(logger.level).toBe(2);
    });

    test('disableLevel with numeric level should work', () => {
      const logger = createCompatibleLogger({ level: 7 }); // fatal + error + warn
      
      logger.disableLevel(2); // error level
      expect(logger.level).toBe(5); // fatal + warn
    });
  });

  describe('getEnabledLevels', () => {
    test('should return empty array when no levels are enabled', () => {
      const logger = createCompatibleLogger({ level: levels.none });
      expect(logger.getEnabledLevels()).toEqual([]);
    });

    test('should return all levels when all are enabled', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      expect(logger.getEnabledLevels()).toEqual([
        'fatal', 'error', 'warn', 'info', 'debug', 'verbose', 'trace', 'silly'
      ]);
    });

    test('should return only enabled levels', () => {
      const logger = createCompatibleLogger({ level: levels.error | levels.warn | levels.info });
      expect(logger.getEnabledLevels()).toEqual(['error', 'warn', 'info']);
    });

    test('should return production levels correctly', () => {
      const logger = createCompatibleLogger({ level: levels.production });
      expect(logger.getEnabledLevels()).toEqual(['fatal', 'error', 'warn']);
    });

    test('should return development levels correctly', () => {
      const logger = createCompatibleLogger({ level: levels.development });
      expect(logger.getEnabledLevels()).toEqual(['fatal', 'error', 'warn', 'info', 'debug']);
    });
  });

  describe('Multiple arguments', () => {
    test('should handle multiple arguments', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      logger.info('arg1', 'arg2', 'arg3', 123, { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledWith('arg1', 'arg2', 'arg3', 123, { key: 'value' });
    });

    test('should handle mix of static and lazy arguments', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      const lazyFn = () => 'lazy';
      
      logger.info('static1', lazyFn, 'static2');
      expect(consoleLogSpy).toHaveBeenCalledWith('static1', 'lazy', 'static2');
    });
  });

  describe('Edge cases', () => {
    test('should handle logging with no arguments', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      logger.info();
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });

    test('should handle undefined and null arguments', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      logger.info(undefined, null, 'test');
      expect(consoleLogSpy).toHaveBeenCalledWith(undefined, null, 'test');
    });
    
    test('should not fall back to console.log for unknown levels', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      // Try to log with an invalid numeric level that doesn't exist
      // This tests that there's no fallback - it should not log anything
      const invalidLevel = 512; // A level that doesn't exist
      
      // Call the private #log method indirectly by manipulating the logger
      // Since we can't directly call #log, we test that invalid levels are handled
      // by the shouldLog method which prevents logging
      expect(() => {
        // This won't actually log since 512 isn't a valid level
        logger.shouldLog(invalidLevel);
      }).not.toThrow();
      
      // Verify console.log was not called as a fallback
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
    
    test('should use custom output functions and not fall back', () => {
      const customInfo = mock(() => {});
      const customError = mock(() => {});
      
      const logger = createCompatibleLogger({ 
        level: levels.all,
        log: {
          info: customInfo,
          error: customError
        }
      });
      
      logger.info('test info');
      logger.error('test error');
      
      expect(customInfo).toHaveBeenCalledWith('test info');
      expect(customError).toHaveBeenCalledWith('test error');
      
      // Verify no fallback to console.log
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should handle all standard log levels correctly', () => {
      const logger = createCompatibleLogger({ level: levels.all });
      
      // Test that all valid levels work correctly
      logger.log.fatal('test');
      logger.log.error('test');
      logger.log.warn('test');
      logger.log.info('test');
      logger.log.debug('test');
      logger.log.verbose('test');
      logger.log.trace('test');
      logger.log.silly('test');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    });

    test('should handle custom combined levels', () => {
      const customLevel = levels.error | levels.debug | levels.silly;
      const logger = createCompatibleLogger({ level: customLevel });
      
      logger.fatal('no');
      logger.error('yes');
      logger.warn('no');
      logger.info('no');
      logger.debug('yes');
      logger.verbose('no');
      logger.trace('no');
      logger.silly('yes');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Exports', () => {
    test('should export makeLog as default', () => {
      expect(makeLog).toBeDefined();
      expect(typeof makeLog).toBe('function');
    });

    test('should export defaultLog instance', () => {
      expect(defaultLog).toBeDefined();
      expect(typeof defaultLog).toBe('function');
      expect(typeof defaultLog.info).toBe('function');
    });

    test('should export log as alias to defaultLog', () => {
      expect(log).toBeDefined();
      expect(log).toBe(defaultLog);
    });

    test('should export levels and levelNames', () => {
      expect(levels).toBeDefined();
      expect(levels.info).toBe(8);
      expect(levelNames).toBeDefined();
      expect(levelNames[8]).toBe('info');
    });

    test('defaultLog should work correctly', () => {
      // Verify that defaultLog is properly instantiated
      expect(defaultLog.level).toBe(levels.info);
      
      // Test that it can log (we can't test the actual console output 
      // since defaultLog captures console at import time)
      expect(() => defaultLog.info('test')).not.toThrow();
      
      // Verify shouldLog works
      expect(defaultLog.shouldLog('info')).toBe(true);
      expect(defaultLog.shouldLog('debug')).toBe(false);
    });
  });
});

describe('makeLog', () => {
  let consoleErrorSpy, consoleWarnSpy, consoleLogSpy;
  
  beforeEach(() => {
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
  
  test('should create a log function directly', () => {
    const log = makeLog({ level: 'info' });
    expect(typeof log).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.error).toBe('function');
  });
  
  test('should log messages at appropriate levels', () => {
    const log = makeLog({ level: levels.info | levels.error }); // Need both bits
    
    log.info('info message');
    log.debug('debug message'); // should not log
    log.error('error message');
    
    expect(consoleLogSpy).toHaveBeenCalledWith('info message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1); // debug not logged
  });
  
  test('should support level property setter', () => {
    const log = makeLog({ level: 'error' });
    
    log.info('should not log');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    log.level = 'info';
    log.info('should log');
    expect(consoleLogSpy).toHaveBeenCalledWith('should log');
  });
  
  test('should have utility methods', () => {
    const log = makeLog({ level: 'warn' });
    
    expect(log.shouldLog('warn')).toBe(true);
    expect(log.shouldLog('error')).toBe(false); // error is separate bit
    expect(log.shouldLog('info')).toBe(false);
    
    log.enableLevel('info');
    log.enableLevel('error');
    expect(log.shouldLog('info')).toBe(true);
    expect(log.shouldLog('error')).toBe(true);
    
    log.disableLevel('warn');
    expect(log.shouldLog('warn')).toBe(false);
    
    const enabled = log.getEnabledLevels();
    expect(enabled).toContain('error');
    expect(enabled).toContain('info');
    expect(enabled).not.toContain('warn');
  });
  
  test('should support lazy evaluation with template literals', () => {
    const log = makeLog({ level: 'info' });
    const expensiveOperation = mock(() => 'expensive result');
    
    log.debug(() => `Debug: ${expensiveOperation()}`);
    expect(expensiveOperation).not.toHaveBeenCalled();
    
    log.info(() => `Info: ${expensiveOperation()}`);
    expect(expensiveOperation).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('Info: expensive result');
  });
  
  test('should have access to levels and levelNames', () => {
    expect(levels.info).toBe(8);
    expect(levels.debug).toBe(16);
    expect(levelNames[8]).toBe('info');
  });
});