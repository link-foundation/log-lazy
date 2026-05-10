// Test with static import only - no dynamic imports in this file.
import { describe, expect, test } from './test-setup.js';

console.log('[static-import] File loaded');
console.log('[static-import] typeof describe:', typeof describe);

describe('Static Import Test', () => {
  test('should work with static imports', () => {
    expect(true).toBe(true);
  });
});

console.log('[static-import] Tests defined');
