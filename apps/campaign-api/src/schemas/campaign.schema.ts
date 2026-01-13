import { z } from 'zod';
import { CampaignStatus } from '../types/campaign.js';

export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less')
    .trim(),
  valueProp: z
    .string()
    .min(1, 'Value proposition is required')
    .max(150, 'Value proposition must be 150 characters or less')
    .trim(),
  templateId: z.string().uuid('Invalid template ID format').optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const listCampaignsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be positive'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 25))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  sortBy: z.enum(['updatedAt', 'createdAt', 'name']).optional().default('updatedAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListCampaignsQueryDto = z.infer<typeof listCampaignsQuerySchema>;

/**
 * Update campaign schema (PATCH)
 * All fields are optional but at least one must be provided
 */
export const updateCampaignSchema = z
  .object({
    name: z.string().min(1, 'Campaign name is required').max(100).trim().optional(),
    valueProp: z
      .string()
      .min(1, 'Value proposition is required')
      .max(150, 'Value proposition must be 150 characters or less')
      .trim()
      .optional(),
    status: z.enum(['draft', 'running', 'paused', 'archived']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

/**
 * Validate campaign status transition
 * @param from Current status
 * @param to Requested status
 * @returns true if transition is allowed (same status is allowed as no-op)
 */
export function isValidStatusTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  // Same status is always allowed (no-op update)
  if (from === to) {
    return true;
  }

  const transitions: Record<CampaignStatus, CampaignStatus[]> = {
    draft: ['running', 'archived'],
    running: ['paused', 'archived'],
    paused: ['running', 'archived'],
    archived: [], // Cannot transition from archived
  };

  return transitions[from]?.includes(to) ?? false;
}
