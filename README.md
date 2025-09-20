# log-lazy

A high-performance lazy logging library with bitwise level control, designed to keep logging statements in production code with zero performance impact when disabled.

## 🚀 Key Features

- **Lazy Evaluation**: Log arguments wrapped in functions are only evaluated if logging is enabled
- **Zero Performance Impact**: Disabled logs have virtually no runtime cost
- **Bitwise Level Control**: Combine multiple log levels with bitwise operations
- **Production-Ready**: Keep all logging statements in production code safely
- **Bun.sh Optimized**: Built and tested specifically for Bun runtime

## 📦 Installation

```bash
bun add log-lazy
```

## ⚡ Quick Start

```javascript
import makeLog from 'log-lazy';

const log = makeLog({ level: 'info' }); // ✨ Direct, simple, efficient!

// Preferred: Use log() directly (defaults to info level)
log('Server started');
log(() => `User ${user.id} logged in`); // With lazy evaluation

// Also available: Explicit level methods
log.debug('This will not be logged'); // Below info level
log.error('An error occurred'); // Error level

// 🚀 Make it efficient - just add () => to your template literals!
log.debug(() => `Debug data: ${JSON.stringify(largeObject)}`); // Not evaluated!
log(() => `Processing ${items.length} items`); // Evaluated and logged at info level
```

**That's it!** Simple, direct, and efficient!

## 🎯 The Problem This Solves

Traditional logging forces developers to either:
1. Remove log statements from production code (losing valuable debugging capability)
2. Leave them in and suffer performance penalties from string concatenation and JSON serialization

**log-lazy solves this with lazy evaluation** - expensive operations are wrapped in functions that only execute when logging is actually enabled.

## 💡 Core Concept: Lazy Evaluation

### ❌ Traditional Logging (Always Evaluates)
```javascript
// This ALWAYS runs JSON.stringify, even when logging is disabled!
log.debug(`User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);

// This ALWAYS performs the calculation, even when logging is disabled!
log.debug(`Found ${users.filter(u => u.active).length} active users`);

// This ALWAYS builds the entire string, even when not logging!
log.info(`Processing order #${order.id} with ${order.items.length} items totaling $${order.calculateTotal()}`);
```

### ✅ Lazy Logging (Only Evaluates When Needed)
```javascript
import makeLog from 'log-lazy';
const log = makeLog({ level: 'info' }); // Direct and simple!

// Preferred: Use log() for info-level logging
log(() => `Processing order #${order.id} with ${order.items.length} items totaling $${order.calculateTotal()}`);

// For debug: JSON.stringify only runs if debug is enabled
log.debug(() => `User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);

// Calculation only happens if debug logging is enabled!
log.debug(() => `Found ${users.filter(u => u.active).length} active users`);
```

The beauty is in the simplicity - just wrap your existing template literals with `() =>` and you get lazy evaluation!

## 🔥 Performance Benefits

With lazy evaluation, you can keep detailed logging in production:

```javascript
import makeLog from 'log-lazy';

const log = makeLog({ level: 'error' }); // Only errors in production

function processOrder(order) {
  // These debug logs have ZERO performance impact in production!
  log.debug(() => `Processing order ${JSON.stringify(order)}`);
  log.debug(() => `Validation details: ${performExpensiveValidation(order)}`);
  
  try {
    const result = submitOrder(order);
    
    // Preferred: Use log() for info-level messages
    log(() => `Order #${result.id} submitted with ${result.items.length} items, total: $${result.calculateTotal()}`);
    
    return result;
  } catch (error) {
    // Error logging is enabled, so this will execute
    log.error(() => `Order ${order.id} failed: ${error.message}. Snapshot: ${JSON.stringify(order)}`);
    throw error;
  }
}
```

## 🎚️ Bitwise Level Control

Log levels are bit flags that can be combined for fine-grained control:

```javascript
import makeLog, { levels } from 'log-lazy';

// Standard levels (powers of 2)
const logLevels = {
  none: 0,      // 0b00000000 - No logging
  fatal: 1,     // 0b00000001
  error: 2,     // 0b00000010
  warn: 4,      // 0b00000100
  info: 8,      // 0b00001000
  debug: 16,    // 0b00010000
  verbose: 32,  // 0b00100000
  trace: 64,    // 0b01000000
  silly: 128,   // 0b10000000
  all: 255      // 0b11111111 - All levels
};

