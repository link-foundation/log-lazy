// Shared test compatibility helpers built on test-anywhere.

const testAnywhere =
  typeof Deno !== 'undefined'
    ? await import('npm:test-anywhere@0.9.1')
    : await import('test-anywhere');

const {
  describe,
  test,
  beforeEach,
  afterEach,
  getRuntime,
  expect: baseExpect
} = testAnywhere;

function valuesEqual(actual, expected) {
  if (Object.is(actual, expected)) {
    return true;
  }

  try {
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch (_error) {
    return false;
  }
}

function getCalls(actual) {
  return actual?.mock?.calls || actual?.calls;
}

function expect(actual) {
  const matchers = baseExpect(actual);
  const calls = () => getCalls(actual);

  matchers.toBeDefined = () => {
    if (actual === undefined) {
      throw new Error('Expected value to be defined');
    }
  };

  matchers.toHaveBeenCalled = () => {
    const actualCalls = calls();
    if (!actualCalls || actualCalls.length === 0) {
      throw new Error('Expected function to have been called');
    }
  };

  matchers.toHaveBeenCalledTimes = (expectedCount) => {
    const actualCalls = calls();
    const actualCount = actualCalls?.length || 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected function to have been called ${expectedCount} times, but was called ${actualCount} times`
      );
    }
  };

  matchers.toHaveBeenCalledWith = (...expectedArgs) => {
    const actualCalls = calls();
    if (!actualCalls || actualCalls.length === 0) {
      throw new Error(
        `Expected function to have been called with ${JSON.stringify(expectedArgs)}, but it was never called`
      );
    }

    const found = actualCalls.some((call) => {
      if (call.length !== expectedArgs.length) {
        return false;
      }
      return call.every((arg, index) => valuesEqual(arg, expectedArgs[index]));
    });

    if (!found) {
      throw new Error(
        `Expected function to have been called with ${JSON.stringify(expectedArgs)}, but got: ${JSON.stringify(actualCalls)}`
      );
    }
  };

  matchers.toHaveProperty = (property, expectedValue) => {
    if (actual === null || actual === undefined || !(property in actual)) {
      throw new Error(`Expected object to have property ${property}`);
    }
    if (
      expectedValue !== undefined &&
      !valuesEqual(actual[property], expectedValue)
    ) {
      throw new Error(
        `Expected property ${property} to be ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actual[property])}`
      );
    }
  };

  matchers.not.toHaveBeenCalled = () => {
    const actualCalls = calls();
    if (actualCalls && actualCalls.length > 0) {
      throw new Error('Expected function not to have been called');
    }
  };

  matchers.not.toHaveBeenCalledTimes = (expectedCount) => {
    const actualCalls = calls();
    const actualCount = actualCalls?.length || 0;
    if (actualCount === expectedCount) {
      throw new Error(
        `Expected function not to have been called ${expectedCount} times`
      );
    }
  };

  return matchers;
}

function mock(implementation) {
  let currentImplementation = implementation;

  const fn = function (...args) {
    fn.mock.calls.push(args);
    if (currentImplementation) {
      return currentImplementation.apply(this, args);
    }
    return fn.returnValue;
  };

  fn.mock = { calls: [] };
  Object.defineProperty(fn, 'calls', {
    get: () => fn.mock.calls
  });
  fn.mockImplementation = (nextImplementation) => {
    currentImplementation = nextImplementation;
    return fn;
  };
  fn.mockReturnValue = (returnValue) => {
    fn.returnValue = returnValue;
    return fn;
  };
  fn.mockClear = () => {
    fn.mock.calls.length = 0;
    return fn;
  };
  fn.mockRestore = fn.mockClear;

  return fn;
}

function spyOn(object, method) {
  const original = object[method];
  const spy = mock(function (...args) {
    return original.apply(this, args);
  });
  spy.mockRestore = () => {
    object[method] = original;
    spy.mockClear();
  };
  object[method] = spy;
  return spy;
}

export { describe, test, expect, beforeEach, afterEach, mock, spyOn, getRuntime };
