import winston from 'winston';
import makeLog from 'log-lazy';

const user = { id: 42, name: 'Alice', role: 'admin' };

// ❌ Traditional: Expensive operations ALWAYS run (even when not logging!)
const logger = winston.createLogger({ level: 'error' });
logger.info(`Active user: ${JSON.stringify(user)}`);
logger.debug(`Other users: ${
  [...Array(100)].map((_, i) => ({ id: i, name: `User${i}` }))
}`);

// ✅ Lazy: Functions NEVER called when disabled
const log = makeLog({ level: 'error' });
log(() => `Active user: ${JSON.stringify(user)}`);
log.debug(() => `Other users: ${
  [...Array(100)].map((_, i) => ({ id: i, name: `User${i}` }))
}`);

// 🚀 Zero cost when disabled, full details when needed!