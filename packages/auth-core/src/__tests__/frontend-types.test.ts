/**
 * Frontend Types Tests
 * Validates frontend-safe type exports
 */
import { describe, it, expect } from 'vitest';
import type { AuthUser, AuthSession } from '../frontend/types';

describe('Frontend Type Exports', () => {
  it('should export AuthUser type', () => {
    const user: AuthUser = {
      sub: 'user-123',
      email: 'user@example.com',
      organisationId: 'org-456',
      role: 'admin',
      groups: ['admin', 'users'],
    };

    expect(user.sub).toBe('user-123');
    expect(user.email).toBe('user@example.com');
    expect(user.organisationId).toBe('org-456');
  });

  it('should export AuthSession type', () => {
    const session: AuthSession = {
      user: {
        sub: 'user-123',
        email: 'user@example.com',
        organisationId: 'org-456',
        role: 'user',
        groups: ['users'],
      },
      expiresAt: Date.now() + 3600000,
    };

    expect(session.user.sub).toBe('user-123');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });
});
