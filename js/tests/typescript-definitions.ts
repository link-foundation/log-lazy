// TypeScript definitions test
// This file verifies that TypeScript definitions work correctly

import makeLog, { levels, levelNames, defaultLog, log } from '../index';
import type { LogFunction, LogLevels, LogOptions } from '../index';

// Test basic import and usage
const logger: LogFunction = makeLog();
logger('Hello');
logger.info('Info message');
logger.error('Error message');

// Test with options
const customLogger: LogFunction = makeLog({
  level: 'debug',
  preset: 'development',
  log: {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
  },
  presets: {
    custom: {
      level: 'all'
    }
  }
});

// Test level property
const currentLevel: number = customLogger.level;
customLogger.level = levels.warn;

// Test methods
customLogger.fatal('Fatal');
customLogger.error('Error');
customLogger.warn('Warning');
customLogger.info('Info');
customLogger.debug('Debug');
customLogger.verbose('Verbose');
customLogger.trace('Trace');
customLogger.silly('Silly');

// Test utility methods
const shouldLog: boolean = customLogger.shouldLog('info');
customLogger.enableLevel('debug');
customLogger.disableLevel('trace');
const enabledLevels: string[] = customLogger.getEnabledLevels();

// Test levels constant
const levelNone: 0 = levels.none;
const levelFatal: 1 = levels.fatal;
const levelError: 2 = levels.error;
const levelWarn: 4 = levels.warn;
const levelInfo: 8 = levels.info;
const levelDebug: 16 = levels.debug;
const levelVerbose: 32 = levels.verbose;
const levelTrace: 64 = levels.trace;
const levelSilly: 128 = levels.silly;
const levelAll: 255 = levels.all;
const levelProduction: 7 = levels.production;
const levelDevelopment: 31 = levels.development;

// Test levelNames
const names: readonly string[] = levelNames;
const firstName: string = levelNames[0];

// Test default loggers
const defLog: LogFunction = defaultLog;
const aliasLog: LogFunction = log;

// Test with numeric level
const numericLogger: LogFunction = makeLog({ level: 15 });

// Test with string level
const stringLogger: LogFunction = makeLog({ level: 'error' });

// Lazy evaluation tests (TypeScript should accept functions as arguments)
logger.info('Value:', () => ({ computed: true }));
logger.debug(() => `Expensive: ${Date.now()}`);

// Test that types prevent incorrect usage (these should show TypeScript errors if uncommented)
// logger.unknownMethod(); // Error: Property 'unknownMethod' does not exist
// logger.level = 'string'; // Error: Type 'string' is not assignable to type 'number'
// const wrongLevel: 5 = levels.warn; // Error: Type '4' is not assignable to type '5'

// Export a success flag to verify the file compiles
export const typeCheckSuccess = true;