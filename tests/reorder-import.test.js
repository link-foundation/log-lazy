// Test with imports in different order
console.log('[reorder-import] Start');

// Import other modules first
import makeLog from '../src/index.js';

console.log('[reorder-import] makeLog imported');

// Now do the conditional import
const isBun = typeof Bun !== 'undefined';
console.log('[reorder-import] isBun:', isBun);

const testModule = isBun 
  ? await import('bun:test')
  : await import('./test-setup.js');

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