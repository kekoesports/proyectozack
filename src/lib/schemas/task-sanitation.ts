import { z } from 'zod';

import { SANITATION_ACTIONS } from '@/lib/task-rollover-policy';

const optionalNote = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().max(2000).optional(),
);

export const sanitizeTaskSchema = z
  .object({
    taskId: z.coerce.number().int().positive(),
    action: z.enum(SANITATION_ACTIONS),
    dueDate: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
    note: optionalNote,
  })
  .refine((v) => v.action !== 'reschedule' || v.dueDate !== undefined, {
    message: 'La reprogramación requiere una fecha',
    path: ['dueDate'],
  });

export type SanitizeTaskInput = z.infer<typeof sanitizeTaskSchema>;
