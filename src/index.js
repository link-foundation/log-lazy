// Static levels for external use
export const levels = {
  none: 0,      // 0b00000000 - No logging
  fatal: 1,     // 0b00000001 - Fatal errors (Pino/Bunyan/Log4js)
  error: 2,     // 0b00000010 - Errors
  warn: 4,      // 0b00000100 - Warnings
  info: 8,      // 0b00001000 - Info
  debug: 16,    // 0b00010000 - Debug
  verbose: 32,  // 0b00100000 - Verbose (Winston)
  trace: 64,    // 0b01000000 - Trace (Pino/Bunyan/Log4js)
  silly: 128,   // 0b10000000 - Silly (Winston)
  all: 255,     // 0b11111111 - All levels
  // Common presets
  production: 7,  // 0b00000111 - fatal + error + warn
  development: 31 // 0b00011111 - fatal + error + warn + info + debug
};

// Static reverse map for efficient lookup of level names by value
export const levelNames = {
  0: 'none',
  1: 'fatal',
  2: 'error',
  4: 'warn',
  8: 'info',
  16: 'debug',
  32: 'verbose',
  64: 'trace',
  128: 'silly',
  255: 'all',
  // Common presets
  31: 'development',
  7: 'production',
};

// Convert a level (string or number) to its numeric value with configurable default
export const getLevelOrDefault = (level, levelsMap, defaultValue = 0) => {
  if (typeof level === 'string') {
    // First check if it's a named level
    const value = levelsMap[level];
    if (value !== undefined) return value;
    
    // Try parsing as numeric string
    const parsed = parseInt(level);
    return isNaN(parsed) ? defaultValue : parsed;
  } else if (typeof level === 'number') {
    return level;
  }
  return defaultValue;
};