// Combine levels with bitwise OR
const customLevel = levels.error | levels.warn | levels.fatal;
const log = makeLog({ level: customLevel });

// Or use preset combinations
const prodLog = makeLog({ level: 'production' }); // fatal, error, warn
const devLog = makeLog({ level: 'development' });  // fatal, error, warn, info, debug
```

## 📖 API Usage

### Basic Setup - Shorter & More Efficient

```javascript
import makeLog from 'log-lazy';

// Create log directly - clean and simple!
const log = makeLog({ level: 'info' }); // ✨ That's it!

// Preferred: Use log() directly (defaults to info level)
log(() => `Server started on port ${port}`);
log(() => `Processing request: ${JSON.stringify(request)}`);

// For other levels: Use explicit methods when needed
log.error(() => `Failed to connect: ${error.message}`);
log.debug(() => `State: ${JSON.stringify(state)}`); // Zero cost when disabled!

// Clean, direct API with zero overhead! 🎯
```

### Lazy Evaluation Examples

```javascript
const log = makeLog({ level: process.env.LOG_LEVEL || 'info' });

// Preferred: Use log() with lazy evaluation
log(() => `Processing order with ${items.length} items`);
log(() => `Stats: ${calculateActiveUsers()} active users, revenue: $${calculateRevenue()}`);

// For specific levels: Use explicit methods
log.debug(() => `State snapshot: ${JSON.stringify(largeStateObject)}`);
log.error(() => `Operation failed: ${error.message}
  Context: ${JSON.stringify(gatherContext())}
  State: ${JSON.stringify(captureState())}
  Metrics: ${JSON.stringify(calculateMetrics())}`);

// Multi-line template literals work great too
log.trace(() => {
  const result = performExpensiveAnalysis();
  return `Analysis complete:
    Anomalies: ${result.anomalies}
    Duration: ${result.duration}ms
    Memory used: ${result.memoryUsed}MB`;
});

// Note: log() is equivalent to log.info()
// Both work, but log() is shorter and cleaner!
```

### Dynamic Level Control

```javascript
import makeLog, { levels } from 'log-lazy';
const log = makeLog({ level: levels.warn });

// Enable specific levels at runtime
log.enableLevel('debug');
log.enableLevel('info');

// Disable specific levels
log.disableLevel('debug');

// Check what's enabled
console.log(log.getEnabledLevels()); // ['warn', 'info']

// Check if a specific level would log
if (log.shouldLog('debug')) {
  // Perform debug-only operations
}
```

### Custom Presets

```javascript
const log = makeLog({
  level: 'custom',
  presets: {
    custom: levels.error | levels.debug,
    minimal: levels.fatal | levels.error,
    verbose: levels.all & ~levels.silly
  }
});
```

### Multiple Logger Instances

```javascript
// Different loggers for different modules
const dbLog = makeLog({ level: 'error' });
const apiLog = makeLog({ level: 'info' });
const authLog = makeLog({ level: 'debug' });

// In production, update all to error-only
if (process.env.NODE_ENV === 'production') {
  [dbLog, apiLog, authLog].forEach(log => {
    log.level = levels.error;
  });
}
```

## 🏆 Best Practices

### 1. The Simple Rule: Just Add `() =>`

```javascript
const log = makeLog({ level: 'info' });

// ❌ Bad - Always evaluates
log(`Found ${items.length} items worth $${calculateTotal(items)}`);
log.debug(`Data: ${JSON.stringify(data)}`);

// ✅ Good - Just add () => for lazy evaluation!
log(() => `Found ${items.length} items worth $${calculateTotal(items)}`); // Preferred: log() for info
log.debug(() => `Data: ${JSON.stringify(data)}`); // Use explicit level when needed

// Remember: log() === log.info() - use the shorter one!
```

### 2. Keep Logging Statements in Production

```javascript
const log = makeLog({ level: process.env.LOG_LEVEL || 'error' });

