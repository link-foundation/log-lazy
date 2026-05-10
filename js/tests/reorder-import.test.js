/* eslint-env node */

import { describe, expect, test } from './test-setup.js';
import makeLog from '../src/index.js';

describe('Reorder Import Test', () => {
  test('should work with reordered imports', () => {
    const log = makeLog();
    expect(typeof log).toBe('function');
  });
});
