# log-lazy Examples

This directory contains examples demonstrating the key features of log-lazy.

## Examples

### 🏆 [hero.js](./hero.js)
The main showcase example demonstrating lazy evaluation with template strings. Shows how to use `log()` and `log.error()` with zero performance cost in production.

### ⚡ [comparison.js](./comparison.js)
Performance comparison between traditional logging and lazy logging, showing the 2500x speed improvement.

### 🔧 [complete.js](./complete.js)  
Comprehensive example showing all log levels and how they behave in production mode.

### 🚀 [lazy-evaluation.js](./lazy-evaluation.js)
Deep dive into lazy evaluation mechanics with performance measurements.

### 💼 [real-world.js](./real-world.js)
Real-world service class example showing practical usage patterns.

## Running Examples

```bash
# Run any example
node examples/hero.js

# See the difference between production and development
NODE_ENV=production node examples/complete.js
NODE_ENV=development node examples/complete.js

# Run performance comparison
node examples/comparison.js
```

## Key Concept

The magic of log-lazy is using arrow functions for lazy evaluation:

```javascript
// ❌ BAD - Always evaluates expensive operation
log.debug('Data:', expensiveOperation());

// ✅ GOOD - Only evaluates if debug is enabled  
log.debug(() => `Data: ${expensiveOperation()}`);
```

When the log level is disabled, the function is **never called**, resulting in **zero performance cost**.