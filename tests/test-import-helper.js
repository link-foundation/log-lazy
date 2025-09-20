// Helper to import test utilities in a cross-runtime compatible way
// This handles the Ubuntu CI issue where bun:test sometimes returns {default: ...}
export async function getTestModule() {
  const isBun = typeof Bun !== 'undefined';
  
  if (isBun) {
    const bunTest = await import('bun:test');
    
    // Check if we got named exports or if they're wrapped in default
    if (bunTest.describe) {
      // Named exports are available directly
      return bunTest;
    } else if (bunTest.default && bunTest.default.describe) {
      // Exports are wrapped in default (this happens in Ubuntu CI sometimes)
      return bunTest.default;
    } else {
      // Fallback to test-setup if we can't get proper exports
      return await import('./test-setup.js');
    }
  } else {
    return await import('./test-setup.js');
  }
}
