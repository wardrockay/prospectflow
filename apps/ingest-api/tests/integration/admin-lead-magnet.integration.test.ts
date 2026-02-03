/**
 * Integration Tests for Admin Lead Magnet API
 * Story: LM-007 - Dashboard Lead Magnet
 * 
 * Tests cover:
 * - Stats endpoint (AC7.15)
 * - Subscribers CRUD (AC7.16)
 * - CSV Export (AC7.7)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPool } from '../../src/config/database.js';
import { Pool } from 'pg';

describe('Admin Lead Magnet API', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = getPool();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('GET /api/admin/lead-magnet/stats', () => {
    it('should return stats for all time (default)', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total_signups');
      expect(response.body.data).toHaveProperty('confirmed');
      expect(response.body.data).toHaveProperty('confirmation_rate');
      expect(response.body.data).toHaveProperty('unique_downloaders');
      expect(response.body.data).toHaveProperty('total_downloads');
      expect(response.body.data).toHaveProperty('avg_hours_to_confirm');
    });

    it('should accept period query param (7d, 30d, 90d, all)', async () => {
      const periods = ['7d', '30d', '90d', 'all'];

      for (const period of periods) {
        const response = await request(app)
          .get(`/api/admin/lead-magnet/stats?period=${period}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should reject invalid period param', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/stats?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid period');
    });

    it('should handle zero subscribers gracefully', async () => {
      // This test assumes the DB might be empty or have data
      const response = await request(app)
        .get('/api/admin/lead-magnet/stats')
        .expect(200);

      // Should not throw even with 0 subscribers
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.total_signups).toBe('number');
    });
  });

  describe('GET /api/admin/lead-magnet/subscribers', () => {
    it('should return paginated subscribers list', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should accept pagination params', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers?page=1&limit=10')
        .expect(200);

      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should accept search param', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers?search=test@example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept sort params', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers?sortBy=email&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid page param', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers?page=0')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject limit > 100', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers?limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/lead-magnet/subscribers/export', () => {
    it('should return CSV content', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Check CSV has French headers as per AC7.7
      const csvContent = response.text;
      expect(csvContent).toContain('Email');
      expect(csvContent).toContain('Statut');
    });

    it('should accept search filter for export', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers/export?search=test')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('GET /api/admin/lead-magnet/subscribers/:id', () => {
    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/admin/lead-magnet/subscribers/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid subscriber ID');
    });

    it('should return 404 for non-existent subscriber', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/lead-magnet/subscribers/${fakeUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/lead-magnet/subscribers/:id', () => {
    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .delete('/api/admin/lead-magnet/subscribers/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent subscriber', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/admin/lead-magnet/subscribers/${fakeUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    // Note: Actual delete test should create a test subscriber first
    // and verify cascade delete behavior (RGPD compliance)
  });
});
