// Test with imports in different order
console.log('[reorder-import] Start');

// Import other modules first
import makeLog from '../src/index.js';

console.log('[reorder-import] makeLog imported');

// Now do the conditional import using helper
import { getTestModule } from './test-import-helper.js';
const testModule = await getTestModule();

console.log('[reorder-import] testModule imported');

const { describe, test, expect } = testModule;

console.log('[reorder-import] typeof describe:', typeof describe);

describe('Reorder Import Test', () => {
  test('should work with reordered imports', () => {
    const log = makeLog();
    expect(typeof log).toBe('function');
  });
});

console.log('[reorder-import] End');