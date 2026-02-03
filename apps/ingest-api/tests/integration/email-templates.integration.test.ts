/**
 * Integration Tests for Email Templates API
 * Story: LM-007 - Dashboard Lead Magnet
 * 
 * Tests cover:
 * - Templates CRUD (AC7.18)
 * - Preview functionality (AC7.13)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Email Templates API', () => {
  let createdTemplateId: string;

  describe('GET /api/admin/email-templates', () => {
    it('should return list of email templates', async () => {
      const response = await request(app)
        .get('/api/admin/email-templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include seeded confirmation template', async () => {
      const response = await request(app)
        .get('/api/admin/email-templates')
        .expect(200);

      // AC7.14: Seed data should include confirmation email template
      const confirmationTemplate = response.body.data.find(
        (t: any) => t.name === 'Confirmation Double Opt-in'
      );
      expect(confirmationTemplate).toBeDefined();
    });
  });

  describe('POST /api/admin/email-templates', () => {
    it('should create a new email template', async () => {
      const newTemplate = {
        name: 'Test Template',
        subject: 'Test Subject {{email}}',
        html_body: '<html><body>Hello {{subscriber_name}}</body></html>',
        description: 'A test template'
      };

      const response = await request(app)
        .post('/api/admin/email-templates')
        .send(newTemplate)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newTemplate.name);
      
      createdTemplateId = response.body.data.id;
    });

    it('should reject template without required fields', async () => {
      const invalidTemplate = {
        name: 'Missing Fields'
        // Missing subject and html_body
      };

      const response = await request(app)
        .post('/api/admin/email-templates')
        .send(invalidTemplate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty name', async () => {
      const invalidTemplate = {
        name: '',
        subject: 'Test',
        html_body: '<html></html>'
      };

      const response = await request(app)
        .post('/api/admin/email-templates')
        .send(invalidTemplate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/email-templates/:id', () => {
    it('should return template by ID', async () => {
      // First get list to find a valid ID
      const listResponse = await request(app)
        .get('/api/admin/email-templates')
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const templateId = listResponse.body.data[0].id;
        
        const response = await request(app)
          .get(`/api/admin/email-templates/${templateId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(templateId);
      }
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/admin/email-templates/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/email-templates/${fakeUuid}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/email-templates/:id', () => {
    it('should update template', async () => {
      // Get a template first
      const listResponse = await request(app)
        .get('/api/admin/email-templates')
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const templateId = listResponse.body.data[0].id;
        
        const response = await request(app)
          .put(`/api/admin/email-templates/${templateId}`)
          .send({ subject: 'Updated Subject' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subject).toBe('Updated Subject');
      }
    });
  });

  describe('POST /api/admin/email-templates/preview', () => {
    it('should preview template with sample data', async () => {
      const previewRequest = {
        html_body: '<p>Hello {{subscriber_name}}, your download link: {{download_url}}</p>',
        sample_data: {
          subscriber_name: 'Jean Test',
          download_url: 'https://example.com/download/abc123'
        }
      };

      const response = await request(app)
        .post('/api/admin/email-templates/preview')
        .send(previewRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preview_html).toContain('Jean Test');
      expect(response.body.data.preview_html).toContain('https://example.com/download/abc123');
    });

    it('should use default sample data when not provided', async () => {
      const previewRequest = {
        html_body: '<p>Email: {{email}}</p>'
      };

      const response = await request(app)
        .post('/api/admin/email-templates/preview')
        .send(previewRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should contain default sample email
      expect(response.body.data.preview_html).toContain('@');
    });
  });

  describe('DELETE /api/admin/email-templates/:id', () => {
    it('should delete template', async () => {
      // Create a template to delete
      const createResponse = await request(app)
        .post('/api/admin/email-templates')
        .send({
          name: 'To Delete',
          subject: 'Delete me',
          html_body: '<html></html>'
        })
        .expect(201);

      const templateId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/admin/email-templates/${templateId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's gone
      await request(app)
        .get(`/api/admin/email-templates/${templateId}`)
        .expect(404);
    });
  });
});
