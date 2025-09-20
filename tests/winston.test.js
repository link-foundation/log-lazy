import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LazyLog } from '../src/index.js';
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
    const logger = new LazyLog({
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
    
    logger.info('Test message');
    expect(mockTransport.logMock).toHaveBeenCalled();
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.level).toBe('info');
    expect(logCall.message).toBe('Test message');
  });
  
  test('should handle Winston metadata with lazy evaluation', () => {
    const logger = new LazyLog({
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
    
    logger.info('User action', expensiveMetadata);
    
    expect(expensiveMetadata).toHaveBeenCalled();
    expect(mockTransport.logMock).toHaveBeenCalled();
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.message).toBe('User action');
  });
  
  test('lazy evaluation should prevent execution when disabled', () => {
    const logger = new LazyLog({
      level: 'error', // Only error level
      log: {
        error: (...args) => winstonLogger.error(...args),
        info: (...args) => winstonLogger.info(...args)
      }
    });
    
    const expensiveFunc = mock(() => 'expensive result');
    
    logger.info('Info message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(mockTransport.logMock).not.toHaveBeenCalled();
    
    logger.error('Error message:', expensiveFunc);
    expect(expensiveFunc).toHaveBeenCalled();
    expect(mockTransport.logMock).toHaveBeenCalled();
  });
  
  test('should map log levels correctly', () => {
    const logger = new LazyLog({
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
    
    logger.trace('Trace message');
    const traceCall = mockTransport.logMock.mock.calls[0][0];
    expect(traceCall.level).toBe('silly'); // Winston uses silly for trace
    
    logger.verbose('Verbose message');
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
    
    const logger = new LazyLog({
      level: 'all',
      log: {
        info: (...args) => formattedLogger.info(...args)
      }
    });
    
    logger.info('Formatted message');
    
    const logCall = mockTransport.logMock.mock.calls[0][0];
    expect(logCall.timestamp).toBeDefined();
    expect(logCall.message).toBe('Formatted message');
  });
});