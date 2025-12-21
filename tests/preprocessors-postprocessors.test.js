/* eslint-env node */
/* global describe, test, expect, beforeEach, afterEach, jest */

import makeLog, { postprocessors, preprocessors } from '../src/index.js';

// Runtime detection and setup
if (typeof Bun === 'undefined') {
  const testModule = await import('./test-setup.js');
  globalThis.describe = testModule.describe;
  globalThis.test = testModule.test;
  globalThis.expect = testModule.expect;
  globalThis.mock = testModule.mock;
  globalThis.spyOn = testModule.spyOn;
  globalThis.beforeEach = testModule.beforeEach;
  globalThis.afterEach = testModule.afterEach;
}

const mock = typeof Bun !== 'undefined' ? jest.fn : globalThis.mock;
const spyOn = typeof Bun !== 'undefined' ? jest.spyOn : globalThis.spyOn;

describe('Preprocessors', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('should apply single preprocessor to transform args', () => {
    const addPrefix = (args) => ['[PREFIX]', ...args];
    const log = makeLog({
      level: 'info',
      preprocessors: [addPrefix]
    });

    log('test message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[PREFIX]', 'test message');
  });

  test('should apply multiple preprocessors in sequence', () => {
    const addPrefix = (args) => ['[PREFIX]', ...args];
    const addSuffix = (args) => [...args, '[SUFFIX]'];
    const log = makeLog({
      level: 'info',
      preprocessors: [addPrefix, addSuffix]
    });

    log('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('[PREFIX]', 'test', '[SUFFIX]');
  });

  test('should pass level to preprocessor', () => {
    const levelTracker = mock((args, level) => {
      return [`level:${level}`, ...args];
    });
    const log = makeLog({
      level: 'all',
      preprocessors: [levelTracker]
    });

    log.info('test');
    expect(levelTracker).toHaveBeenCalledWith(['test'], 8); // info = 8
  });

  test('should work with lazy evaluation', () => {
    const addPrefix = (args) => ['[LAZY]', ...args];
    const log = makeLog({
      level: 'info',
      preprocessors: [addPrefix]
    });

    log(() => 'lazy message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[LAZY]', 'lazy message');
  });

  test('should have zero overhead when no preprocessors configured', () => {
    const log = makeLog({ level: 'info' });
    log('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('test');
  });

  describe('Built-in preprocessor helpers', () => {
    test('addContext should add context object', () => {
      const context = { userId: 123 };
      const log = makeLog({
        level: 'info',
        preprocessors: [preprocessors.addContext(context)]
      });

      log('message');
      expect(consoleLogSpy).toHaveBeenCalledWith('message', { userId: 123 });
    });

    test('filter should remove arguments based on predicate', () => {
      const log = makeLog({
        level: 'info',
        preprocessors: [preprocessors.filter(arg => typeof arg === 'string')]
      });

      log('keep', 123, 'this', { remove: true });
      expect(consoleLogSpy).toHaveBeenCalledWith('keep', 'this');
    });

    test('map should transform all arguments', () => {
      const log = makeLog({
        level: 'info',
        preprocessors: [preprocessors.map(arg => typeof arg === 'number' ? arg * 2 : arg)]
      });

      log(10, 'text', 20);
      expect(consoleLogSpy).toHaveBeenCalledWith(20, 'text', 40);
    });
  });
});

describe('Postprocessors', () => {
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should apply single postprocessor to transform compiled message', () => {
    const addBrackets = (message) => `[${message}]`;
    const log = makeLog({
      level: 'info',
      postprocessors: [addBrackets]
    });

    log('test message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[test message]');
  });

  test('should apply multiple postprocessors in sequence', () => {
    const addBrackets = (message) => `[${message}]`;
    const addArrows = (message) => `>> ${message} <<`;
    const log = makeLog({
      level: 'info',
      postprocessors: [addBrackets, addArrows]
    });

    log('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('>> [test] <<');
  });

  test('should pass level and levelName to postprocessor', () => {
    const levelTracker = mock((message, level, levelName) => {
      return `[${levelName}:${level}] ${message}`;
    });
    const log = makeLog({
      level: 'all',
      postprocessors: [levelTracker]
    });

    log.info('test');
    expect(levelTracker).toHaveBeenCalledWith('test', 8, 'info');
    expect(consoleLogSpy).toHaveBeenCalledWith('[info:8] test');
  });

  test('should compile multiple args into string before postprocessing', () => {
    const addPrefix = (message) => `PREFIX: ${message}`;
    const log = makeLog({
      level: 'info',
      postprocessors: [addPrefix]
    });

    log('arg1', 'arg2', 'arg3');
    expect(consoleLogSpy).toHaveBeenCalledWith('PREFIX: arg1 arg2 arg3');
  });

  test('should stringify objects in compilation', () => {
    const addPrefix = (message) => `>> ${message}`;
    const log = makeLog({
      level: 'info',
      postprocessors: [addPrefix]
    });

    log('text', { key: 'value' });
    expect(consoleLogSpy).toHaveBeenCalledWith('>> text {"key":"value"}');
  });

  test('should work with lazy evaluation', () => {
    const addPrefix = (message) => `LAZY: ${message}`;
    const log = makeLog({
      level: 'info',
      postprocessors: [addPrefix]
    });

    log(() => 'lazy message');
    expect(consoleLogSpy).toHaveBeenCalledWith('LAZY: lazy message');
  });

  test('should have zero overhead when no postprocessors configured', () => {
    const log = makeLog({ level: 'info' });
    log('test', { obj: true });
    expect(consoleLogSpy).toHaveBeenCalledWith('test', { obj: true });
  });

  describe('Built-in postprocessor helpers', () => {
    test('timestamp should add ISO timestamp by default', () => {
      const log = makeLog({
        level: 'info',
        postprocessors: [postprocessors.timestamp()]
      });

      log('message');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] message$/);
    });

    test('timestamp should support different formats', () => {
      const logMs = makeLog({
        level: 'info',
        postprocessors: [postprocessors.timestamp('ms')]
      });

      logMs('test');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toMatch(/^\[\d+\] test$/);
    });

    test('level should add log level prefix', () => {
      const log = makeLog({
        level: 'all',
        postprocessors: [postprocessors.level()]
      });

      log.info('info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] info message');

      log.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });

    test('pid should add process ID', () => {
      const log = makeLog({
        level: 'info',
        postprocessors: [postprocessors.pid()]
      });

      log('message');
      const call = consoleLogSpy.mock.calls[0][0];
      if (typeof process !== 'undefined' && process.pid) {
        expect(call).toMatch(/^\[PID:\d+\] message$/);
      } else {
        expect(call).toBe('[PID:unknown] message');
      }
    });

    test('prefix should add custom prefix', () => {
      const log = makeLog({
        level: 'info',
        postprocessors: [postprocessors.prefix('[MyApp]')]
      });

      log('message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MyApp] message');
    });

    test('suffix should add custom suffix', () => {
      const log = makeLog({
        level: 'info',
        postprocessors: [postprocessors.suffix('(end)')]
      });

      log('message');
      expect(consoleLogSpy).toHaveBeenCalledWith('message (end)');
    });

    test('should combine multiple built-in postprocessors', () => {
      const log = makeLog({
        level: 'info',
        postprocessors: [
          postprocessors.level(),
          postprocessors.prefix('[App]')
        ]
      });

      log.info('message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[App] [INFO] message');
    });
  });
});

