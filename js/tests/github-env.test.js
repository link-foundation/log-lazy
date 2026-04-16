// Check GitHub Actions environment
console.log('=== GitHub Actions Environment Check ===');
console.log('GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
console.log('CI:', process.env.CI);
console.log('RUNNER_OS:', process.env.RUNNER_OS);
console.log('RUNNER_ARCH:', process.env.RUNNER_ARCH);
console.log('NODE_VERSION:', process.env.NODE_VERSION);

// Check if we're actually running in Bun
console.log('\n=== Runtime Check ===');
console.log('process.argv[0]:', process.argv[0]);
console.log('Is Bun executable?', process.argv[0]?.includes('bun'));

// Check the actual command being run
console.log('\n=== Command Check ===');
console.log('process.argv:', process.argv);

// Try to detect what's really happening
if (typeof Bun !== 'undefined') {
  console.log('\n=== Bun is defined ===');
  console.log('Bun.version:', Bun.version);
  console.log('Bun.revision:', Bun.revision);
  
  // Try importing in different ways
  console.log('\n=== Import Tests ===');
  
  // Method 1: Direct string
  try {
    await import('bun:test');
    console.log('✓ Method 1: Direct string import works');
  } catch (e) {
    console.log('✗ Method 1 failed:', e.message);
  }
  
  // Method 2: Template literal
  try {
    const module = 'bun:test';
    await import(module);
    console.log('✓ Method 2: Variable import works');
  } catch (e) {
    console.log('✗ Method 2 failed:', e.message);
  }
  
  // Method 3: Check if it's a resolution issue
  try {
    const resolved = import.meta.resolve?.('bun:test');
    console.log('Resolved path:', resolved);
  } catch (e) {
    console.log('Resolution failed:', e.message);
  }
} else {
  console.log('\n=== Bun is NOT defined ===');
  console.log('This test file is not running under Bun!');
}

// Final test - see if we can actually use the module
try {
  const { describe, test, expect } = await import('bun:test');
  describe('GitHub Env Test', () => {
    test('works', () => {
      expect(1).toBe(1);
    });
  });
  console.log('\n✓ Test successfully registered');
} catch (e) {
  console.log('\n✗ Failed to register test:', e.message);
}