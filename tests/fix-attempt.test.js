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
const mock = typeof Bun !== 'undefined' ? jest.fn : globalThis.mock;
const spyOn = typeof Bun !== 'undefined' ? jest.spyOn : globalThis.spyOn;

describe('Fix Attempt Test', () => {
  test('should work', () => {
    expect(1).toBe(1);
  });
});