// Runtime-agnostic test setup
// For Bun: Test files should use the globals directly (describe, test, expect, jest.fn, jest.spyOn)
// For Node/Deno: Import this module to get test utilities

const isBun = typeof Bun !== 'undefined';
const isDeno = typeof Deno !== 'undefined';

let describe, test, expect, beforeEach, afterEach, mock, spyOn;

if (isBun) {
  // In Bun test files, these are available as globals
  // We can't access them here, so we return dummy functions
  // Real Bun test files should use the globals directly
  describe = globalThis.describe || (() => { throw new Error('Use globals directly in Bun test files'); });
  test = globalThis.test || (() => { throw new Error('Use globals directly in Bun test files'); });
  expect = globalThis.expect || (() => { throw new Error('Use globals directly in Bun test files'); });
  beforeEach = globalThis.beforeEach || (() => { throw new Error('Use globals directly in Bun test files'); });
  afterEach = globalThis.afterEach || (() => { throw new Error('Use globals directly in Bun test files'); });
  mock = () => { throw new Error('Use jest.fn directly in Bun test files'); };
  spyOn = () => { throw new Error('Use jest.spyOn directly in Bun test files'); };
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
    toContain: (expected) => {
      if (typeof actual === 'string' && !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual) && !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
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
      if (!actual.calls || actual.calls.length === 0) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but it was never called`);
      }
      const found = actual.calls.some(call => {
        if (call.length !== args.length) return false;
        return call.every((arg, i) => JSON.stringify(arg) === JSON.stringify(args[i]));
      });
      if (!found) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but got: ${JSON.stringify(actual.calls)}`);
      }
    },
    not: {
      toHaveBeenCalled: () => {
        if (actual.calls && actual.calls.length > 0) {
          throw new Error(`Expected function not to have been called`);
        }
      },
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      }
    },
    toHaveProperty: (prop, value) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
      if (value !== undefined && actual[prop] !== value) {
        throw new Error(`Expected property ${prop} to be ${value}, but got ${actual[prop]}`);
      }
    },
    toThrow: () => {
      try {
        actual();
        throw new Error(`Expected function to throw`);
      } catch (e) {
        if (e.message === 'Expected function to throw') {
          throw e;
        }
      }
    }
  });
  
  beforeEach = () => {}; // No-op for Deno
  afterEach = () => {}; // No-op for Deno
  
  mock = (implementation) => {
    const fn = (...args) => {
      fn.calls.push(args);
      fn.mock.calls.push(args);
      if (implementation) {
        return implementation(...args);
      }
      return fn.returnValue;
    };
    fn.calls = [];
    fn.mock = { calls: [] };
    fn.mockRestore = () => {
      fn.calls = [];
      fn.mock.calls = [];
    };
    return fn;
  };
  
  spyOn = (obj, method) => {
    const original = obj[method];
    const spy = mock();
    // Set up the initial spy function
    obj[method] = (...args) => {
      spy.calls.push(args);
      spy.mock.calls.push(args);
      return spy.returnValue;
    };
    // Keep reference to spy object on the replaced function
    obj[method].calls = spy.calls;
    obj[method].mock = spy.mock;
    obj[method].mockImplementation = (implementation) => {
      obj[method] = (...args) => {
        spy.calls.push(args);
        spy.mock.calls.push(args);
        if (implementation) {
          return implementation(...args);
        }
        return spy.returnValue;
      };
      obj[method].calls = spy.calls;
      obj[method].mock = spy.mock;
      obj[method].mockImplementation = spy.mockImplementation;
      obj[method].mockRestore = spy.mockRestore;
      return obj[method];
    };
    obj[method].mockRestore = () => {
      obj[method] = original;
      spy.calls = [];
      spy.mock.calls = [];
    };
    return obj[method];
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
    toContain: (expected) => {
      if (typeof actual === 'string' && !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual) && !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
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
      if (!actual.calls || actual.calls.length === 0) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but it was never called`);
      }
      const found = actual.calls.some(call => {
        if (call.length !== args.length) return false;
        return call.every((arg, i) => JSON.stringify(arg) === JSON.stringify(args[i]));
      });
      if (!found) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but got: ${JSON.stringify(actual.calls)}`);
      }
    },
    not: {
      toHaveBeenCalled: () => {
        if (actual.calls && actual.calls.length > 0) {
          throw new Error(`Expected function not to have been called`);
        }
      },
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      }
    },
    toHaveProperty: (prop, value) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
      if (value !== undefined && actual[prop] !== value) {
        throw new Error(`Expected property ${prop} to be ${value}, but got ${actual[prop]}`);
      }
    },
    toThrow: () => {
      try {
        actual();
        throw new Error(`Expected function to throw`);
      } catch (e) {
        if (e.message === 'Expected function to throw') {
          throw e;
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
  
  mock = (implementation) => {
    const fn = (...args) => {
      fn.calls.push(args);
      fn.mock.calls.push(args);
      if (implementation) {
        return implementation(...args);
      }
      return fn.returnValue;
    };
    fn.calls = [];
    fn.mock = { calls: [] };
    fn.mockRestore = () => {
      fn.calls = [];
      fn.mock.calls = [];
    };
    return fn;
  };
  
  spyOn = (obj, method) => {
    const original = obj[method];
    const spy = mock();
    // Set up the initial spy function
    obj[method] = (...args) => {
      spy.calls.push(args);
      spy.mock.calls.push(args);
      return spy.returnValue;
    };
    // Keep reference to spy object on the replaced function
    obj[method].calls = spy.calls;
    obj[method].mock = spy.mock;
    obj[method].mockImplementation = (implementation) => {
      obj[method] = (...args) => {
        spy.calls.push(args);
        spy.mock.calls.push(args);
        if (implementation) {
          return implementation(...args);
        }
        return spy.returnValue;
      };
      obj[method].calls = spy.calls;
      obj[method].mock = spy.mock;
      obj[method].mockImplementation = spy.mockImplementation;
      obj[method].mockRestore = spy.mockRestore;
      return obj[method];
    };
    obj[method].mockRestore = () => {
      obj[method] = original;
      spy.calls = [];
      spy.mock.calls = [];
    };
    return obj[method];
  };
  
  // Run tests after all are registered
  // Use setTimeout instead of nextTick to ensure all tests are registered
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
    // Store result for checking but don't exit immediately
    if (typeof process !== 'undefined') {
      process.exitCode = failed > 0 ? 1 : 0;
    }
  });
}

export { describe, test, expect, beforeEach, afterEach, mock, spyOn };