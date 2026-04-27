import { z } from 'zod';

import { CRM_TASK_PRIORITIES } from './task';

export const CRM_TASK_RECURRENCES = ['daily', 'weekly', 'monthly'] as const;

export const CRM_TASK_RECURRENCE_LABELS: Record<(typeof CRM_TASK_RECURRENCES)[number], string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const userIdSchema = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().min(1).optional(),
);

const activeSchema = z.preprocess((v) => {
  if (v === 'true' || v === true || v === 'on') return true;
  if (v === 'false' || v === false) return false;
  return v;
}, z.boolean());

const baseTaskTemplateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(40),
  defaultPriority: z.enum(CRM_TASK_PRIORITIES).default('media'),
  recurrence: z.enum(CRM_TASK_RECURRENCES).default('weekly'),
  defaultAssigneeUserId: userIdSchema,
  active: activeSchema.default(true),
});

export const createTaskTemplateSchema = baseTaskTemplateSchema;

export const updateTaskTemplateSchema = baseTaskTemplateSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type TaskTemplateFormInput = z.infer<typeof createTaskTemplateSchema>;
