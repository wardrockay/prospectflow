/**
 * Session Service Unit Tests
 * Tests Redis session CRUD operations with sliding expiration
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis client before imports - must use inline object to avoid hoisting issues
vi.mock('../../../src/config/redis', () => ({
  redisClient: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    scan: vi.fn(),
  },
  redisConfig: {
    sessionTTL: 86400, // 24 hours
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { SessionService, sessionService } from '../../../src/services/session.service';
import { redisClient } from '../../../src/config/redis';
import { CreateSessionPayload, UserSession } from '../../../src/types/session';

describe('SessionService', () => {
  const testOrgId = uuidv4();
  const testCognitoSub = uuidv4();

  const createTestPayload = (): CreateSessionPayload => ({
    cognitoSub: testCognitoSub,
    organisationId: testOrgId,
    role: 'user',
    email: 'test@example.com',
    cognitoGroups: ['user'],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  });

  const createTestSession = (): UserSession => ({
    cognitoSub: testCognitoSub,
    organisationId: testOrgId,
    role: 'user',
    email: 'test@example.com',
    cognitoGroups: ['user'],
    lastActivity: Date.now(),
    createdAt: Date.now(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session with correct key format and TTL', async () => {
      // Arrange
      const payload = createTestPayload();
      redisClient.setEx.mockResolvedValue('OK');

      // Act
      const session = await sessionService.createSession(payload);

      // Assert
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `session:${testCognitoSub}`,
        86400, // 24 hours TTL
        expect.any(String),
      );
      expect(session.cognitoSub).toBe(testCognitoSub);
      expect(session.organisationId).toBe(testOrgId);
      expect(session.email).toBe('test@example.com');
      expect(session.role).toBe('user');
      expect(session.cognitoGroups).toEqual(['user']);
    });

    it('should store session with timestamps', async () => {
      // Arrange
      const payload = createTestPayload();
      redisClient.setEx.mockResolvedValue('OK');
      const beforeCreate = Date.now();

      // Act
      const session = await sessionService.createSession(payload);
      const afterCreate = Date.now();

      // Assert
      expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(session.lastActivity).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.lastActivity).toBeLessThanOrEqual(afterCreate);
    });

    it('should store ipAddress and userAgent when provided', async () => {
      // Arrange
      const payload = createTestPayload();
      redisClient.setEx.mockResolvedValue('OK');

      // Act
      const session = await sessionService.createSession(payload);

      // Assert
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.userAgent).toBe('test-agent');
    });

    it('should throw error when Redis fails', async () => {
      // Arrange
      const payload = createTestPayload();
      redisClient.setEx.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(sessionService.createSession(payload)).rejects.toThrow(
        'Session creation failed',
      );
    });
  });

  describe('getSession', () => {
    it('should retrieve and parse session from Redis', async () => {
      // Arrange
      const storedSession = createTestSession();
      redisClient.get.mockResolvedValue(JSON.stringify(storedSession));

      // Act
      const session = await sessionService.getSession(testCognitoSub);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith(`session:${testCognitoSub}`);
      expect(session).toEqual(storedSession);
    });

    it('should return null for non-existent session', async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);

      // Act
      const session = await sessionService.getSession('non-existent-sub');

      // Assert
      expect(session).toBeNull();
    });

    it('should return null when Redis fails', async () => {
      // Arrange
      redisClient.get.mockRejectedValue(new Error('Redis error'));

      // Act
      const session = await sessionService.getSession(testCognitoSub);

      // Assert
      expect(session).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity timestamp and refresh TTL', async () => {
      // Arrange
      const oldSession = createTestSession();
      oldSession.lastActivity = Date.now() - 3600000; // 1 hour ago
      redisClient.get.mockResolvedValue(JSON.stringify(oldSession));
      redisClient.setEx.mockResolvedValue('OK');

      const beforeUpdate = Date.now();

      // Act
      const result = await sessionService.updateActivity(testCognitoSub);
      const afterUpdate = Date.now();

      // Assert
      expect(result).toBe(true);
      expect(redisClient.setEx).toHaveBeenCalled();

      // Verify the stored data has updated lastActivity
      const storedData = JSON.parse(redisClient.setEx.mock.calls[0][2]);
      expect(storedData.lastActivity).toBeGreaterThanOrEqual(beforeUpdate);
      expect(storedData.lastActivity).toBeLessThanOrEqual(afterUpdate);
    });

    it('should refresh TTL to 24 hours (sliding expiration)', async () => {
      // Arrange
      const session = createTestSession();
      redisClient.get.mockResolvedValue(JSON.stringify(session));
      redisClient.setEx.mockResolvedValue('OK');

      // Act
      await sessionService.updateActivity(testCognitoSub);

      // Assert - TTL should be refreshed to 86400 seconds
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `session:${testCognitoSub}`,
        86400,
        expect.any(String),
      );
    });

    it('should return false for non-existent session', async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);

      // Act
      const result = await sessionService.updateActivity('non-existent');

      // Assert
      expect(result).toBe(false);
      expect(redisClient.setEx).not.toHaveBeenCalled();
    });

    it('should return false when Redis fails', async () => {
      // Arrange
      redisClient.get.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await sessionService.updateActivity(testCognitoSub);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('should delete session and return true', async () => {
      // Arrange
      redisClient.del.mockResolvedValue(1);

      // Act
      const result = await sessionService.deleteSession(testCognitoSub);

      // Assert
      expect(redisClient.del).toHaveBeenCalledWith(`session:${testCognitoSub}`);
      expect(result).toBe(true);
    });

    it('should return false when session not found', async () => {
      // Arrange
      redisClient.del.mockResolvedValue(0);

      // Act
      const result = await sessionService.deleteSession('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should throw error when Redis fails', async () => {
      // Arrange
      redisClient.del.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(sessionService.deleteSession(testCognitoSub)).rejects.toThrow(
        'Session deletion failed',
      );
    });
  });

  describe('deleteOrganisationSessions', () => {
    it('should delete all sessions for an organisation', async () => {
      // Arrange
      const session1 = { ...createTestSession(), cognitoSub: 'user-1' };
      const session2 = { ...createTestSession(), cognitoSub: 'user-2' };
      const otherOrgSession = { ...createTestSession(), organisationId: 'other-org' };

      redisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: ['session:user-1', 'session:user-2', 'session:user-3'],
      });

      redisClient.get
        .mockResolvedValueOnce(JSON.stringify(session1))
        .mockResolvedValueOnce(JSON.stringify(session2))
        .mockResolvedValueOnce(JSON.stringify(otherOrgSession));

      redisClient.del.mockResolvedValue(1);

      // Act
      const deletedCount = await sessionService.deleteOrganisationSessions(testOrgId);

      // Assert
      expect(deletedCount).toBe(2); // Only 2 sessions match the org
    });

    it('should handle empty scan result', async () => {
      // Arrange
      redisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: [],
      });

      // Act
      const deletedCount = await sessionService.deleteOrganisationSessions(testOrgId);

      // Assert
      expect(deletedCount).toBe(0);
    });
  });

  describe('getSessionTTL', () => {
    it('should return TTL in seconds', async () => {
      // Arrange
      redisClient.ttl.mockResolvedValue(43200); // 12 hours remaining

      // Act
      const ttl = await sessionService.getSessionTTL(testCognitoSub);

      // Assert
      expect(redisClient.ttl).toHaveBeenCalledWith(`session:${testCognitoSub}`);
      expect(ttl).toBe(43200);
    });

    it('should return -2 for non-existent key', async () => {
      // Arrange
      redisClient.ttl.mockResolvedValue(-2);

      // Act
      const ttl = await sessionService.getSessionTTL('non-existent');

      // Assert
      expect(ttl).toBe(-2);
    });

    it('should return -2 when Redis fails', async () => {
      // Arrange
      redisClient.ttl.mockRejectedValue(new Error('Redis error'));

      // Act
      const ttl = await sessionService.getSessionTTL(testCognitoSub);

      // Assert
      expect(ttl).toBe(-2);
    });
  });

  describe('getActiveSessionsCount', () => {
    it('should count all active sessions', async () => {
      // Arrange
      redisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: ['session:1', 'session:2', 'session:3'],
      });

      // Act
      const count = await sessionService.getActiveSessionsCount();

      // Assert
      expect(count).toBe(3);
    });

    it('should handle pagination in scan', async () => {
      // Arrange
      redisClient.scan
        .mockResolvedValueOnce({
          cursor: 100,
          keys: ['session:1', 'session:2'],
        })
        .mockResolvedValueOnce({
          cursor: 0,
          keys: ['session:3', 'session:4', 'session:5'],
        });

      // Act
      const count = await sessionService.getActiveSessionsCount();

      // Assert
      expect(count).toBe(5);
      expect(redisClient.scan).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when Redis fails', async () => {
      // Arrange
      redisClient.scan.mockRejectedValue(new Error('Redis error'));

      // Act
      const count = await sessionService.getActiveSessionsCount();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Session Expiration', () => {
    it('should configure 24-hour TTL by default', async () => {
      // Arrange
      const payload = createTestPayload();
      redisClient.setEx.mockResolvedValue('OK');

      // Act
      await sessionService.createSession(payload);

      // Assert
      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.any(String),
        86400, // 24 hours = 86400 seconds
        expect.any(String),
      );
    });
  });
});