describe('Preprocessors and Postprocessors combined', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('should apply both preprocessors and postprocessors', () => {
    const addArgPrefix = (args) => ['PRE:', ...args];
    const addMsgPrefix = (message) => `POST: ${message}`;
    const log = makeLog({
      level: 'info',
      preprocessors: [addArgPrefix],
      postprocessors: [addMsgPrefix]
    });

    log('test');
    expect(consoleLogSpy).toHaveBeenCalledWith('POST: PRE: test');
  });

  test('should maintain lazy evaluation with both processor types', () => {
    let evaluationCount = 0;
    const lazyFn = () => {
      evaluationCount++;
      return 'computed';
    };

    const addContext = (args) => ['context:', ...args];
    const addTimestamp = (message) => `[TS] ${message}`;

    const log = makeLog({
      level: 'info',
      preprocessors: [addContext],
      postprocessors: [addTimestamp]
    });

    log(lazyFn);
    expect(evaluationCount).toBe(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('[TS] context: computed');
  });

  test('should not evaluate lazy function when log level is disabled', () => {
    let evaluationCount = 0;
    const lazyFn = () => {
      evaluationCount++;
      return 'should not compute';
    };

    const log = makeLog({
      level: 'error',
      preprocessors: [(args) => args],
      postprocessors: [(msg) => msg]
    });

    log.debug(lazyFn);
    expect(evaluationCount).toBe(0);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});

describe('Performance and zero overhead', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('should not have processor overhead when none configured', () => {
    const log = makeLog({ level: 'info' });

    log('test', { key: 'value' });

    // With no postprocessors, original args should be passed directly
    expect(consoleLogSpy).toHaveBeenCalledWith('test', { key: 'value' });
  });

  test('preprocessors should not run when log level is disabled', () => {
    const preprocessorMock = mock((args) => args);
    const log = makeLog({
      level: 'error',
      preprocessors: [preprocessorMock]
    });

    log.debug('should not process');
    expect(preprocessorMock).not.toHaveBeenCalled();
  });

  test('postprocessors should not run when log level is disabled', () => {
    const postprocessorMock = mock((msg) => msg);
    const log = makeLog({
      level: 'error',
      postprocessors: [postprocessorMock]
    });

    log.debug('should not process');
    expect(postprocessorMock).not.toHaveBeenCalled();
  });
});