// You can now safely leave these in production code!
function processPayment(payment) {
  // These won't execute in production (when level is 'error')
  log.debug(() => `Processing payment: ${JSON.stringify(payment)}`);
  log.trace(() => `Validation rules: ${JSON.stringify(gatherValidationRules())}`);
  
  // Business logic...
  
  // Preferred: Use log() for info-level messages
  log(() => `Payment ${payment.id} processed: $${payment.amount}, fees: $${calculateFees(payment)}`);
  
  if (payment.amount > 10000) {
    log.warn(() => `Large payment detected: ${payment.id} for $${payment.amount}`);
  }
}
```

### 3. Use Appropriate Levels

```javascript
// Now use log.debug, log.info, etc.

log.fatal('System is shutting down');          // System unusable
log.error('Failed to save user', error);       // Error conditions
log.warn('API rate limit approaching');        // Warning conditions
log.info('User logged in', userId);            // Informational
log.debug('Cache miss for key:', key);         // Debug-level
log.verbose('Entering function', funcName);    // Verbose debug
log.trace('Variable state:', () => state);     // Detailed trace
log.silly('Every little detail');              // Extremely detailed
```

### 4. Environment-Based Configuration

```javascript
const getLogLevel = () => {
  switch(process.env.NODE_ENV) {
    case 'production': return 'error';
    case 'staging': return 'warn';
    case 'development': return 'debug';
    case 'test': return 'none';
    default: return 'info';
  }
};

const log = makeLog({ level: getLogLevel() });
```

## 🎯 Real-World Example

```javascript
import makeLog from 'log-lazy';

class OrderService {
  constructor() {
    this.log = makeLog({ 
      level: process.env.LOG_LEVEL || 'info' 
    }); // Direct and clean!
  }

  async createOrder(orderData) {
    // These debug logs have ZERO cost in production - just wrapped with () =>
    this.log.debug(() => `Creating order with ${orderData.items.length} items, total: $${orderData.calculateTotal()}, customer: ${orderData.customerId}`);

    try {
      // Validate
      this.log.trace(() => `Validating with rules: ${JSON.stringify(this.getValidationRules())}`);
      const validation = await this.validate(orderData);
      
      // Process payment
      this.log.debug(() => `Processing ${orderData.paymentMethod} payment for $${orderData.total}`);
      const payment = await this.processPayment(orderData);
      
      // Create order
      const order = await this.saveOrder(orderData, payment);
      
      // Preferred: Use log() for info-level messages
      this.log(() => `Order ${order.id} created successfully`);
      
      // This expensive operation only runs if verbose is enabled
      this.log.verbose(() => `Order details: ${JSON.stringify(order.toDetailedJSON())}`);
      
      return order;
      
    } catch (error) {
      // Error logging with context - still lazy!
      this.log.error(() => `Order creation failed: ${error.message}
        Order data: ${JSON.stringify(orderData)}
        Validation state: ${JSON.stringify(validation)}
        Timestamp: ${new Date().toISOString()}`);
      throw error;
    }
  }
}
```

## 🔧 Advanced Usage

### Custom Output Functions

```javascript
const log = makeLog({
  level: 'all',
  log: {
    fatal: (msg) => alerting.critical(msg),
    error: (msg) => sentry.captureMessage(msg),
    warn: (msg) => monitoring.warning(msg),
    info: (msg) => console.log(`[INFO] ${msg}`),
    debug: (msg) => debug(msg),
    verbose: (msg) => verbose(msg),
    trace: (msg) => trace(msg),
    silly: (msg) => silly(msg)
  }
});
```

## 🔌 Integration with Popular Logging Libraries

log-lazy can seamlessly integrate with existing logging libraries, adding lazy evaluation to improve their performance.

### Debug Integration

The `debug` library is popular for its simplicity and namespace support:

```javascript
import makeLog from 'log-lazy';
import createDebug from 'debug';

// Create debug instances for different namespaces
const debugApp = createDebug('app');
const debugDB = createDebug('app:db');
const debugHTTP = createDebug('app:http');

// Integrate with log-lazy
const log = makeLog({
  level: process.env.DEBUG ? 'all' : 'warn',
  log: {
    fatal: (...args) => debugApp('FATAL:', ...args),
    error: (...args) => debugApp('ERROR:', ...args),
    warn: (...args) => debugApp('WARN:', ...args),
    info: (...args) => debugApp('INFO:', ...args),
    debug: (...args) => debugDB(...args),
    verbose: (...args) => debugHTTP(...args),
    trace: (...args) => debugApp('TRACE:', ...args),
    silly: (...args) => debugApp('SILLY:', ...args)
  }
});

// Now use log.debug, log.info, etc.

