import { z } from 'zod';

export const cronMaintenanceSchema = z.object({
  maintenance: z.enum(['full', 'skip']).optional(),
});
