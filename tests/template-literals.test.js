// Use Bun's test framework when available, fallback to cross-runtime setup
import { getTestModule } from './test-import-helper.js';
const testModule = await getTestModule();
const { describe, test, expect, beforeEach, afterEach, mock, spyOn } = testModule;
import makeLog from '../src/index.js';

describe('Template Literal Lazy Evaluation', () => {
  let consoleErrorSpy, consoleWarnSpy, consoleLogSpy;
  
  beforeEach(() => {
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('should evaluate template literals lazily with () => syntax', () => {
    const log = makeLog({ level: 'all' }); // makeLog returns log directly
    
    const expensiveOperation = mock(() => 'expensive');
    const data = { test: 'data' };
    
    // Template literal with expensive operations
    log.info(() => `Data: ${JSON.stringify(data)}, Result: ${expensiveOperation()}`);
    
    expect(expensiveOperation).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('Data: {"test":"data"}');
    expect(loggedMessage).toContain('Result: expensive');
  });

  test('should not evaluate template literals when logging is disabled', () => {
    const log = makeLog({ level: 'error' }); // Only error level
    
    const expensiveOperation = mock(() => {
      throw new Error('Should not be called!');
    });
    
    // These should not execute since debug/info are disabled
    log.debug(() => `Debug: ${expensiveOperation()}`);
    log.info(() => `Info: ${expensiveOperation()}`);
    
    expect(expensiveOperation).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('should handle complex template literals with multiple expressions', () => {
    const log = makeLog({ level: 'all' });
    
    const users = [{ id: 1, active: true }, { id: 2, active: false }, { id: 3, active: true }];
    const calculateTotal = mock(() => 150.50);
    
    log.info(() => `Found ${users.filter(u => u.active).length} active users, total revenue: $${calculateTotal()}`);
    
    expect(calculateTotal).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toBe('Found 2 active users, total revenue: $150.5');
  });

  test('should work with multi-line template literals', () => {
    const log = makeLog({ level: 'all' });
    
    const order = {
      id: '12345',
      items: ['item1', 'item2'],
      total: 99.99,
      customer: { name: 'John Doe' }
    };
    
    log.error(() => `Order failed:
      Order ID: ${order.id}
      Items: ${order.items.length}
      Total: $${order.total}
      Customer: ${order.customer.name}
      Timestamp: ${new Date().toISOString().substring(0, 10)}`);
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('Order ID: 12345');
    expect(loggedMessage).toContain('Items: 2');
    expect(loggedMessage).toContain('Total: $99.99');
    expect(loggedMessage).toContain('Customer: John Doe');
  });

  test('should handle JSON.stringify in template literals efficiently', () => {
    const log = makeLog({ level: 'none' }); // Disable all logging
    
    const largeObject = {
      data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }))
    };
    
    const stringifySpy = mock(() => JSON.stringify(largeObject));
    
    // This should not execute since logging is disabled
    log.debug(() => `Large object: ${stringifySpy()}`);
    
    expect(stringifySpy).not.toHaveBeenCalled();
  });

  test('should work with shorter log() syntax as shown in README', () => {
    const log = makeLog({ level: 'all' }); // Enable all levels for testing
    
    const port = 3000;
    const error = new Error('Connection failed');
    
    // Examples from README
    log.info(() => `Server started on port ${port}`);
    expect(consoleLogSpy).toHaveBeenCalledWith('Server started on port 3000');
    
    log.error(() => `Failed to connect: ${error.message}`);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to connect: Connection failed');
  });

  test('should handle expensive calculations in template literals', () => {
    const log = makeLog({ level: 'all' });
    
    const order = {
      id: 'ORD-001',
      items: [
        { name: 'Product A', price: 29.99, quantity: 2 },
        { name: 'Product B', price: 49.99, quantity: 1 }
      ],
      calculateTotal: function() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
    };
    
    const calculateTotalSpy = spyOn(order, 'calculateTotal');
    
    log.info(() => `Processing order #${order.id} with ${order.items.length} items totaling $${order.calculateTotal()}`);
    
    expect(calculateTotalSpy).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toBe('Processing order #ORD-001 with 2 items totaling $109.97');
  });

  test('should not execute expensive calculations when disabled', () => {
    const log = makeLog({ level: 'warn' }); // Only warn and above
    
    const order = {
      id: 'ORD-002',
      items: [],
      calculateTotal: mock(() => {
        throw new Error('Should not calculate!');
      })
    };
    
    // This should not execute calculateTotal since info is disabled
    log.info(() => `Order #${order.id} total: $${order.calculateTotal()}`);
    
    expect(order.calculateTotal).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test('real-world example from README should work', () => {
    const log = makeLog({ level: 'info' });
    
    function processOrder(order) {
      // Mock functions for testing
      const performExpensiveValidation = mock(() => 'validation-result');
      const submitOrder = mock(() => ({
        id: 'ORD-123',
        items: [{ name: 'item1' }, { name: 'item2' }],
        calculateTotal: () => 299.99
      }));
      
      log.debug(() => `Processing order ${JSON.stringify(order)}`);
      log.debug(() => `Validation details: ${performExpensiveValidation()}`);
      
      // Debug logs should not execute (level is info)
      expect(performExpensiveValidation).not.toHaveBeenCalled();
      
      const result = submitOrder(order);
      
      // Info logs should execute
      log.info(() => `Order #${result.id} submitted with ${result.items.length} items, total: $${result.calculateTotal()}`);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toBe('Order #ORD-123 submitted with 2 items, total: $299.99');
      
      return result;
    }
    
    processOrder({ id: 'test-order' });
  });

  test('should handle the migration pattern: just add () =>', () => {
    const log = makeLog({ level: 'all' });
    
    const user = { id: 1, name: 'Alice', role: 'admin' };
    const posts = [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }];
    
    // Original style (would always evaluate):
    // logger.debug(`User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);
    
    // New style - just add () =>
    log.debug(() => `User data: ${JSON.stringify(user)}, Posts: ${JSON.stringify(posts)}`);
    
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('"name":"Alice"');
    expect(loggedMessage).toContain('"title":"Post 1"');
  });
});