/**
 * log-lazy - A lazy logging library with bitwise level control
 * @module log-lazy
 */

export interface LogLevels {
  readonly none: 0;
  readonly fatal: 1;
  readonly error: 2;
  readonly warn: 4;
  readonly info: 8;
  readonly debug: 16;
  readonly verbose: 32;
  readonly trace: 64;
  readonly silly: 128;
  readonly all: 255;
  readonly production: 7;
  readonly development: 31;
  [key: string]: number;
}

export interface LogOptions {
  /** The logging level (number, string name, or custom combination) */
  level?: number | string;
  /** Preset configuration name */
  preset?: string;
  /** Custom output functions for each log level */
  log?: {
    fatal?: (...args: any[]) => void;
    error?: (...args: any[]) => void;
    warn?: (...args: any[]) => void;
    info?: (...args: any[]) => void;
    debug?: (...args: any[]) => void;
    verbose?: (...args: any[]) => void;
    trace?: (...args: any[]) => void;
    silly?: (...args: any[]) => void;
  };
  /** Custom presets for different environments */
  presets?: {
    [key: string]: Partial<LogOptions>;
  };
  /** Preprocessors to transform arguments before processing (receive args array, return args array) */
  preprocessors?: Array<(args: any[], level: number) => any[]>;
  /** Postprocessors to transform compiled message before output (receive string, return string) */
  postprocessors?: Array<(message: string, level: number, levelName: string) => string>;
}

export interface LogFunction {
  /** Log at info level (default) */
  (...args: any[]): void;
  
  /** Log at fatal level */
  fatal(...args: any[]): void;
  
  /** Log at error level */
  error(...args: any[]): void;
  
  /** Log at warn level */
  warn(...args: any[]): void;
  
  /** Log at info level */
  info(...args: any[]): void;
  
  /** Log at debug level */
  debug(...args: any[]): void;
  
  /** Log at verbose level */
  verbose(...args: any[]): void;
  
  /** Log at trace level */
  trace(...args: any[]): void;
  
  /** Log at silly level */
  silly(...args: any[]): void;
  
  /** Current log level mask */
  level: number;
  
  /** Check if a level should log */
  shouldLog(level: number | string): boolean;
  
  /** Enable a specific log level */
  enableLevel(level: number | string): void;
  
  /** Disable a specific log level */
  disableLevel(level: number | string): void;
  
  /** Get array of enabled level names */
  getEnabledLevels(): string[];
}

/**
 * Create a new logger instance
 * @param options - Configuration options for the logger
 * @returns A configured logger function with level methods
 */
declare function makeLog(options?: LogOptions): LogFunction;

export default makeLog;
export { makeLog };

/** Available log levels with their bitwise values */
export declare const levels: LogLevels;

/** Array of level names in order */
export declare const levelNames: readonly string[];

/** Default logger instance */
export declare const defaultLog: LogFunction;

/** Alias for defaultLog */
export declare const log: LogFunction;

/** Built-in postprocessor helpers */
export declare const postprocessors: {
  /** Add timestamp prefix with configurable format (iso, locale, time, ms) */
  timestamp: (format?: 'iso' | 'locale' | 'time' | 'ms') => (message: string) => string;
  /** Add log level prefix */
  level: () => (message: string, level: number, levelName: string) => string;
  /** Add process ID prefix */
  pid: () => (message: string) => string;
  /** Add custom text prefix */
  prefix: (text: string) => (message: string) => string;
  /** Add custom text suffix */
  suffix: (text: string) => (message: string) => string;
};

/** Built-in preprocessor helpers */
export declare const preprocessors: {
  /** Add context object to all log calls */
  addContext: (context: any) => (args: any[]) => any[];
  /** Filter arguments based on predicate */
  filter: (predicate: (arg: any) => boolean) => (args: any[]) => any[];
  /** Transform all arguments */
  map: (transform: (arg: any) => any) => (args: any[]) => any[];
};