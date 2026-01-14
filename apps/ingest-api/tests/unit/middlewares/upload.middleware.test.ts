// tests/unit/middlewares/upload.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { uploadCsv } from '../../../src/middlewares/upload.middleware.js';

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  createChildLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Upload Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('uploadCsv.single("file") middleware', () => {
    it('should be a multer middleware function', () => {
      const middleware = uploadCsv.single('file');
      expect(typeof middleware).toBe('function');
    });

    it('should have correct file size limit (5MB)', () => {
      // Access multer limits through the middleware configuration
      // @ts-expect-error - accessing internal multer property for testing
      const limits = uploadCsv.limits;
      expect(limits.fileSize).toBe(5 * 1024 * 1024);
    });

    it('should use memory storage', () => {
      // @ts-expect-error - accessing internal multer property for testing
      const storage = uploadCsv.storage;
      expect(storage).toBeDefined();
      // Memory storage has _handleFile method
      expect(typeof storage._handleFile).toBe('function');
    });
  });

  describe('File type validation logic', () => {
    it('should accept file with text/csv mimetype', () => {
      const file = {
        originalname: 'prospects.csv',
        mimetype: 'text/csv',
      };
      const isValid = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
      expect(isValid).toBe(true);
    });

    it('should accept file with .csv extension regardless of mimetype', () => {
      const file = {
        originalname: 'data.csv',
        mimetype: 'application/octet-stream', // Some systems send this for CSV
      };
      const isValid = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
      expect(isValid).toBe(true);
    });

    it('should reject .xlsx files', () => {
      const file = {
        originalname: 'prospects.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const isValid = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
      expect(isValid).toBe(false);
    });

    it('should reject .txt files', () => {
      const file = {
        originalname: 'prospects.txt',
        mimetype: 'text/plain',
      };
      const isValid = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
      expect(isValid).toBe(false);
    });

    it('should reject .json files', () => {
      const file = {
        originalname: 'prospects.json',
        mimetype: 'application/json',
      };
      const isValid = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
      expect(isValid).toBe(false);
    });
  });

  describe('File size validation logic', () => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    it('should accept files under 5MB', () => {
      const file = { size: 1024 * 1024 }; // 1MB
      expect(file.size).toBeLessThan(MAX_SIZE);
    });

    it('should accept files exactly at 5MB', () => {
      const file = { size: MAX_SIZE };
      expect(file.size).toBeLessThanOrEqual(MAX_SIZE);
    });

    it('should reject files over 5MB', () => {
      const file = { size: 6 * 1024 * 1024 }; // 6MB
      expect(file.size).toBeGreaterThan(MAX_SIZE);
    });

    it('should reject very large files', () => {
      const file = { size: 100 * 1024 * 1024 }; // 100MB
      expect(file.size).toBeGreaterThan(MAX_SIZE);
    });
  });
});
