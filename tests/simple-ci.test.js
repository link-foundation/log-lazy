// Simplest possible test to check CI
console.log('simple-ci.test.js: Starting');

const isBun = typeof Bun !== 'undefined';
console.log('simple-ci.test.js: isBun =', isBun);

// Try to import without await at top level
let testModule;
try {
  if (isBun) {
    console.log('simple-ci.test.js: Attempting to import bun:test');
    testModule = await import('bun:test');
    console.log('simple-ci.test.js: Import successful');
  } else {
    console.log('simple-ci.test.js: Attempting to import test-setup.js');
    testModule = await import('./test-setup.js');
  }
} catch (error) {
  console.error('simple-ci.test.js: Import failed:', error);
  throw error;
}

const { describe, test, expect } = testModule;

console.log('simple-ci.test.js: typeof describe =', typeof describe);

describe('Simple CI Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

console.log('simple-ci.test.js: Test defined');