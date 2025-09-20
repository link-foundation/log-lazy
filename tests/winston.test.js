// Use Bun's test framework when available, fallback to cross-runtime setup
const isBun = typeof Bun !== 'undefined';

let testModule;
try {
  testModule = isBun 
    ? await import('bun:test')
    : await import('./test-setup.js');
} catch (error) {
  console.error('winston.test.js: Failed to import test module');
  console.error('  - isBun:', isBun);
  console.error('  - Error:', error.message);
  console.error('  - Stack:', error.stack);
  throw error;
}

const { describe, test, expect, beforeEach, mock } = testModule;
import makeLog from '../src/index.js';
import winston from 'winston';
import Transport from 'winston-transport';

class MockTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.logs = [];
    this.logMock = mock((info, callback) => {
      this.logs.push(info);
      if (callback) callback();
    });
  }
  
  log(info, callback) {
    this.logMock(info, callback);
  }
}

describe('Winston Integration', () => {
  let winstonLogger;
  let mockTransport;
  
  beforeEach(() => {
    // Create a mock transport to capture logs
    mockTransport = new MockTransport();
    
    winstonLogger = winston.createLogger({
      level: 'silly',
      transports: [mockTransport]
    });
  });

  test('should integrate with Winston logger', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => winstonLogger.error('FATAL', ...args),
        error: (...args) => winstonLogger.error(...args),
        warn: (...args) => winstonLogger.warn(...args),
        info: (...args) => winstonLogger.info(...args),
        debug: (...args) => winstonLogger.debug(...args),
        verbose: (...args) => winstonLogger.verbose(...args),
        trace: (...args) => winstonLogger.silly(...args),
        silly: (...args) => winstonLogger.silly(...args)
      }
    });
    
    log.info('Test message');
    expect(mockTransport.logMock).toHaveBeenCalled();
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.level).toBe('info');
    expect(logCall.message).toBe('Test message');
  });
  
  test('should handle Winston metadata with lazy evaluation', () => {
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => {
          const [msg, ...metadata] = args;
          winstonLogger.info(msg, ...metadata);
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
    expect(mockTransport.logMock).toHaveBeenCalled();
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.message).toBe('User action');
  });
  
  test('lazy evaluation should prevent execution when disabled', () => {
    const log = makeLog({
      level: 'error', // Only error level
      log: {
        error: (...args) => winstonLogger.error(...args),
        info: (...args) => winstonLogger.info(...args)
      }
    });
    
    const expensiveFunc = mock(() => 'expensive result');
    
    log.info('Info message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(mockTransport.logMock).not.toHaveBeenCalled();
    
    log.error('Error message:', expensiveFunc);
    expect(expensiveFunc).toHaveBeenCalled();
    expect(mockTransport.logMock).toHaveBeenCalled();
  });
  
  test('should map log levels correctly', () => {
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => winstonLogger.error('FATAL:', ...args),
        error: (...args) => winstonLogger.error(...args),
        warn: (...args) => winstonLogger.warn(...args),
        info: (...args) => winstonLogger.info(...args),
        debug: (...args) => winstonLogger.debug(...args),
        verbose: (...args) => winstonLogger.verbose(...args),
        trace: (...args) => winstonLogger.silly(...args),
        silly: (...args) => winstonLogger.silly(...args)
      }
    });
    
    log.trace('Trace message');
    const traceCall = mockTransport.logMock.mock.calls[0][0];
    expect(traceCall.level).toBe('silly'); // Winston uses silly for trace
    
    log.verbose('Verbose message');
    const verboseCall = mockTransport.logMock.mock.calls[1][0];
    expect(verboseCall.level).toBe('verbose');
  });
  
  test('should work with Winston format options', () => {
    const formattedLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [mockTransport]
    });
    
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => formattedLogger.info(...args)
      }
    });
    
    log.info('Formatted message');
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.timestamp).toBeDefined();
    expect(logCall.message).toBe('Formatted message');
  });
});