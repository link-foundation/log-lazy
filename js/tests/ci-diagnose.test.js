// Comprehensive CI diagnostic test
console.log('=== CI DIAGNOSTIC START ===');
console.log('1. Environment:');
console.log('   - typeof Bun:', typeof Bun);
console.log('   - typeof process:', typeof process);
console.log('   - Node version:', process?.versions?.node);
console.log('   - Bun version:', process?.versions?.bun);
console.log('   - Platform:', process?.platform);
console.log('   - CWD:', process?.cwd?.());

console.log('\n2. Module system:');
console.log('   - import.meta.url:', import.meta.url);

console.log('\n3. Testing dynamic import:');

// Test 1: Can we import bun:test at all?
console.log('   Test 1: Direct import...');
try {
  const result = await import('bun:test');
  console.log('   ✓ Direct import successful');
  console.log('   - typeof result:', typeof result);
  console.log('   - keys:', Object.keys(result).slice(0, 5).join(', '), '...');
} catch (e) {
  console.log('   ✗ Direct import failed:', e.message);
  console.log('   - Error name:', e.name);
  console.log('   - Stack:', e.stack?.split('\n')[0]);
}

// Test 2: Test with variable
console.log('\n   Test 2: Variable import...');
const isBun = typeof Bun !== 'undefined';
console.log('   - isBun:', isBun);

if (isBun) {
  try {
    const testModule = await import('bun:test');
    console.log('   ✓ Variable import successful');
    console.log('   - Has describe?', 'describe' in testModule);
    console.log('   - typeof describe:', typeof testModule.describe);
  } catch (e) {
    console.log('   ✗ Variable import failed:', e.message);
  }
}

// Test 3: Try different import patterns
console.log('\n   Test 3: Different patterns...');

// Pattern A: Direct destructure
try {
  const { describe: descA } = await import('bun:test');
  console.log('   ✓ Pattern A (destructure): typeof describe =', typeof descA);
} catch (e) {
  console.log('   ✗ Pattern A failed:', e.message);
}

// Pattern B: Two-step
try {
  const mod = await import('bun:test');
  const descB = mod.describe;
  console.log('   ✓ Pattern B (two-step): typeof describe =', typeof descB);
} catch (e) {
  console.log('   ✗ Pattern B failed:', e.message);
}

// Test 4: Check file system
console.log('\n4. File system check:');
import { existsSync, readdirSync } from 'fs';
console.log('   - Current dir files:', readdirSync('.').filter(f => !f.startsWith('.')).slice(0, 5).join(', '));
console.log('   - Tests dir exists?', existsSync('tests'));
console.log('   - Package.json exists?', existsSync('package.json'));

// Test 5: Can we actually run a test?
console.log('\n5. Test execution:');
try {
  const { describe, test, expect } = await import('bun:test');
  
  describe('CI Test', () => {
    test('should work', () => {
      expect(1 + 1).toBe(2);
      console.log('      ✓ Test executed successfully');
    });
  });
  
  console.log('   ✓ Test registered');
} catch (e) {
  console.log('   ✗ Test registration failed:', e.message);
}

console.log('\n=== CI DIAGNOSTIC END ===\n');