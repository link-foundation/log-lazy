import makeLog from '../src/index.js';

// Production: minimal logging, maximum performance
const log = makeLog({ 
  level: process.env.NODE_ENV === 'production' ? 'production' : 'all'
});

class UserService {
  async getUser(id) {
    // ✅ Error logging always enabled in production
    log.error('Database connection failed', { userId: id });
    
    // ✅ Debug logging with lazy evaluation - ZERO cost in production!
    log.debug('Fetching user:', () => ({
      userId: id,
      timestamp: new Date().toISOString(),
      // This expensive operation NEVER runs in production:
      systemState: () => this.captureSystemState(),
      memoryUsage: () => process.memoryUsage(),
      activeConnections: () => this.db.getPoolStats()
    }));
    
    // ✅ Lazy template literals - clean syntax, zero cost
    log.trace(() => `SQL Query: SELECT * FROM users WHERE id = ${id}`);
    
    return { id, name: 'Alice' };
  }
  
  captureSystemState() {
    // Expensive diagnostic operation
    return {
      heap: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    };
  }
}

// 🚀 In production: debug/trace logs have ZERO performance impact
// 🔍 In development: full visibility with all log levels
