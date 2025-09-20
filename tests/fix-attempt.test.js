// Use Bun's test framework when available, fallback to cross-runtime setup
console.log('[fix-attempt] Starting test file');
console.log('[fix-attempt] About to import test-import-helper');

import { getTestModule } from './test-import-helper.js';

console.log('[fix-attempt] About to call getTestModule');
const testModule = await getTestModule();
console.log('[fix-attempt] Got testModule, keys:', Object.keys(testModule).slice(0, 5));

const { describe, test, expect } = testModule;
console.log('[fix-attempt] Extracted functions, typeof describe:', typeof describe);

describe('Fix Attempt Test', () => {
  console.log('[fix-attempt] Inside describe callback');
  test('should work', () => {
    console.log('[fix-attempt] Inside test callback');
    expect(1).toBe(1);
    console.log('[fix-attempt] Test passed');
  });
});

console.log('[fix-attempt] Test file complete');