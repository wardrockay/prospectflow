import { describe, it, expect } from 'vitest';
import { createCampaignSchema } from '../../../src/schemas/campaign.schema.js';

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
