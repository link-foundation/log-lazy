// Simplest possible test to check CI
console.log('simple-ci.test.js: Starting');

import { getTestModule } from './test-import-helper.js';
console.log('simple-ci.test.js: Attempting to get test module');
const testModule = await getTestModule();
console.log('simple-ci.test.js: Test module loaded');

const { describe, test, expect } = testModule;

console.log('simple-ci.test.js: typeof describe =', typeof describe);

describe('Simple CI Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

console.log('simple-ci.test.js: Test defined');