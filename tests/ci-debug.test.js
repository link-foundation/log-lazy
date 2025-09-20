// Debug test to understand CI environment
console.log('=== CI Debug Info ===');
console.log('typeof Bun:', typeof Bun);
console.log('typeof global.Bun:', typeof global?.Bun);
console.log('process.versions:', process?.versions);

const isBun = typeof Bun !== 'undefined';
console.log('isBun:', isBun);

// Try importing bun:test directly
try {
  const bunTest = await import('bun:test');
  console.log('✓ bun:test imported successfully');
  console.log('Available exports:', Object.keys(bunTest));
  
  // Run a simple test
  const { describe, test, expect } = bunTest;
  
  describe('CI Debug', () => {
    test('should work', () => {
      expect(1).toBe(1);
    });
  });
} catch (error) {
  console.error('✗ Failed to import bun:test:', error.message);
  console.error('Stack:', error.stack);
}

console.log('=== End CI Debug ===');