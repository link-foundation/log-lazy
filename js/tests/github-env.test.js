import { describe, expect, getRuntime, test } from './test-setup.js';

describe('GitHub Env Test', () => {
  test('works through test-anywhere', () => {
    expect(['bun', 'deno', 'node']).toContain(getRuntime());
    expect(1).toBe(1);
  });
});
