// Helper to import test utilities in a cross-runtime compatible way
// This handles the Ubuntu CI issue where bun:test sometimes returns {default: ...}
export async function getTestModule() {
  const isBun = typeof Bun !== 'undefined';
  const caller = new Error().stack?.split('\n')[2] || 'unknown';
  
  console.log(`[test-import-helper] Called from: ${caller.trim()}`);
  console.log(`[test-import-helper] isBun: ${isBun}`);
  console.log(`[test-import-helper] Platform: ${process?.platform}`);
  console.log(`[test-import-helper] CI: ${process?.env?.CI}`);
  console.log(`[test-import-helper] GITHUB_ACTIONS: ${process?.env?.GITHUB_ACTIONS}`);
  
  if (isBun) {
    console.log('[test-import-helper] Importing bun:test...');
    const bunTest = await import('bun:test');
    console.log('[test-import-helper] bunTest keys:', Object.keys(bunTest));
    
    // Check if we got named exports or if they're wrapped in default
    if (bunTest.describe) {
      console.log('[test-import-helper] Using named exports from bun:test');
      console.log('[test-import-helper] typeof describe:', typeof bunTest.describe);
      console.log('[test-import-helper] typeof test:', typeof bunTest.test);
      console.log('[test-import-helper] typeof expect:', typeof bunTest.expect);
      // Named exports are available directly
      return bunTest;
    } else if (bunTest.default && bunTest.default.describe) {
      console.log('[test-import-helper] Using default export from bun:test');
      console.log('[test-import-helper] default keys:', Object.keys(bunTest.default));
      console.log('[test-import-helper] typeof describe:', typeof bunTest.default.describe);
      // Exports are wrapped in default (this happens in Ubuntu CI sometimes)
      return bunTest.default;
    } else {
      console.log('[test-import-helper] WARNING: Could not find describe in bun:test');
      console.log('[test-import-helper] bunTest structure:', JSON.stringify(Object.keys(bunTest)));
      if (bunTest.default) {
        console.log('[test-import-helper] default structure:', JSON.stringify(Object.keys(bunTest.default)));
      }
      // Fallback to test-setup if we can't get proper exports
      console.log('[test-import-helper] Falling back to test-setup.js');
      return await import('./test-setup.js');
    }
  } else {
    console.log('[test-import-helper] Not Bun, using test-setup.js');
    return await import('./test-setup.js');
  }
}
