/**
 * Integration Tests for Nurture Sequences API
 * Story: LM-007 - Dashboard Lead Magnet
 * 
 * Tests cover:
 * - Sequences CRUD (AC7.17)
 * - Sequence emails management (AC7.10)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Nurture Sequences API', () => {
  let createdSequenceId: string;

  describe('GET /api/admin/nurture-sequences', () => {
    it('should return list of nurture sequences', async () => {
      const response = await request(app)
        .get('/api/admin/nurture-sequences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/admin/nurture-sequences', () => {
    it('should create a new nurture sequence', async () => {
      const newSequence = {
        name: 'Test Sequence',
        description: 'A test nurture sequence',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/admin/nurture-sequences')
        .send(newSequence)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newSequence.name);
      expect(response.body.data.status).toBe('draft');
      
      createdSequenceId = response.body.data.id;
    });

    it('should default status to draft', async () => {
      const newSequence = {
        name: 'Default Status Sequence'
      };

      const response = await request(app)
        .post('/api/admin/nurture-sequences')
        .send(newSequence)
        .expect(201);

      expect(response.body.data.status).toBe('draft');
    });

    it('should reject invalid status', async () => {
      const invalidSequence = {
        name: 'Invalid Status',
        status: 'invalid'
      };

      const response = await request(app)
        .post('/api/admin/nurture-sequences')
        .send(invalidSequence)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty name', async () => {
      const invalidSequence = {
        name: ''
      };

      const response = await request(app)
        .post('/api/admin/nurture-sequences')
        .send(invalidSequence)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/nurture-sequences/:id', () => {
    it('should return sequence with emails', async () => {
      // First create a sequence
      const createResponse = await request(app)
        .post('/api/admin/nurture-sequences')
        .send({ name: 'Sequence with Emails' })
        .expect(201);

      const sequenceId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/admin/nurture-sequences/${sequenceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(sequenceId);
      expect(response.body.data).toHaveProperty('emails');
      expect(Array.isArray(response.body.data.emails)).toBe(true);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/admin/nurture-sequences/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent sequence', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/nurture-sequences/${fakeUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/nurture-sequences/:id', () => {
    it('should update sequence', async () => {
      // Create sequence first
      const createResponse = await request(app)
        .post('/api/admin/nurture-sequences')
        .send({ name: 'To Update' })
        .expect(201);

      const sequenceId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/admin/nurture-sequences/${sequenceId}`)
        .send({ name: 'Updated Name', status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.status).toBe('active');
    });
  });

  describe('POST /api/admin/nurture-sequences/:id/emails', () => {
    it('should add email to sequence', async () => {
      // Create sequence first
      const createResponse = await request(app)
        .post('/api/admin/nurture-sequences')
        .send({ name: 'Sequence for Emails' })
        .expect(201);

      const sequenceId = createResponse.body.data.id;

      const newEmail = {
        order_index: 1,
        subject: 'First Email',
        delay_days: 0
      };

      const response = await request(app)
        .post(`/api/admin/nurture-sequences/${sequenceId}/emails`)
        .send(newEmail)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('First Email');
      expect(response.body.data.order_index).toBe(1);
    });

    it('should reject negative delay_days', async () => {
      // Create sequence first
      const createResponse = await request(app)
        .post('/api/admin/nurture-sequences')
        .send({ name: 'Sequence for Invalid Email' })
        .expect(201);

      const sequenceId = createResponse.body.data.id;

      const invalidEmail = {
        order_index: 1,
        subject: 'Invalid Email',
        delay_days: -1
      };

      const response = await request(app)
        .post(`/api/admin/nurture-sequences/${sequenceId}/emails`)
        .send(invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/nurture-sequences/:id', () => {
    it('should delete sequence and cascade emails', async () => {
      // Create sequence with email
      const createResponse = await request(app)
        .post('/api/admin/nurture-sequences')
        .send({ name: 'To Delete' })
        .expect(201);

      const sequenceId = createResponse.body.data.id;

      // Add an email
      await request(app)
        .post(`/api/admin/nurture-sequences/${sequenceId}/emails`)
        .send({ order_index: 1, subject: 'Email to delete', delay_days: 0 })
        .expect(201);

      // Delete sequence
      const response = await request(app)
        .delete(`/api/admin/nurture-sequences/${sequenceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's gone
      await request(app)
        .get(`/api/admin/nurture-sequences/${sequenceId}`)
        .expect(404);
    });
  });
});