// Main constructor function that returns a log object
export const makeLog = (options = {}) => {
  // Create local levels object with static values
  const logLevels = { ...levels };

  // Create local reverse map
  const logLevelNames = { ...levelNames };

  // Common combinations (can be overridden via options.presets)
  logLevels.production = options.presets?.production || (logLevels.fatal | logLevels.error | logLevels.warn);  // 7
  logLevels.development = options.presets?.development || (logLevels.fatal | logLevels.error | logLevels.warn | logLevels.info | logLevels.debug);  // 31

  // Add presets to reverse map
  logLevelNames[logLevels.production] = 'production';
  logLevelNames[logLevels.development] = 'development';

  // Allow custom presets via options
  if (options.presets) {
    Object.keys(options.presets).forEach(presetName => {
      if (presetName !== 'production' && presetName !== 'development') {
        logLevels[presetName] = options.presets[presetName];
        logLevelNames[options.presets[presetName]] = presetName;
      }
    });
  }

  // Parse log level from options.level
  let currentLevel = getLevelOrDefault(options.level, logLevels, logLevels.info);

  // Allow overriding console functions
  const externalLog = {
    fatal: options.log?.fatal || console.error,
    error: options.log?.error || console.error,
    warn: options.log?.warn || console.warn,
    info: options.log?.info || console.log,
    debug: options.log?.debug || console.log,
    verbose: options.log?.verbose || console.log,
    trace: options.log?.trace || console.log,
    silly: options.log?.silly || console.log
  };

  // Preprocessors and postprocessors
  // Preprocessors: receive args array, return args array
  // Postprocessors: receive compiled string, return string
  const preprocessors = options.preprocessors || [];
  const postprocessors = options.postprocessors || [];

  // Check if we have any processors (for zero-overhead optimization)
  const hasPreprocessors = preprocessors.length > 0;
  const hasPostprocessors = postprocessors.length > 0;
  
  // shouldLog function
  const shouldLog = (level) => {
    if (currentLevel === 0) return false;
    const levelFlag = getLevelOrDefault(level, logLevels);
    return (currentLevel & levelFlag) !== 0;
  };
  
  // Core log function with preprocessor and postprocessor support
  const logMessage = (level, ...args) => {
    if (!shouldLog(level)) {
      return;
    }

    // Apply preprocessors if configured (zero overhead when not used)
    let processableArgs = args;
    if (hasPreprocessors) {
      for (const preprocessor of preprocessors) {
        processableArgs = preprocessor(processableArgs, level);
      }
    }

    // Process arguments: if any arg is a function, call it to get the value
    const processedArgs = processableArgs.map(arg => {
      if (typeof arg === 'function') {
        try {
          return arg();
        } catch (error) {
          return `[Error evaluating log argument function: ${error.message}]`;
        }
      }
      return arg;
    });

    // Find the output function for this level
    const levelName = typeof level === 'number' ? logLevelNames[level] : level;

    // Apply postprocessors if configured (zero overhead when not used)
    if (hasPostprocessors) {
      // Convert args to string (compile)
      const compiledMessage = processedArgs.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Apply postprocessors
      let finalMessage = compiledMessage;
      for (const postprocessor of postprocessors) {
        finalMessage = postprocessor(finalMessage, level, levelName);
      }

      // Output the final message
      const outputFn = externalLog[levelName];
      if (outputFn) {
        outputFn(finalMessage);
      }
    } else {
      // No postprocessors - use original fast path
      const outputFn = externalLog[levelName];
      if (outputFn) {
        outputFn(...processedArgs);
      }
    }
  };
  
  // Create the main log function that defaults to info level
  const log = (...args) => logMessage(logLevels.info, ...args);
  
  // Add level methods as properties of the log function
  log.fatal = (...args) => logMessage(logLevels.fatal, ...args);
  log.error = (...args) => logMessage(logLevels.error, ...args);
  log.warn = (...args) => logMessage(logLevels.warn, ...args);
  log.info = (...args) => logMessage(logLevels.info, ...args);
  log.debug = (...args) => logMessage(logLevels.debug, ...args);
  log.verbose = (...args) => logMessage(logLevels.verbose, ...args);
  log.trace = (...args) => logMessage(logLevels.trace, ...args);
  log.silly = (...args) => logMessage(logLevels.silly, ...args);
  
  // Add utility methods to the log object
  log.shouldLog = shouldLog;
  log.enableLevel = (level) => {
    const levelFlag = getLevelOrDefault(level, logLevels);
    currentLevel |= levelFlag;
  };
  log.disableLevel = (level) => {
    const levelFlag = getLevelOrDefault(level, logLevels);
    currentLevel &= ~levelFlag;
  };
  log.getEnabledLevels = () => {
    const enabled = [];
    if (currentLevel & logLevels.fatal) enabled.push('fatal');
    if (currentLevel & logLevels.error) enabled.push('error');
    if (currentLevel & logLevels.warn) enabled.push('warn');
    if (currentLevel & logLevels.info) enabled.push('info');
    if (currentLevel & logLevels.debug) enabled.push('debug');
    if (currentLevel & logLevels.verbose) enabled.push('verbose');
    if (currentLevel & logLevels.trace) enabled.push('trace');
    if (currentLevel & logLevels.silly) enabled.push('silly');
    return enabled;
  };
  
  // Add level property getter/setter
  Object.defineProperty(log, 'level', {
    get: () => currentLevel,
    set: (value) => {
      currentLevel = getLevelOrDefault(value, logLevels, logLevels.info);
    }
  });
  
  // Add levels and levelNames as properties
  log.levels = logLevels;
  log.levelNames = logLevelNames;
  
  return log;
};

// Built-in postprocessor helpers for common use cases
export const postprocessors = {
  // Add timestamp prefix
  timestamp: (format = 'iso') => (message) => {
    const now = new Date();
    let prefix;
    if (format === 'iso') {
      prefix = now.toISOString();
    } else if (format === 'locale') {
      prefix = now.toLocaleString();
    } else if (format === 'time') {
      prefix = now.toLocaleTimeString();
    } else if (format === 'ms') {
      prefix = now.getTime().toString();
    } else {
      prefix = now.toISOString();
    }
    return `[${prefix}] ${message}`;
  },

  // Add log level prefix
  level: () => (message, level, levelName) => {
    return `[${levelName.toUpperCase()}] ${message}`;
  },

  // Add process ID prefix (for Node.js/Bun)
  pid: () => (message) => {
    const pid = typeof process !== 'undefined' && process.pid ? process.pid : 'unknown';
    return `[PID:${pid}] ${message}`;
  },

  // Add custom prefix
  prefix: (text) => (message) => {
    return `${text} ${message}`;
  },

  // Add custom suffix
  suffix: (text) => (message) => {
    return `${message} ${text}`;
  }
};

// Built-in preprocessor helpers
export const preprocessors = {
  // Add context object to all log calls
  addContext: (context) => (args) => {
    return [...args, context];
  },

  // Filter out certain arguments
  filter: (predicate) => (args) => {
    return args.filter(predicate);
  },

  // Transform all arguments
  map: (transform) => (args) => {
    return args.map(transform);
  }
};

// Default exports for convenience
export const defaultLog = makeLog();
export const log = defaultLog;

// Default export
export default makeLog;