import { describe, it, expect } from 'vitest';
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  isValidStatusTransition,
} from '../../../src/schemas/campaign.schema.js';

describe('createCampaignSchema', () => {
  it('should accept valid campaign data', () => {
    const result = createCampaignSchema.safeParse({
      name: 'My Campaign',
      valueProp: 'Help businesses create engaging product showcase videos',
      templateId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createCampaignSchema.safeParse({
      name: '',
      valueProp: 'Valid value prop',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 100 characters', () => {
    const result = createCampaignSchema.safeParse({
      name: 'a'.repeat(101),
      valueProp: 'Valid value prop',
    });
    expect(result.success).toBe(false);
  });

  it('should reject valueProp exceeding 150 characters', () => {
    const result = createCampaignSchema.safeParse({
      name: 'Valid name',
      valueProp: 'a'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('should accept missing templateId', () => {
    const result = createCampaignSchema.safeParse({
      name: 'Valid name',
      valueProp: 'Valid value prop',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid templateId format', () => {
    const result = createCampaignSchema.safeParse({
      name: 'Valid name',
      valueProp: 'Valid value prop',
      templateId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace from name and valueProp', () => {
    const result = createCampaignSchema.safeParse({
      name: '  My Campaign  ',
      valueProp: '  Help businesses  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Campaign');
      expect(result.data.valueProp).toBe('Help businesses');
    }
  });
});

describe('listCampaignsQuerySchema', () => {
  it('should apply default values', () => {
    const result = listCampaignsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
      expect(result.data.sortBy).toBe('updatedAt');
      expect(result.data.order).toBe('desc');
    }
  });

  it('should accept valid query params', () => {
    const result = listCampaignsQuerySchema.safeParse({
      page: '2',
      limit: '50',
      sortBy: 'name',
      order: 'asc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
      expect(result.data.sortBy).toBe('name');
      expect(result.data.order).toBe('asc');
    }
  });

  it('should reject page less than 1', () => {
    const result = listCampaignsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = listCampaignsQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sortBy', () => {
    const result = listCampaignsQuerySchema.safeParse({ sortBy: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid order', () => {
    const result = listCampaignsQuerySchema.safeParse({ order: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('updateCampaignSchema', () => {
  it('should accept valid name update', () => {
    const result = updateCampaignSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept valid valueProp update', () => {
    const result = updateCampaignSchema.safeParse({ valueProp: 'New value prop' });
    expect(result.success).toBe(true);
  });

  it('should accept valid status update', () => {
    const result = updateCampaignSchema.safeParse({ status: 'running' });
    expect(result.success).toBe(true);
  });

  it('should accept multiple fields', () => {
    const result = updateCampaignSchema.safeParse({
      name: 'New Name',
      valueProp: 'New value',
      status: 'paused',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty object', () => {
    const result = updateCampaignSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('At least one field');
    }
  });

  it('should reject name exceeding 100 chars', () => {
    const result = updateCampaignSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should reject valueProp exceeding 150 chars', () => {
    const result = updateCampaignSchema.safeParse({ valueProp: 'a'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = updateCampaignSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace from name', () => {
    const result = updateCampaignSchema.safeParse({ name: '  Trimmed  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Trimmed');
    }
  });

  it('should trim whitespace from valueProp', () => {
    const result = updateCampaignSchema.safeParse({ valueProp: '  Trimmed Value  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valueProp).toBe('Trimmed Value');
    }
  });
});

describe('isValidStatusTransition', () => {
  it('should allow draft -> running', () => {
    expect(isValidStatusTransition('draft', 'running')).toBe(true);
  });

  it('should allow draft -> archived', () => {
    expect(isValidStatusTransition('draft', 'archived')).toBe(true);
  });

  it('should allow running -> paused', () => {
    expect(isValidStatusTransition('running', 'paused')).toBe(true);
  });

  it('should allow running -> archived', () => {
    expect(isValidStatusTransition('running', 'archived')).toBe(true);
  });

  it('should allow paused -> running', () => {
    expect(isValidStatusTransition('paused', 'running')).toBe(true);
  });

  it('should allow paused -> archived', () => {
    expect(isValidStatusTransition('paused', 'archived')).toBe(true);
  });

  it('should reject draft -> paused', () => {
    expect(isValidStatusTransition('draft', 'paused')).toBe(false);
  });

  it('should allow unarchiving: archived -> draft', () => {
    expect(isValidStatusTransition('archived', 'draft')).toBe(true);
  });

  it('should reject archived -> running', () => {
    expect(isValidStatusTransition('archived', 'running')).toBe(false);
  });

  it('should reject archived -> paused', () => {
    expect(isValidStatusTransition('archived', 'paused')).toBe(false);
  });

  // Same-status transitions (no-op)
  it('should allow same-status transition: draft -> draft', () => {
    expect(isValidStatusTransition('draft', 'draft')).toBe(true);
  });

  it('should allow same-status transition: running -> running', () => {
    expect(isValidStatusTransition('running', 'running')).toBe(true);
  });

  it('should allow same-status transition: paused -> paused', () => {
    expect(isValidStatusTransition('paused', 'paused')).toBe(true);
  });

  it('should allow same-status transition: archived -> archived', () => {
    expect(isValidStatusTransition('archived', 'archived')).toBe(true);
  });
});
