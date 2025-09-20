// Attempt to fix the import issue
console.log('[fix-attempt] Start');

// First, check environment
const isBun = typeof Bun !== 'undefined';
console.log('[fix-attempt] isBun:', isBun);

// Import with explicit error handling and fallback
let describe, test, expect, beforeEach, mock;

if (isBun) {
  console.log('[fix-attempt] Loading bun:test...');
  try {
    // Don't destructure immediately
    const bunTest = await import('bun:test');
    console.log('[fix-attempt] bunTest loaded, keys:', Object.keys(bunTest).slice(0, 5));
    
    // Assign one by one with checks
    describe = bunTest.describe;
    test = bunTest.test;
    expect = bunTest.expect;
    beforeEach = bunTest.beforeEach;
    mock = bunTest.mock;
    
    console.log('[fix-attempt] Functions assigned');
    console.log('[fix-attempt] typeof describe:', typeof describe);
  } catch (error) {
    console.error('[fix-attempt] ERROR:', error);
    console.error('[fix-attempt] Stack:', error.stack);
    
    // Provide dummy functions to see what happens
    describe = function(name, fn) {
      console.log('[fix-attempt] Dummy describe called:', name);
      fn();
    };
    test = function(name, fn) {
      console.log('[fix-attempt] Dummy test called:', name);
      fn();
    };
    expect = function(val) {
      return {
        toBe: function(expected) {
          if (val !== expected) {
            throw new Error(`Expected ${val} to be ${expected}`);
          }
        }
      };
    };
  }
} else {
  console.log('[fix-attempt] Loading test-setup.js...');
  const testSetup = await import('./test-setup.js');
  describe = testSetup.describe;
  test = testSetup.test;
  expect = testSetup.expect;
  beforeEach = testSetup.beforeEach;
  mock = testSetup.mock;
}

// Now try to use them
console.log('[fix-attempt] About to call describe');
describe('Fix Attempt Test', () => {
  console.log('[fix-attempt] Inside describe callback');
  
  test('should work', () => {
    console.log('[fix-attempt] Inside test callback');
    expect(1).toBe(1);
    console.log('[fix-attempt] Test assertion passed');
  });
});

console.log('[fix-attempt] End');