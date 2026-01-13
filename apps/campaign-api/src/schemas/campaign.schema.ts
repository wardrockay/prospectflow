import { z } from 'zod';

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
