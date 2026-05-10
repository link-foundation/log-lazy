/* eslint-env node */

import { describe, expect, test } from './test-setup.js';

describe('Simple CI Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});
