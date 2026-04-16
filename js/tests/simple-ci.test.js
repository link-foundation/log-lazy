/* eslint-env node */
/* global describe, test, expect, jest */

// For Bun: test functions are globals - use them directly
// For Node/Deno: import from test-setup.js

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
const _mock = typeof Bun !== 'undefined' ? jest.fn : globalThis.mock;
const _spyOn = typeof Bun !== 'undefined' ? jest.spyOn : globalThis.spyOn;

describe('Simple CI Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});