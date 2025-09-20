export class LazyLog {
  // Static levels for external use
  static levels = {
    none: 0,      // 0b00000000 - No logging
    fatal: 1,     // 0b00000001 - Fatal errors (Pino/Bunyan/Log4js)
    error: 2,     // 0b00000010 - Errors
    warn: 4,      // 0b00000100 - Warnings
    info: 8,      // 0b00001000 - Info
    debug: 16,    // 0b00010000 - Debug
    verbose: 32,  // 0b00100000 - Verbose (Winston)
    trace: 64,    // 0b01000000 - Trace (Pino/Bunyan/Log4js)
    silly: 128,   // 0b10000000 - Silly (Winston)
    all: 255      // 0b11111111 - All levels
  };
  
  // Static reverse map for efficient lookup of level names by value
  static levelNames = {
    0: 'none',
    1: 'fatal',
    2: 'error',
    4: 'warn',
    8: 'info',
    16: 'debug',
    32: 'verbose',
    64: 'trace',
    128: 'silly',
    255: 'all'
  };
  
  // Convert a level (string or number) to its numeric value with configurable default
  #getLevelOrDefault(level, defaultValue = 0) {
    if (typeof level === 'string') {
      // First check if it's a named level
      const value = this.levels[level];
      if (value !== undefined) return value;
      
      // Try parsing as numeric string
      const parsed = parseInt(level);
      return isNaN(parsed) ? defaultValue : parsed;
    } else if (typeof level === 'number') {
      return level;
    }
    return defaultValue;
  }

  constructor(options = {}) {
    // Instance levels reference the static levels
    this.levels = LazyLog.levels;
    
    // Instance reverse map starts with static values
    this.levelNames = { ...LazyLog.levelNames };
    
    // Common combinations (can be overridden via options.presets)
    this.levels.production = options.presets?.production || (this.levels.fatal | this.levels.error | this.levels.warn);  // 7 (fatal + error + warn)
    this.levels.development = options.presets?.development || (this.levels.fatal | this.levels.error | this.levels.warn | this.levels.info | this.levels.debug);  // 31 (fatal + error + warn + info + debug)
    
    // Add presets to reverse map
    this.levelNames[this.levels.production] = 'production';
    this.levelNames[this.levels.development] = 'development';
    
    // Allow custom presets via options
    if (options.presets) {
      Object.keys(options.presets).forEach(presetName => {
        if (presetName !== 'production' && presetName !== 'development') {
          this.levels[presetName] = options.presets[presetName];
          this.levelNames[options.presets[presetName]] = presetName;
        }
      });
    }
    
    // Parse log level from options.level (handles string names, numeric strings, and numbers)
    this.level = this.#getLevelOrDefault(options.level, this.levels.info);
    
    // Allow overriding console functions
    this.externalLog = {
      fatal: options.log?.fatal || console.error,
      error: options.log?.error || console.error,
      warn: options.log?.warn || console.warn,
      info: options.log?.info || console.log,
      debug: options.log?.debug || console.log,
      verbose: options.log?.verbose || console.log,
      trace: options.log?.trace || console.log,
      silly: options.log?.silly || console.log
    };
    
    // Create a log function that defaults to info level
    this.log = (...args) => this.#log(this.levels.info, ...args);
    
    // Add level methods as properties of the log function
    this.log.fatal = (...args) => this.#log(this.levels.fatal, ...args);
    this.log.error = (...args) => this.#log(this.levels.error, ...args);
    this.log.warn = (...args) => this.#log(this.levels.warn, ...args);
    this.log.info = (...args) => this.#log(this.levels.info, ...args);
    this.log.debug = (...args) => this.#log(this.levels.debug, ...args);
    this.log.verbose = (...args) => this.#log(this.levels.verbose, ...args);
    this.log.trace = (...args) => this.#log(this.levels.trace, ...args);
    this.log.silly = (...args) => this.#log(this.levels.silly, ...args);
  }

  shouldLog(level) {
    // If level is 0 (none), don't log anything
    if (this.level === 0) return false;
    
    // Get the bit flag for the requested level
    const levelFlag = this.#getLevelOrDefault(level);
    
    // Check if this level's bit is set in the current level
    return (this.level & levelFlag) !== 0;
  }

  #log(level, ...args) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Process arguments: if any arg is a function, call it to get the value
    // This allows for lazy evaluation of expensive computations
    const processedArgs = args.map(arg => {
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
    // Use reverse map for efficient lookup
    const levelName = typeof level === 'number' ? this.levelNames[level] : level;
    
    // Get the output function for this level name
    const outputFn = this.externalLog[levelName];
    if (outputFn) {
      outputFn(...processedArgs);
    }
  }

  // Convenience methods for backward compatibility
  fatal(...args) {
    this.log.fatal(...args);
  }

  error(...args) {
    this.log.error(...args);
  }

  warn(...args) {
    this.log.warn(...args);
  }

  info(...args) {
    this.log.info(...args);
  }

  debug(...args) {
    this.log.debug(...args);
  }

  verbose(...args) {
    this.log.verbose(...args);
  }

  trace(...args) {
    this.log.trace(...args);
  }

  silly(...args) {
    this.log.silly(...args);
  }
  
  enableLevel(level) {
    const levelFlag = this.#getLevelOrDefault(level);
    this.level |= levelFlag;
  }
  
  disableLevel(level) {
    const levelFlag = this.#getLevelOrDefault(level);
    this.level &= ~levelFlag;
  }
  
  getEnabledLevels() {
    const enabled = [];
    if (this.level & this.levels.fatal) enabled.push('fatal');
    if (this.level & this.levels.error) enabled.push('error');
    if (this.level & this.levels.warn) enabled.push('warn');
    if (this.level & this.levels.info) enabled.push('info');
    if (this.level & this.levels.debug) enabled.push('debug');
    if (this.level & this.levels.verbose) enabled.push('verbose');
    if (this.level & this.levels.trace) enabled.push('trace');
    if (this.level & this.levels.silly) enabled.push('silly');
    return enabled;
  }
}

export const defaultLogger = new LazyLog();
export const defaultLog = defaultLogger;
export const log = defaultLogger.log;
export const Logger = LazyLog;
export const LazyLogger = LazyLog;
export default LazyLog;
