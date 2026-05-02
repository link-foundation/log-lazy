import { describe, expect, getRuntime, test } from './test-setup.js';

describe('CI Test', () => {
  test('should register through the shared test runner', () => {
    expect(['bun', 'deno', 'node']).toContain(getRuntime());
    expect(1 + 1).toBe(2);
  });
});
