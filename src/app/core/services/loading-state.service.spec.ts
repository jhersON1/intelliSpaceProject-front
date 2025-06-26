import { LoadingStateService, LoadingOperation } from './loading-state.service';

describe('LoadingStateService', () => {
  let service: LoadingStateService;

  beforeEach(() => {
    // Crear instancia directa del servicio sin TestBed
    service = new LoadingStateService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have no loading operations initially', () => {
      expect(service.isLoading()).toBeFalsy();
      expect(service.loadingCount()).toBe(0);
      expect(service.currentOperations()).toEqual([]);
    });
  });

  describe('startLoading', () => {
    it('should start a loading operation with key only', () => {
      const key = 'test-operation';
      
      service.startLoading(key);
      
      expect(service.isLoading()).toBeTruthy();
      expect(service.loadingCount()).toBe(1);
      expect(service.isLoadingOperation(key)).toBeTruthy();
      expect(service.getOperationMessage(key)).toBeUndefined();
    });

    it('should start a loading operation with key and message', () => {
      const key = 'test-operation';
      const message = 'Loading data...';
      
      service.startLoading(key, message);
      
      expect(service.isLoading()).toBeTruthy();
      expect(service.loadingCount()).toBe(1);
      expect(service.isLoadingOperation(key)).toBeTruthy();
      expect(service.getOperationMessage(key)).toBe(message);
    });

    it('should update existing operation if same key is used', () => {
      const key = 'test-operation';
      const firstMessage = 'First message';
      const secondMessage = 'Second message';
      
      service.startLoading(key, firstMessage);
      expect(service.loadingCount()).toBe(1);
      expect(service.getOperationMessage(key)).toBe(firstMessage);
      
      service.startLoading(key, secondMessage);
      expect(service.loadingCount()).toBe(1);
      expect(service.getOperationMessage(key)).toBe(secondMessage);
    });

    it('should handle multiple concurrent operations', () => {
      service.startLoading('operation1', 'Message 1');
      service.startLoading('operation2', 'Message 2');
      service.startLoading('operation3');
      
      expect(service.isLoading()).toBeTruthy();
      expect(service.loadingCount()).toBe(3);
      expect(service.isLoadingOperation('operation1')).toBeTruthy();
      expect(service.isLoadingOperation('operation2')).toBeTruthy();
      expect(service.isLoadingOperation('operation3')).toBeTruthy();
    });

    it('should set timestamp for operations', () => {
      const beforeTime = Date.now();
      service.startLoading('test-operation');
      const afterTime = Date.now();
      
      const operations = service.currentOperations();
      expect(operations.length).toBe(1);
      expect(operations[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(operations[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('stopLoading', () => {
    it('should stop a loading operation', () => {
      const key = 'test-operation';
      
      service.startLoading(key);
      expect(service.isLoading()).toBeTruthy();
      
      service.stopLoading(key);
      expect(service.isLoading()).toBeFalsy();
      expect(service.loadingCount()).toBe(0);
      expect(service.isLoadingOperation(key)).toBeFalsy();
    });

    it('should not affect other operations when stopping one', () => {
      service.startLoading('operation1', 'Message 1');
      service.startLoading('operation2', 'Message 2');
      
      expect(service.loadingCount()).toBe(2);
      
      service.stopLoading('operation1');
      
      expect(service.loadingCount()).toBe(1);
      expect(service.isLoadingOperation('operation1')).toBeFalsy();
      expect(service.isLoadingOperation('operation2')).toBeTruthy();
      expect(service.getOperationMessage('operation2')).toBe('Message 2');
    });

    it('should handle stopping non-existent operation gracefully', () => {
      service.startLoading('existing-operation');
      
      expect(() => {
        service.stopLoading('non-existent-operation');
      }).not.toThrow();
      
      expect(service.loadingCount()).toBe(1);
      expect(service.isLoadingOperation('existing-operation')).toBeTruthy();
    });
  });

  describe('isLoadingOperation', () => {
    it('should return true for existing operation', () => {
      const key = 'test-operation';
      service.startLoading(key);
      
      expect(service.isLoadingOperation(key)).toBeTruthy();
    });

    it('should return false for non-existent operation', () => {
      expect(service.isLoadingOperation('non-existent')).toBeFalsy();
    });

    it('should return false after operation is stopped', () => {
      const key = 'test-operation';
      service.startLoading(key);
      service.stopLoading(key);
      
      expect(service.isLoadingOperation(key)).toBeFalsy();
    });
  });

  describe('stopAllLoading', () => {
    it('should stop all loading operations', () => {
      service.startLoading('operation1', 'Message 1');
      service.startLoading('operation2', 'Message 2');
      service.startLoading('operation3', 'Message 3');
      
      expect(service.loadingCount()).toBe(3);
      
      service.stopAllLoading();
      
      expect(service.isLoading()).toBeFalsy();
      expect(service.loadingCount()).toBe(0);
      expect(service.currentOperations()).toEqual([]);
      expect(service.isLoadingOperation('operation1')).toBeFalsy();
      expect(service.isLoadingOperation('operation2')).toBeFalsy();
      expect(service.isLoadingOperation('operation3')).toBeFalsy();
    });

    it('should work when no operations are running', () => {
      expect(() => {
        service.stopAllLoading();
      }).not.toThrow();
      
      expect(service.loadingCount()).toBe(0);
    });
  });

  describe('getOperationMessage', () => {
    it('should return message for existing operation', () => {
      const key = 'test-operation';
      const message = 'Test message';
      
      service.startLoading(key, message);
      
      expect(service.getOperationMessage(key)).toBe(message);
    });

    it('should return undefined for operation without message', () => {
      const key = 'test-operation';
      
      service.startLoading(key);
      
      expect(service.getOperationMessage(key)).toBeUndefined();
    });

    it('should return undefined for non-existent operation', () => {
      expect(service.getOperationMessage('non-existent')).toBeUndefined();
    });
  });

  describe('currentOperations', () => {
    it('should return array of current operations', () => {
      const op1 = { key: 'operation1', message: 'Message 1' };
      const op2 = { key: 'operation2', message: 'Message 2' };
      const op3 = { key: 'operation3' };
      
      service.startLoading(op1.key, op1.message);
      service.startLoading(op2.key, op2.message);
      service.startLoading(op3.key);
      
      const operations = service.currentOperations();
      
      expect(operations.length).toBe(3);
      
      // Verificar que todas las operaciones están presentes
      const keys = operations.map(op => op.key);
      expect(keys).toContain(op1.key);
      expect(keys).toContain(op2.key);
      expect(keys).toContain(op3.key);
      
      // Verificar estructura de las operaciones
      operations.forEach(op => {
        expect(op.key).toBeDefined();
        expect(op.timestamp).toBeDefined();
        expect(typeof op.timestamp).toBe('number');
      });
    });

    it('should return empty array when no operations are running', () => {
      expect(service.currentOperations()).toEqual([]);
    });

    it('should reflect changes when operations are added/removed', () => {
      service.startLoading('operation1');
      expect(service.currentOperations().length).toBe(1);
      
      service.startLoading('operation2');
      expect(service.currentOperations().length).toBe(2);
      
      service.stopLoading('operation1');
      expect(service.currentOperations().length).toBe(1);
      expect(service.currentOperations()[0].key).toBe('operation2');
    });
  });

  describe('Computed Signals Reactivity', () => {
    it('should update isLoading signal when operations change', () => {
      expect(service.isLoading()).toBeFalsy();
      
      service.startLoading('test');
      expect(service.isLoading()).toBeTruthy();
      
      service.stopLoading('test');
      expect(service.isLoading()).toBeFalsy();
    });

    it('should update loadingCount signal when operations change', () => {
      expect(service.loadingCount()).toBe(0);
      
      service.startLoading('test1');
      expect(service.loadingCount()).toBe(1);
      
      service.startLoading('test2');
      expect(service.loadingCount()).toBe(2);
      
      service.stopLoading('test1');
      expect(service.loadingCount()).toBe(1);
      
      service.stopAllLoading();
      expect(service.loadingCount()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string as key', () => {
      const key = '';
      
      service.startLoading(key, 'Empty key test');
      
      expect(service.isLoadingOperation(key)).toBeTruthy();
      expect(service.getOperationMessage(key)).toBe('Empty key test');
      expect(service.loadingCount()).toBe(1);
    });

    it('should handle special characters in key', () => {
      const key = 'test-operation_123!@#$%^&*()';
      
      service.startLoading(key, 'Special chars test');
      
      expect(service.isLoadingOperation(key)).toBeTruthy();
      expect(service.getOperationMessage(key)).toBe('Special chars test');
    });

    it('should handle very long messages', () => {
      const key = 'test-operation';
      const longMessage = 'A'.repeat(1000);
      
      service.startLoading(key, longMessage);
      
      expect(service.getOperationMessage(key)).toBe(longMessage);
    });
  });
});
