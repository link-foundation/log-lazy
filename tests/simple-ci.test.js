// Simplest possible test to check CI
import { getTestModule } from './test-import-helper.js';
const testModule = await getTestModule();
const { describe, test, expect } = testModule;

describe('Simple CI Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});