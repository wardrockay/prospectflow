import { z } from 'zod';

/**
 * Health check response schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  database: z.object({
    connected: z.boolean(),
    latency: z.number(),
  }),
  rabbitmq: z
    .object({
      connected: z.boolean(),
      managementUI: z.string().optional(),
      error: z.string().optional(),
    })
    .optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
