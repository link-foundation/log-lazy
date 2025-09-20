// Test with imports in different order
// Import other modules first
import makeLog from '../src/index.js';

// Now do the conditional import using helper
import { getTestModule } from './test-import-helper.js';
const testModule = await getTestModule();
const { describe, test, expect } = testModule;

describe('Reorder Import Test', () => {
  test('should work with reordered imports', () => {
    const log = makeLog();
    expect(typeof log).toBe('function');
  });
});