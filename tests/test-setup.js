// Runtime-agnostic test setup
const isBun = typeof Bun !== 'undefined';
const isDeno = typeof Deno !== 'undefined';
const _isNode = !isBun && !isDeno;

let describe, test, expect, beforeEach, afterEach, mock, spyOn;

if (isBun) {
  // Use Bun's built-in test framework
  const bunTest = await import('bun:test');
  describe = bunTest.describe;
  test = bunTest.test;
  expect = bunTest.expect;
  beforeEach = bunTest.beforeEach;
  afterEach = bunTest.afterEach;
  mock = bunTest.mock;
  spyOn = bunTest.spyOn;
} else if (isDeno) {
  // Use Deno's built-in test framework with compatibility layer
  const { test: denoTest } = Deno;
  
  describe = (name, fn) => {
    // Deno doesn't have describe, so we simulate it
    console.log(`\n${name}`);
    fn();
  };
  
  test = (name, fn) => {
    denoTest(name, fn);
  };
  
  // Basic expect implementation for Deno
  expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected ${actual} to be undefined`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toHaveBeenCalled: () => {
      if (!actual.calls || actual.calls.length === 0) {
        throw new Error(`Expected function to have been called`);
      }
    },
    toHaveBeenCalledWith: (...args) => {
      if (!actual.calls || !actual.calls.some(call => 
        JSON.stringify(call) === JSON.stringify(args))) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
      }
    },
    not: {
      toHaveBeenCalled: () => {
        if (actual.calls && actual.calls.length > 0) {
          throw new Error(`Expected function not to have been called`);
        }
      }
    }
  });
  
  beforeEach = () => {}; // No-op for Deno
  afterEach = () => {}; // No-op for Deno
  
  mock = () => {
    const fn = (...args) => {
      fn.calls.push(args);
      return fn.returnValue;
    };
    fn.calls = [];
    fn.mockRestore = () => {
      fn.calls = [];
    };
    return fn;
  };
  
  spyOn = (obj, method) => {
    const original = obj[method];
    const spy = mock();
    obj[method] = spy;
    spy.mockRestore = () => {
      obj[method] = original;
      spy.calls = [];
    };
    return spy;
  };
} else {
  // Node.js - use a simple test runner
  const tests = [];
  const suites = [];
  let currentSuite = null;
  let beforeEachFn = null;
  let afterEachFn = null;
  
  describe = (name, fn) => {
    const suite = { name, tests: [], beforeEach: null, afterEach: null };
    const previousSuite = currentSuite;
    currentSuite = suite;
    suites.push(suite);
    
    const prevBeforeEach = beforeEachFn;
    const prevAfterEach = afterEachFn;
    
    fn();
    
    suite.beforeEach = beforeEachFn;
    suite.afterEach = afterEachFn;
    
    currentSuite = previousSuite;
    beforeEachFn = prevBeforeEach;
    afterEachFn = prevAfterEach;
  };
  
  test = (name, fn) => {
    if (currentSuite) {
      currentSuite.tests.push({ name, fn });
    } else {
      tests.push({ name, fn });
    }
  };
  
  expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected ${actual} to be undefined`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toHaveBeenCalled: () => {
      if (!actual.calls || actual.calls.length === 0) {
        throw new Error(`Expected function to have been called`);
      }
    },
    toHaveBeenCalledWith: (...args) => {
      if (!actual.calls || !actual.calls.some(call => 
        JSON.stringify(call) === JSON.stringify(args))) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
      }
    },
    not: {
      toHaveBeenCalled: () => {
        if (actual.calls && actual.calls.length > 0) {
          throw new Error(`Expected function not to have been called`);
        }
      }
    }
  });
  
  beforeEach = (fn) => {
    beforeEachFn = fn;
  };
  
  afterEach = (fn) => {
    afterEachFn = fn;
  };
  
  mock = () => {
    const fn = (...args) => {
      fn.calls.push(args);
      return fn.returnValue;
    };
    fn.calls = [];
    fn.mockRestore = () => {
      fn.calls = [];
    };
    return fn;
  };
  
  spyOn = (obj, method) => {
    const original = obj[method];
    const spy = mock();
    obj[method] = spy;
    spy.mockRestore = () => {
      obj[method] = original;
      spy.calls = [];
    };
    return spy;
  };
  
  // Run tests after all are registered
  process.nextTick(async () => {
    let passed = 0;
    let failed = 0;
    
    // Run suite tests
    for (const suite of suites) {
      console.log(`\n${suite.name}`);
      for (const { name, fn } of suite.tests) {
        try {
          if (suite.beforeEach) await suite.beforeEach();
          await fn();
          if (suite.afterEach) await suite.afterEach();
          console.log(`  ✓ ${name}`);
          passed++;
        } catch (_error) {
          console.log(`  ✗ ${name}`);
          failed++;
        }
      }
    }
    
    // Run standalone tests
    if (tests.length > 0) {
      console.log('\nStandalone tests');
      for (const { name, fn } of tests) {
        try {
          await fn();
          console.log(`  ✓ ${name}`);
          passed++;
        } catch (_error) {
          console.log(`  ✗ ${name}`);
          failed++;
        }
      }
    }
    
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}

export { describe, test, expect, beforeEach, afterEach, mock, spyOn };