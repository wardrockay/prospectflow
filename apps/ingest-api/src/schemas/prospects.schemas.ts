/**
 * Zod validation schemas for prospect import endpoints
 */
import { z } from 'zod';

/**
 * Schema for POST /api/v1/imports/:uploadId/map
 * Validates column mapping configuration
 */
export const saveColumnMappingsSchema = z.object({
  params: z.object({
    uploadId: z.string().uuid('Invalid upload ID format'),
  }),
  body: z.object({
    columnMappings: z
      .record(z.string(), z.string())
      .refine((mappings) => Object.keys(mappings).length > 0, {
        message: 'At least one column mapping required',
      }),
  }),
});

export type SaveColumnMappingsInput = z.infer<typeof saveColumnMappingsSchema>;
