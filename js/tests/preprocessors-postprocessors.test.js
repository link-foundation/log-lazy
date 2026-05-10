/* eslint-env node */
/* global describe, test, expect, beforeEach, afterEach, jest */

import makeLog, { postprocessors, preprocessors } from '../src/index.js';

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

describe('preprocessors', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('applies custom preprocessors with a single options argument', () => {
    const addPrefix = mock(({ args, level, levelName }) => [
      `[${levelName}:${level}]`,
      ...args
    ]);
    const log = makeLog({
      level: 'info',
      preprocessors: [addPrefix]
    });

    log.info('message');

    expect(addPrefix).toHaveBeenCalledWith({
      args: ['message'],
      level: 8,
      levelName: 'info'
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('[info:8]', 'message');
  });

  test('applies multiple preprocessors before lazy argument evaluation', () => {
    let evaluated = false;
    const log = makeLog({
      level: 'info',
      preprocessors: [
        ({ args }) => ['prefix', ...args],
        ({ args }) => [...args, 'suffix']
      ]
    });

    log(() => {
      evaluated = true;
      return 'computed';
    });

    expect(evaluated).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('prefix', 'computed', 'suffix');
  });

  test('does not run preprocessors when level is disabled', () => {
    const preprocessor = mock(({ args }) => args);
    const log = makeLog({
      level: 'error',
      preprocessors: [preprocessor]
    });

    log.debug('hidden');

    expect(preprocessor).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('supports built-in addContext, filter, and map helpers', () => {
    const log = makeLog({
      level: 'info',
      preprocessors: [
        preprocessors.addContext({
          context: { requestId: 'req-1' }
        }),
        preprocessors.filter({
          predicate: ({ arg }) => typeof arg !== 'number'
        }),
        preprocessors.map({
          transform: ({ arg }) => typeof arg === 'string' ? arg.toUpperCase() : arg
        })
      ]
    });

    log('message', 42);

    expect(consoleLogSpy).toHaveBeenCalledWith('MESSAGE', {
      requestId: 'req-1'
    });
  });

  test('can add context at the beginning of the argument list', () => {
    const log = makeLog({
      level: 'info',
      preprocessors: [
        preprocessors.addContext({
          context: '[ctx]',
          position: 'start'
        })
      ]
    });

    log('message');

    expect(consoleLogSpy).toHaveBeenCalledWith('[ctx]', 'message');
  });
});

describe('postprocessors', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('applies custom postprocessors with a single options argument', () => {
    const addLevel = mock(({ message, level, levelName }) => {
      return `[${levelName}:${level}] ${message}`;
    });
    const log = makeLog({
      level: 'info',
      postprocessors: [addLevel]
    });

    log.info('message');

    expect(addLevel).toHaveBeenCalledWith({
      message: 'message',
      level: 8,
      levelName: 'info'
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('[info:8] message');
  });

  test('compiles arguments before applying postprocessors', () => {
    const log = makeLog({
      level: 'info',
      postprocessors: [
        ({ message }) => `compiled: ${message}`
      ]
    });

    log('text', { key: 'value' });

    expect(consoleLogSpy).toHaveBeenCalledWith('compiled: text {"key":"value"}');
  });

  test('applies postprocessors in sequence', () => {
    const log = makeLog({
      level: 'info',
      postprocessors: [
        ({ message }) => `[${message}]`,
        ({ message }) => `>> ${message} <<`
      ]
    });

    log('message');

    expect(consoleLogSpy).toHaveBeenCalledWith('>> [message] <<');
  });

  test('does not run postprocessors when level is disabled', () => {
    const postprocessor = mock(({ message }) => message);
    const log = makeLog({
      level: 'error',
      postprocessors: [postprocessor]
    });

    log.debug('hidden');

    expect(postprocessor).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('supports built-in timestamp, level, prefix, suffix, and pid helpers', () => {
    const log = makeLog({
      level: 'info',
      postprocessors: [
        postprocessors.level(),
        postprocessors.timestamp({
          format: 'iso',
          now: () => new Date('2026-05-10T12:00:00.000Z')
        }),
        postprocessors.pid({
          getPid: () => 123
        }),
        postprocessors.prefix({
          text: '[app]'
        }),
        postprocessors.suffix({
          text: '(done)'
        })
      ]
    });

    log.info('message');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[app] [PID:123] [2026-05-10T12:00:00.000Z] [INFO] message (done)'
    );
  });

  test('routes postprocessed error messages to error sink', () => {
    const log = makeLog({
      level: 'all',
      postprocessors: [postprocessors.level()]
    });

    log.error('failed');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] failed');
  });
});

describe('processor pipeline', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('combines preprocessors and postprocessors', () => {
    const log = makeLog({
      level: 'info',
      preprocessors: [
        ({ args }) => ['pre', ...args]
      ],
      postprocessors: [
        ({ message }) => `post ${message}`
      ]
    });

    log('message');

    expect(consoleLogSpy).toHaveBeenCalledWith('post pre message');
  });

  test('keeps the original argument fast path when processors are not configured', () => {
    const log = makeLog({ level: 'info' });
    const payload = { ok: true };

    log('message', payload);

    expect(consoleLogSpy).toHaveBeenCalledWith('message', payload);
  });

  test('does not evaluate lazy arguments when the level is disabled', () => {
    let evaluated = false;
    const log = makeLog({
      level: 'error',
      preprocessors: [({ args }) => args],
      postprocessors: [({ message }) => message]
    });

    log.debug(() => {
      evaluated = true;
      return 'hidden';
    });

    expect(evaluated).toBe(false);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
