import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logger,
  createChildLogger,
  createRequestLogger,
  timeOperation,
} from '../../../src/utils/logger.js';

describe('Logger Module', () => {
  describe('createChildLogger', () => {
    it('should create child logger with module context', () => {
      const childLogger = createChildLogger('TestModule');
      expect(childLogger).toBeDefined();
      expect(childLogger.bindings().module).toBe('TestModule');
    });

    it('should include additional context', () => {
      const childLogger = createChildLogger('TestModule', { customField: 'value' });
      const bindings = childLogger.bindings();
      expect(bindings.module).toBe('TestModule');
      expect(bindings.customField).toBe('value');
    });
  });

  describe('createRequestLogger', () => {
    it('should create logger with request ID', () => {
      const requestId = 'test-request-123';
      const requestLogger = createRequestLogger(requestId);
      expect(requestLogger.bindings().requestId).toBe(requestId);
    });

    it('should include user context', () => {
      const requestLogger = createRequestLogger('req-123', {
        userId: 'user-456',
        organisationId: 'org-789',
      });
      const bindings = requestLogger.bindings();
      expect(bindings.userId).toBe('user-456');
      expect(bindings.organisationId).toBe('org-789');
    });
  });

  describe('timeOperation', () => {
    it('should time successful operations', async () => {
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      const result = await timeOperation(childLogger, 'test.operation', async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log failed operations and rethrow', async () => {
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      await expect(
        timeOperation(childLogger, 'test.operation', async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should measure operation duration', async () => {
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      await timeOperation(childLogger, 'test.operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'done';
      });

      expect(infoSpy).toHaveBeenCalled();
      const callArgs = infoSpy.mock.calls[0][0] as { durationMs: number };
      expect(callArgs.durationMs).toBeGreaterThanOrEqual(40);
    });
  });

  describe('logPerformance', () => {
    it('should use warn level for slow operations (> 1000ms)', async () => {
      const { logPerformance } = await import('../../../src/utils/logger.js');
      const childLogger = createChildLogger('Test');
      const warnSpy = vi.spyOn(childLogger, 'warn');

      logPerformance(childLogger, 'slow.operation', 1500, true);

      expect(warnSpy).toHaveBeenCalled();
      const callArgs = warnSpy.mock.calls[0][0] as { durationMs: number; operation: string };
      expect(callArgs.durationMs).toBe(1500);
      expect(callArgs.operation).toBe('slow.operation');
    });

    it('should use info level for fast operations (<= 1000ms)', async () => {
      const { logPerformance } = await import('../../../src/utils/logger.js');
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      logPerformance(childLogger, 'fast.operation', 500, true);

      expect(infoSpy).toHaveBeenCalled();
      const callArgs = infoSpy.mock.calls[0][0] as { durationMs: number; operation: string };
      expect(callArgs.durationMs).toBe(500);
    });
  });

  describe('root logger', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });
});
