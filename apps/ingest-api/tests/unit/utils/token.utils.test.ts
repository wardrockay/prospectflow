import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, verifyToken } from '../../../src/utils/token.utils.js';

describe('Token utilities', () => {
  describe('generateToken', () => {
    it('should generate unique tokens', () => {
      const result1 = generateToken();
      const result2 = generateToken();
      
      expect(result1.token).not.toBe(result2.token);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate tokens with minimum length', () => {
      const result = generateToken();
      
      // 32 bytes in base64url should be at least 40 characters
      expect(result.token.length).toBeGreaterThan(40);
    });

    it('should generate URL-safe tokens', () => {
      const result = generateToken();
      
      // base64url uses only alphanumeric, -, and _
      expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate SHA-256 hashes', () => {
      const result = generateToken();
      
      // SHA-256 produces 64-character hex string
      expect(result.hash.length).toBe(64);
      expect(result.hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string', () => {
      const hash = hashToken('test-token');
      
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('verifyToken', () => {
    it('should verify matching token and hash', () => {
      const { token, hash } = generateToken();
      
      expect(verifyToken(token, hash)).toBe(true);
    });

    it('should reject non-matching token', () => {
      const { hash } = generateToken();
      const wrongToken = 'wrong-token-123';
      
      expect(verifyToken(wrongToken, hash)).toBe(false);
    });

    it('should reject token with wrong hash', () => {
      const { token } = generateToken();
      const wrongHash = hashToken('different-token');
      
      expect(verifyToken(token, wrongHash)).toBe(false);
    });

    it('should handle generated token pairs correctly', () => {
      const result = generateToken();
      
      // Verify that hash of token matches stored hash
      expect(hashToken(result.token)).toBe(result.hash);
      expect(verifyToken(result.token, result.hash)).toBe(true);
    });
  });

  describe('Security requirements', () => {
    it('should not expose plain token in hash', () => {
      const plainToken = 'my-secret-token';
      const hash = hashToken(plainToken);
      
      // Hash should not contain the plain token
      expect(hash.toLowerCase()).not.toContain(plainToken.toLowerCase());
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const { token } = generateToken();
        tokens.add(token);
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });
  });
});
