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
