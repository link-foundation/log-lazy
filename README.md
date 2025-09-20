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

## 🎯 The Problem This Solves

Traditional logging forces developers to either:
1. Remove log statements from production code (losing valuable debugging capability)
2. Leave them in and suffer performance penalties from string concatenation and JSON serialization

**log-lazy solves this with lazy evaluation** - expensive operations are wrapped in functions that only execute when logging is actually enabled.

## 💡 Core Concept: Lazy Evaluation

### ❌ Traditional Logging (Always Evaluates)
```javascript
// This ALWAYS runs JSON.stringify, even when logging is disabled!
logger.debug(`User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);

// This ALWAYS performs the calculation, even when logging is disabled!
logger.debug(`Found ${users.filter(u => u.active).length} active users`);

// This ALWAYS builds the entire string, even when not logging!
logger.info(`Processing order #${order.id} with ${order.items.length} items totaling $${order.calculateTotal()}`);
```

### ✅ Lazy Logging (Only Evaluates When Needed)
```javascript
// Just add () => to make it lazy! JSON.stringify only runs if debug is enabled
logger.debug(() => `User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);

// Calculation only happens if debug logging is enabled!
logger.debug(() => `Found ${users.filter(u => u.active).length} active users`);

// Complex string building only happens when info is enabled!
logger.info(() => `Processing order #${order.id} with ${order.items.length} items totaling $${order.calculateTotal()}`);
```

The beauty is in the simplicity - just wrap your existing template literals with `() =>` and you get lazy evaluation!

## 🔥 Performance Benefits

With lazy evaluation, you can keep detailed logging in production:

```javascript
import { LazyLog } from 'log-lazy';

const logger = new LazyLog({ level: 'error' }); // Only errors in production
const log = logger.log; // Use the shorter log() syntax

function processOrder(order) {
  // These debug logs have ZERO performance impact in production!
  // Just wrap template literals with () =>
  log.debug(() => `Processing order ${JSON.stringify(order)}`);
  log.debug(() => `Validation details: ${performExpensiveValidation(order)}`);
  
  try {
    const result = submitOrder(order);
    
    // This also has zero cost when info is disabled
    log.info(() => `Order #${result.id} submitted with ${result.items.length} items, total: $${result.calculateTotal()}`);
    
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
const { LazyLog } = require('log-lazy');

// Standard levels (powers of 2)
LazyLog.levels = {
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
const customLevel = LazyLog.levels.error | LazyLog.levels.warn | LazyLog.levels.fatal;
const log = new LazyLog({ level: customLevel });

// Or use preset combinations
const prodLog = new LazyLog({ level: 'production' }); // fatal, error, warn
const devLog = new LazyLog({ level: 'development' });  // fatal, error, warn, info, debug
```

## 📖 API Usage

### Basic Setup

```javascript
import { LazyLog } from 'log-lazy';

// Create logger and get the log function for shorter syntax
const logger = new LazyLog({ level: 'info' });
const log = logger.log;

// Simple usage - just wrap template literals with () =>
log.info(() => `Server started on port ${port}`);
log.error(() => `Failed to connect: ${error.message}`);

// Or use the traditional logger methods
logger.info(() => `Server started on port ${port}`);
logger.error(() => `Failed to connect: ${error.message}`);
```

### Lazy Evaluation Examples

```javascript
const logger = new LazyLog({ level: process.env.LOG_LEVEL || 'info' });
const log = logger.log;

// Simple: Just add () => before your template literals!
log.debug(() => `State snapshot: ${JSON.stringify(largeStateObject)}`);

// Works with any expensive operation in template literals
log.info(() => `Stats: ${calculateActiveUsers()} active users, revenue: $${calculateRevenue()}`);

// Combine static and dynamic parts
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
```

### Dynamic Level Control

```javascript
const logger = new LazyLog({ level: LazyLog.levels.warn });

// Enable specific levels at runtime
logger.enableLevel('debug');
logger.enableLevel('info');

// Disable specific levels
logger.disableLevel('debug');

// Check what's enabled
console.log(logger.getEnabledLevels()); // ['warn', 'info']

// Check if a specific level would log
if (logger.shouldLog('debug')) {
  // Perform debug-only operations
}
```

### Custom Presets

```javascript
const logger = new LazyLog({
  level: 'custom',
  presets: {
    custom: LazyLog.levels.error | LazyLog.levels.debug,
    minimal: LazyLog.levels.fatal | LazyLog.levels.error,
    verbose: LazyLog.levels.all & ~LazyLog.levels.silly
  }
});
```

### Multiple Logger Instances

```javascript
// Different loggers for different modules
const dbLogger = new LazyLog({ level: 'error' });
const apiLogger = new LazyLog({ level: 'info' });
const authLogger = new LazyLog({ level: 'debug' });

// In production, update all to error-only
if (process.env.NODE_ENV === 'production') {
  [dbLogger, apiLogger, authLogger].forEach(logger => {
    logger.level = LazyLog.levels.error;
  });
}
```

## 🏆 Best Practices

### 1. The Simple Rule: Just Add `() =>`

```javascript
// ❌ Bad - Always evaluates
logger.debug(`Data: ${JSON.stringify(data)}`);
logger.info(`Found ${items.length} items worth $${calculateTotal(items)}`);

// ✅ Good - Just add () => for lazy evaluation!
logger.debug(() => `Data: ${JSON.stringify(data)}`);
logger.info(() => `Found ${items.length} items worth $${calculateTotal(items)}`);
```

### 2. Keep Logging Statements in Production

```javascript
const logger = new LazyLog({ level: process.env.LOG_LEVEL || 'error' });
const log = logger.log;

// You can now safely leave these in production code!
function processPayment(payment) {
  // These won't execute in production (when level is 'error')
  log.debug(() => `Processing payment: ${JSON.stringify(payment)}`);
  log.trace(() => `Validation rules: ${JSON.stringify(gatherValidationRules())}`);
  
  // Business logic...
  
  log.info(() => `Payment ${payment.id} processed: $${payment.amount}, fees: $${calculateFees(payment)}`);
  
  if (payment.amount > 10000) {
    log.warn(() => `Large payment detected: ${payment.id} for $${payment.amount}`);
  }
}
```

### 3. Use Appropriate Levels

```javascript
logger.fatal('System is shutting down');          // System unusable
logger.error('Failed to save user', error);       // Error conditions
logger.warn('API rate limit approaching');        // Warning conditions
logger.info('User logged in', userId);            // Informational
logger.debug('Cache miss for key:', key);         // Debug-level
logger.verbose('Entering function', funcName);    // Verbose debug
logger.trace('Variable state:', () => state);     // Detailed trace
logger.silly('Every little detail');              // Extremely detailed
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

const logger = new LazyLog({ level: getLogLevel() });
```

## 🎯 Real-World Example

```javascript
import { LazyLog } from 'log-lazy';

class OrderService {
  constructor() {
    this.logger = new LazyLog({ 
      level: process.env.LOG_LEVEL || 'info' 
    });
    this.log = this.logger.log; // Shorter syntax
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
      
      this.log.info(() => `Order ${order.id} created successfully`);
      
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
const logger = new LazyLog({
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
import { LazyLog } from 'log-lazy';
import createDebug from 'debug';

// Create debug instances for different namespaces
const debugApp = createDebug('app');
const debugDB = createDebug('app:db');
const debugHTTP = createDebug('app:http');

// Integrate with log-lazy
const logger = new LazyLog({
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

// Use with lazy evaluation
logger.debug('DB Query:', () => JSON.stringify(query));
logger.verbose('HTTP Request:', () => ({
  method: req.method,
  url: req.url,
  headers: req.headers
}));
```

### Winston Integration

Winston is a multi-transport async logging library:

```javascript
import { LazyLog } from 'log-lazy';
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
const logger = new LazyLog({
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

// Lazy evaluation with Winston's metadata support
logger.info('User action', () => ({
  userId: user.id,
  action: 'login',
  metadata: computeExpensiveMetadata()
}));
```

### Log4js Integration

Log4js provides a familiar logging interface similar to Log4j:

```javascript
import { LazyLog } from 'log-lazy';
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
const logger = new LazyLog({
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

// Use with lazy evaluation
logger.debug('Processing batch', () => ({
  size: batch.length,
  items: batch.map(item => item.id)
}));
```

### Pino Integration

Pino is an extremely fast Node.js logger with low overhead:

```javascript
import { LazyLog } from 'log-lazy';
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
const logger = new LazyLog({
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

// Pino-friendly lazy evaluation
logger.info('Request completed', () => ({
  responseTime: Date.now() - startTime,
  statusCode: res.statusCode,
  path: req.url
}));
```

### Bunyan Integration

Bunyan provides structured JSON logging:

```javascript
import { LazyLog } from 'log-lazy';
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
const logger = new LazyLog({
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

// Bunyan-style structured logging with lazy evaluation
logger.error('Database error', () => ({
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
// Only compute expensive debug info when actually debugging
logger.debug(() => {
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
const logger = new LazyLog({ level: 'error' }); // Debug disabled
const log = logger.log;
for(let i = 0; i < 1000000; i++) {
  // Just add () => and the function never executes since debug is disabled!
  log.debug(() => `Iteration ${i}: ${JSON.stringify({data: i, timestamp: Date.now()})}`);
}
console.timeEnd('lazy'); // ~5ms - near zero cost!

// The difference: 100x faster when logs are disabled!
```

## 📊 Benchmarks

With logging disabled:
- Traditional template literals: ~500ms per million calls
- Lazy evaluation: ~5ms per million calls
- **100x faster when disabled!**

With logging enabled:
- Both perform similarly (lazy adds ~2% overhead for function calls)

## 🧪 Testing

```bash
# Run tests
bun test

# With coverage
bun test --coverage
```

## 📄 License

This project is released into the public domain under the [Unlicense](LICENSE).

## 🤝 Contributing

Contributions are welcome! The lazy evaluation pattern ensures that detailed debugging can coexist with production performance requirements.

## 💡 Philosophy

> "The best debugging logs are the ones that exist in production but never slow it down."

With log-lazy, you never have to choose between observability and performance. Keep your logs, keep your speed.