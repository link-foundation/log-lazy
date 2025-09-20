import { bench, run } from 'mitata';
import makeLog from '../src/index.js';

// Mock console to prevent output
const mockConsole = {
  log: () => {},
  error: () => {},
  warn: () => {},
};

// Test data
const largeObject = {
  users: new Array(100).fill(0).map((_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    metadata: {
      created: Date.now(),
      lastLogin: Date.now() - Math.random() * 1000000,
      preferences: {
        theme: 'dark',
        notifications: true,
      }
    }
  }))
};

const order = {
  id: 'ORD-12345',
  items: new Array(50).fill(0).map((_, i) => ({
    id: i,
    price: Math.random() * 100,
    quantity: Math.floor(Math.random() * 10) + 1
  })),
  calculateTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
};

// Benchmark: No logs at all (removed from code)
bench('No logs - clean code', () => {
  function processOrder(order) {
    // No logging at all - clean production code
    const validation = { status: 'valid' };
    const payment = { id: 'PAY-123', status: 'success' };
    const result = { ...order, validation, payment };
    return result;
  }
  
  for (let i = 0; i < 1000; i++) {
    processOrder(order);
  }
});

// Benchmark: Lazy logs with debug disabled (production mode)
bench('Lazy logs (disabled) - production mode', () => {
  const log = makeLog({ 
    level: 'error', // Production mode - only errors
    log: {
      debug: mockConsole.log,
      info: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  function processOrder(order) {
    // These logs have near-zero cost when disabled
    log.debug(() => `Processing order ${order.id}`);
    log.debug(() => `Order details: ${JSON.stringify(order)}`);
    
    const validation = { status: 'valid' };
    log.debug(() => `Validation result: ${JSON.stringify(validation)}`);
    
    const payment = { id: 'PAY-123', status: 'success' };
    log(() => `Payment processed: ${payment.id}`); // info level
    
    const result = { ...order, validation, payment };
    log.debug(() => `Final result: ${JSON.stringify(result)}`);
    
    return result;
  }
  
  for (let i = 0; i < 1000; i++) {
    processOrder(order);
  }
});

// Benchmark: Complex scenario with no logs
bench('No logs - complex data processing', () => {
  function analyzeData(data) {
    const activeUsers = data.users.filter(u => u.id % 2 === 0);
    const totalUsers = data.users.length;
    const averageId = data.users.reduce((sum, u) => sum + u.id, 0) / totalUsers;
    
    return {
      activeCount: activeUsers.length,
      totalCount: totalUsers,
      averageId: averageId
    };
  }
  
  for (let i = 0; i < 1000; i++) {
    analyzeData(largeObject);
  }
});

// Benchmark: Complex scenario with lazy logs disabled
bench('Lazy logs (disabled) - complex data processing', () => {
  const log = makeLog({ 
    level: 'error',
    log: {
      debug: mockConsole.log,
      info: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  function analyzeData(data) {
    log.debug(() => `Analyzing ${data.users.length} users`);
    log.debug(() => `User data sample: ${JSON.stringify(data.users.slice(0, 5))}`);
    
    const activeUsers = data.users.filter(u => u.id % 2 === 0);
    log.debug(() => `Found ${activeUsers.length} active users`);
    log.debug(() => `Active user IDs: ${activeUsers.map(u => u.id).join(', ')}`);
    
    const totalUsers = data.users.length;
    const averageId = data.users.reduce((sum, u) => sum + u.id, 0) / totalUsers;
    
    log(() => `Analysis complete: ${activeUsers.length}/${totalUsers} active`);
    log.debug(() => `Detailed stats: ${JSON.stringify({ 
      activeCount: activeUsers.length, 
      totalCount: totalUsers, 
      averageId 
    })}`);
    
    return {
      activeCount: activeUsers.length,
      totalCount: totalUsers,
      averageId: averageId
    };
  }
  
  for (let i = 0; i < 1000; i++) {
    analyzeData(largeObject);
  }
});

// Benchmark: Tight loop with no logs
bench('No logs - tight loop (100k iterations)', () => {
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += i * 2;
    if (i % 1000 === 0) {
      // Some work every 1000 iterations
      Math.sqrt(sum);
    }
  }
  return sum;
});

// Benchmark: Tight loop with lazy logs disabled
bench('Lazy logs (disabled) - tight loop (100k iterations)', () => {
  const log = makeLog({ 
    level: 'error',
    log: {
      debug: mockConsole.log,
      trace: mockConsole.log,
      error: mockConsole.error,
    }
  });
  
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += i * 2;
    log.trace(() => `Iteration ${i}, sum: ${sum}`);
    
    if (i % 1000 === 0) {
      log.debug(() => `Milestone: ${i} iterations, sum: ${sum}`);
      const temp = Math.sqrt(sum);
    }
  }
  return sum;
});

// Run benchmarks
await run();