// Use with lazy evaluation
log.debug('DB Query:', () => JSON.stringify(query));
log.verbose('HTTP Request:', () => ({
  method: req.method,
  url: req.url,
  headers: req.headers
}));
```

### Winston Integration

Winston is a multi-transport async logging library:

```javascript
import makeLog from 'log-lazy';
import winston from 'winston';

// Configure Winston
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Integrate with log-lazy
const log = makeLog({
  level: 'all',
  log: {
    fatal: (...args) => winstonLogger.error('FATAL', ...args),
    error: (...args) => winstonLogger.error(...args),
    warn: (...args) => winstonLogger.warn(...args),
    info: (...args) => winstonLogger.info(...args),
    debug: (...args) => winstonLogger.debug(...args),
    verbose: (...args) => winstonLogger.verbose(...args),
    trace: (...args) => winstonLogger.silly(...args), // Winston uses 'silly' for trace
    silly: (...args) => winstonLogger.silly(...args)
  }
});

// Now use log.debug, log.info, etc.

// Lazy evaluation with Winston's metadata support
log.info('User action', () => ({
  userId: user.id,
  action: 'login',
  metadata: computeExpensiveMetadata()
}));
```

### Log4js Integration

Log4js provides a familiar logging interface similar to Log4j:

```javascript
import makeLog from 'log-lazy';
import log4js from 'log4js';

// Configure Log4js
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'app.log' },
    errors: { type: 'file', filename: 'errors.log' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' },
    errors: { appenders: ['errors', 'console'], level: 'error' }
  }
});

const log4jsLogger = log4js.getLogger();
const errorLogger = log4js.getLogger('errors');

// Integrate with log-lazy
const log = makeLog({
  level: 'all',
  log: {
    fatal: (...args) => log4jsLogger.fatal(...args),
    error: (...args) => errorLogger.error(...args),
    warn: (...args) => log4jsLogger.warn(...args),
    info: (...args) => log4jsLogger.info(...args),
    debug: (...args) => log4jsLogger.debug(...args),
    verbose: (...args) => log4jsLogger.trace(...args), // Log4js uses trace for verbose
    trace: (...args) => log4jsLogger.trace(...args),
    silly: (...args) => log4jsLogger.trace('SILLY:', ...args)
  }
});

// Now use log.debug, log.info, etc.

// Use with lazy evaluation
log.debug('Processing batch', () => ({
  size: batch.length,
  items: batch.map(item => item.id)
}));
```

### Pino Integration

Pino is an extremely fast Node.js logger with low overhead:

```javascript
import makeLog from 'log-lazy';
import pino from 'pino';

// Configure Pino
const pinoLogger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Integrate with log-lazy - Pino expects objects as first argument
const log = makeLog({
  level: 'all',
  log: {
    fatal: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.fatal(rest[0] || {}, msg);
    },
    error: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.error(rest[0] || {}, msg);
    },
    warn: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.warn(rest[0] || {}, msg);
    },
    info: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.info(rest[0] || {}, msg);
    },
    debug: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.debug(rest[0] || {}, msg);
    },
    verbose: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.trace(rest[0] || {}, msg);
    },
    trace: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.trace(rest[0] || {}, msg);
    },
    silly: (...args) => {
      const [msg, ...rest] = args;
      pinoLogger.trace(rest[0] || {}, msg);
    }
  }
});

// Now use log.debug, log.info, etc.

// Pino-friendly lazy evaluation
log.info('Request completed', () => ({
  responseTime: Date.now() - startTime,
  statusCode: res.statusCode,
  path: req.url
}));
```

### Bunyan Integration

Bunyan provides structured JSON logging:

```javascript
import makeLog from 'log-lazy';
import bunyan from 'bunyan';

// Configure Bunyan
const bunyanLogger = bunyan.createLogger({
  name: 'myapp',
  streams: [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'error',
      path: '/var/log/myapp-error.log'
    }
  ],
  serializers: bunyan.stdSerializers
});

// Create child logger for specific component
const componentLogger = bunyanLogger.child({ component: 'api' });

