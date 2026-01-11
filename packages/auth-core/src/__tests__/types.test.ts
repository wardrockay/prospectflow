/**
 * Types Tests
 * Validates type exports and interfaces
 */
import { describe, it, expect } from 'vitest';
import type { CognitoJwtPayload, UserSession, CreateSessionPayload } from '../index';

describe('Type Exports', () => {
  it('should export CognitoJwtPayload type', () => {
    const payload: CognitoJwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      'cognito:groups': ['admin'],
      'custom:organisation_id': 'org-123',
      'custom:role': 'admin',
      token_use: 'id',
      iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_TestPool',
      iat: 1234567890,
      exp: 1234567890,
    };

    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
  });

  it('should export UserSession type', () => {
    const session: UserSession = {
      cognitoSub: 'user-123',
      organisationId: 'org-456',
      role: 'user',
      email: 'user@example.com',
      cognitoGroups: ['users'],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    expect(session.cognitoSub).toBe('user-123');
    expect(session.organisationId).toBe('org-456');
  });

  it('should export CreateSessionPayload type', () => {
    const payload: CreateSessionPayload = {
      cognitoSub: 'user-123',
      organisationId: 'org-456',
      role: 'admin',
      email: 'admin@example.com',
      cognitoGroups: ['admin'],
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    expect(payload.cognitoSub).toBe('user-123');
    expect(payload.role).toBe('admin');
  });
});
