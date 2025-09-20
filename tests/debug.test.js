import { describe, test, expect, mock } from 'bun:test';
import makeLog from '../src/index.js';

describe('Debug Integration', () => {
  test('should integrate with debug-style library', () => {
    // Mock debug-style function
    const mockDebug = mock((...args) => {});
    const mockDebugDB = mock((...args) => {});
    const mockDebugHTTP = mock((...args) => {});
    
    const log = makeLog({
      level: 'all',
      log: {
        fatal: (...args) => mockDebug('FATAL:', ...args),
        error: (...args) => mockDebug('ERROR:', ...args),
        warn: (...args) => mockDebug('WARN:', ...args),
        info: (...args) => mockDebug('INFO:', ...args),
        debug: (...args) => mockDebugDB(...args),
        verbose: (...args) => mockDebugHTTP(...args),
        trace: (...args) => mockDebug('TRACE:', ...args),
        silly: (...args) => mockDebug('SILLY:', ...args)
      }
    });
    
    // Test basic logging
    log.info('Test message');
    expect(mockDebug).toHaveBeenCalledWith('INFO:', 'Test message');
    
    // Test debug namespace
    log.debug('DB query');
    expect(mockDebugDB).toHaveBeenCalledWith('DB query');
    
    // Test verbose/HTTP namespace
    log.verbose('HTTP request');
    expect(mockDebugHTTP).toHaveBeenCalledWith('HTTP request');
  });
  
  test('should handle lazy evaluation', () => {
    const mockDebug = mock((...args) => {});
    
    const log = makeLog({
      level: 'all',
      log: {
        debug: (...args) => mockDebug(...args)
      }
    });
    
    const expensiveFunc = mock(() => 'expensive result');
    log.debug('Debug:', expensiveFunc);
    
    expect(expensiveFunc).toHaveBeenCalled();
    expect(mockDebug).toHaveBeenCalledWith('Debug:', 'expensive result');
  });
  
  test('lazy evaluation should not execute when disabled', () => {
    const mockDebug = mock((...args) => {});
    
    const log = makeLog({
      level: 'none', // Disable all logging
      log: {
        info: (...args) => mockDebug(...args)
      }
    });
    
    const expensiveFunc = mock(() => {
      return JSON.stringify({ data: 'expensive' });
    });
    
    // Should not evaluate function when logging is disabled
    log.info('Message:', expensiveFunc);
    expect(expensiveFunc).not.toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
  });
  
  test('should handle complex objects', () => {
    const mockDebug = mock((...args) => {});
    
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => mockDebug(...args)
      }
    });
    
    const complexData = {
      user: { id: 1, name: 'Test' },
      timestamp: Date.now()
    };
    
    log.info('Complex data:', () => complexData);
    expect(mockDebug).toHaveBeenCalled();
    expect(mockDebug.mock.calls[0][0]).toBe('Complex data:');
    expect(mockDebug.mock.calls[0][1]).toEqual(complexData);
  });
  
  test('should work with namespace simulation', () => {
    const namespaces = {
      'app': mock((...args) => {}),
      'app:db': mock((...args) => {}),
      'app:http': mock((...args) => {})
    };
    
    const log = makeLog({
      level: 'all',
      log: {
        info: (...args) => namespaces['app'](...args),
        debug: (...args) => namespaces['app:db'](...args),
        verbose: (...args) => namespaces['app:http'](...args)
      }
    });
    
    log.info('App message');
    expect(namespaces['app']).toHaveBeenCalledWith('App message');
    
    log.debug('DB message');
    expect(namespaces['app:db']).toHaveBeenCalledWith('DB message');
    
    log.verbose('HTTP message');
    expect(namespaces['app:http']).toHaveBeenCalledWith('HTTP message');
  });
});