// Integrate with log-lazy
const log = makeLog({
  level: 'all',
  log: {
    fatal: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.fatal(rest[0] || {}, msg);
    },
    error: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.error(rest[0] || {}, msg);
    },
    warn: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.warn(rest[0] || {}, msg);
    },
    info: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.info(rest[0] || {}, msg);
    },
    debug: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.debug(rest[0] || {}, msg);
    },
    verbose: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.trace(rest[0] || {}, msg);
    },
    trace: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.trace(rest[0] || {}, msg);
    },
    silly: (...args) => {
      const [msg, ...rest] = args;
      componentLogger.trace({ level: 'silly', ...rest[0] }, msg);
    }
  }
});

// Now use log.debug, log.info, etc.

// Bunyan-style structured logging with lazy evaluation
log.error('Database error', () => ({
  err: error, // Bunyan will serialize this
  query: query,
  duration: Date.now() - queryStart,
  user: req.user.id
}));
```

### Benefits of Integration

By integrating log-lazy with existing loggers, you get:

1. **Zero-cost disabled logs** - Expensive computations only run when needed
2. **Keep existing infrastructure** - Continue using your current logging setup
3. **Gradual migration** - Add lazy evaluation incrementally
4. **Production safety** - Leave detailed logs in production code without performance impact

### Conditional Lazy Loading

```javascript
// Now use log.debug, log.info, etc. for cleaner code

// Only compute expensive debug info when actually debugging
log.debug(() => {
  if (complexCondition()) {
    return calculateExpensiveDebugInfo();
  }
  return 'Condition not met';
});
```

## 🚦 Performance Comparison

```javascript
// Traditional logging - string always built
console.time('traditional');
for(let i = 0; i < 1000000; i++) {
  // This ALWAYS builds the string, even when not logging!
  const message = `Iteration ${i}: ${JSON.stringify({data: i, timestamp: Date.now()})}`;
  if(logLevel >= DEBUG) {
    console.log(message);
  }
}
console.timeEnd('traditional'); // ~500ms even when not logging!

// Lazy logging with log-lazy
console.time('lazy');
const log = makeLog({ level: 'error' }); // Debug disabled
for(let i = 0; i < 1000000; i++) {
  // Just add () => and the function never executes since debug is disabled!
  log.debug(() => `Iteration ${i}: ${JSON.stringify({data: i, timestamp: Date.now()})}`);
}
console.timeEnd('lazy'); // ~5ms - near zero cost!

// The difference: 100-1000x faster when logs are disabled (benchmarked!)
```

## 📊 Benchmarks

Real benchmark results from [benchmarks/README.md](benchmarks/README.md):

### Real-World Performance Comparison

**📊 How to read this chart:** This shows a realistic production scenario with `warn` log level. Debug and info logs are disabled, but traditional logging still evaluates their expensive operations. The bars show execution time (lower is better).

```mermaid
---
config:
  themeVariables:
    xyChart:
      backgroundColor: "transparent"
---
xychart-beta
    title "Production Performance: Mixed Workload at Warn Level (lower is better)"
    x-axis ["Traditional Logging", "Lazy Logging"]
    y-axis "Time (milliseconds)" 0.01 --> 100
    bar [19.04, 0.08] "Execution time"
```

**Key Results:**
- **Traditional**: 19.04 ms - Still evaluates all debug/info expressions even when disabled
- **Lazy**: 0.08 ms (79.93 µs) - Skips evaluation of disabled logs completely
- **Performance Gain: 238x faster** in production conditions

This mixed workload includes:
- Disabled debug logs with `JSON.stringify(largeObject)`
- Disabled info logs with array filtering and calculations
- Enabled warn and error logs (both approaches log these)

### Production Overhead Analysis

For detailed comparisons including overhead vs clean code, see [benchmarks/README.md](benchmarks/README.md).

**Summary**: Lazy logging is **100-1000x faster** than traditional logging when disabled, with minimal overhead (1.5-5x) compared to having no logs at all for typical operations.

Run benchmarks yourself: `bun run bench`

## 🧪 Testing

```bash
# Run tests
bun test

# With coverage
bun test --coverage

# Run benchmarks
bun run bench
```

## 📄 License

This project is released into the public domain under the [Unlicense](LICENSE).

## 🤝 Contributing

Contributions are welcome! The lazy evaluation pattern ensures that detailed debugging can coexist with production performance requirements.

## 💡 Philosophy

> "The best debugging logs are the ones that exist in production but never slow it down."

With log-lazy, you never have to choose between observability and performance. Keep your logs, keep your speed.