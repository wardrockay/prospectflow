/**
 * User Sync Service Unit Tests
 * Tests Cognito-to-Database user synchronization on first login
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock database pool - must use inline to avoid hoisting issues
vi.mock('../../../src/config/database', () => ({
  pool: {
    query: vi.fn(),
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
import { UserSyncService, userSyncService, User } from '../../../src/services/user-sync.service';
import { pool } from '../../../src/config/database';
import { CognitoJwtPayload } from '../../../src/types/cognito';

// Get the mocked query function
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

describe('UserSyncService', () => {
  const testOrgId = uuidv4();
  const testCognitoSub = uuidv4();
  const testUserId = uuidv4();

  const createMockJwtPayload = (overrides?: Partial<CognitoJwtPayload>): CognitoJwtPayload => ({
    sub: testCognitoSub,
    email: 'test@example.com',
    'custom:organisation_id': testOrgId,
    'custom:role': 'user',
    'cognito:groups': ['user'],
    token_use: 'id',
    iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Test',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  });

  const createMockUser = (): User => ({
    id: testUserId,
    cognito_sub: testCognitoSub,
    email: 'test@example.com',
    organisation_id: testOrgId,
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('syncUser', () => {
    it('should return existing user if already in database', async () => {
      // Arrange
      const payload = createMockJwtPayload();
      const existingUser = createMockUser();

      // First query: findUserByCognitoSub - user exists
      mockQuery.mockResolvedValueOnce({ rows: [existingUser] });

      // Act
      const result = await userSyncService.syncUser(payload);

      // Assert
      expect(result).toEqual(existingUser);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [testCognitoSub]);
    });

    it('should create new user if not in database', async () => {
      // Arrange
      const payload = createMockJwtPayload();
      const newUser = createMockUser();

      // First query: findUserByCognitoSub - user not found
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second query: createUser
      mockQuery.mockResolvedValueOnce({ rows: [newUser] });

      // Act
      const result = await userSyncService.syncUser(payload);

      // Assert
      expect(result).toEqual(newUser);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      // Verify INSERT was called
      expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO iam.users'), [
        testCognitoSub,
        'test@example.com',
        testOrgId,
        'user',
      ]);
    });

    it('should use default role "user" when not provided in JWT', async () => {
      // Arrange
      const payload = createMockJwtPayload({ 'custom:role': undefined });
      const newUser = createMockUser();

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Not found
      mockQuery.mockResolvedValueOnce({ rows: [newUser] }); // Insert

      // Act
      await userSyncService.syncUser(payload);

      // Assert
      expect(mockQuery).toHaveBeenLastCalledWith(expect.any(String), [
        testCognitoSub,
        'test@example.com',
        testOrgId,
        'user',
      ]);
    });

    it('should throw error when organisation_id is missing', async () => {
      // Arrange
      const payload = createMockJwtPayload({ 'custom:organisation_id': undefined });

      // Act & Assert
      await expect(userSyncService.syncUser(payload)).rejects.toThrow(
        'User synchronization failed',
      );
    });

    it('should handle race condition (unique constraint violation)', async () => {
      // Arrange
      const payload = createMockJwtPayload();
      const existingUser = createMockUser();

      // First query: findUserByCognitoSub - not found
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second query: createUser - unique constraint error
      mockQuery.mockRejectedValueOnce(new Error('unique constraint violation'));
      // Third query: retry findUserByCognitoSub
      mockQuery.mockResolvedValueOnce({ rows: [existingUser] });

      // Act
      const result = await userSyncService.syncUser(payload);

      // Assert
      expect(result).toEqual(existingUser);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error when race condition handler also fails', async () => {
      // Arrange
      const payload = createMockJwtPayload();

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Not found
      mockQuery.mockRejectedValueOnce(new Error('unique constraint violation'));
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Still not found (weird state)

      // Act & Assert
      await expect(userSyncService.syncUser(payload)).rejects.toThrow(
        'User synchronization failed',
      );
    });

    it('should propagate database errors', async () => {
      // Arrange
      const payload = createMockJwtPayload();
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(userSyncService.syncUser(payload)).rejects.toThrow(
        'User synchronization failed',
      );
    });
  });

  describe('updateUser', () => {
    it('should update user email', async () => {
      // Arrange
      const updatedUser = { ...createMockUser(), email: 'new@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      // Act
      const result = await userSyncService.updateUser(testCognitoSub, { email: 'new@example.com' });

      // Assert
      expect(result.email).toBe('new@example.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE iam.users'),
        expect.arrayContaining(['new@example.com', testCognitoSub]),
      );
    });

    it('should update user role', async () => {
      // Arrange
      const updatedUser = { ...createMockUser(), role: 'admin' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      // Act
      const result = await userSyncService.updateUser(testCognitoSub, { role: 'admin' });

      // Assert
      expect(result.role).toBe('admin');
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const updatedUser = { ...createMockUser(), email: 'new@example.com', role: 'admin' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      // Act
      const result = await userSyncService.updateUser(testCognitoSub, {
        email: 'new@example.com',
        role: 'admin',
      });

      // Assert
      expect(result.email).toBe('new@example.com');
      expect(result.role).toBe('admin');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        userSyncService.updateUser('non-existent', { email: 'test@example.com' }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user and return true', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      // Act
      const result = await userSyncService.deleteUser(testCognitoSub);

      // Assert
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_active = false'), [
        testCognitoSub,
      ]);
    });

    it('should return false when user not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      // Act
      const result = await userSyncService.deleteUser('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should propagate database errors', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(userSyncService.deleteUser(testCognitoSub)).rejects.toThrow('Database error');
    });
  });

  describe('Integration with Cognito JWT', () => {
    it('should correctly extract all fields from JWT payload', async () => {
      // Arrange
      const payload = createMockJwtPayload({
        sub: 'cognito-sub-12345',
        email: 'integration@test.com',
        'custom:organisation_id': 'org-id-12345',
        'custom:role': 'admin',
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Not found
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-id',
            cognito_sub: 'cognito-sub-12345',
            email: 'integration@test.com',
            organisation_id: 'org-id-12345',
            role: 'admin',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      // Act
      const result = await userSyncService.syncUser(payload);

      // Assert
      expect(result.cognito_sub).toBe('cognito-sub-12345');
      expect(result.email).toBe('integration@test.com');
      expect(result.organisation_id).toBe('org-id-12345');
      expect(result.role).toBe('admin');
    });
  });
});
