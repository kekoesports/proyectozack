import { z } from 'zod';

export const CRM_TASK_PRIORITIES = ['alta', 'media', 'baja'] as const;
export const CRM_TASK_STATUSES = ['pendiente', 'en_progreso', 'completada'] as const;
export const CRM_TASK_RELATED_TYPES = ['brand', 'talent', 'campaign', 'invoice', 'general'] as const;

const relatedTypeSchema = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.enum(CRM_TASK_RELATED_TYPES).optional(),
);

const relatedIdSchema = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().positive().optional(),
);

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    ownerId: z.string().min(1),
    assignedToUserId: z.string().min(1).optional(),
    createdByUserId: z.string().min(1).optional(),
    recurrenceTemplateId: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number().int().positive().optional(),
    ),
    dueDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
      .transform((v) => (v === '' ? null : v)),
    priority: z.enum(CRM_TASK_PRIORITIES),
    status: z.enum(CRM_TASK_STATUSES),
    category: z.string().trim().max(40).transform((v) => v || 'General'),
    relatedType: relatedTypeSchema,
    relatedId: relatedIdSchema,
  })
  .refine(
    (v) => {
      if (v.relatedType === undefined) return v.relatedId === undefined;
      if (v.relatedType === 'general') return v.relatedId === undefined;
      return v.relatedId !== undefined;
    },
    {
      message: 'Debes elegir una entidad relacionada o dejar el campo "Relacionado con" vacío',
      path: ['relatedId'],
    },
  );

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  ownerId: z.string().min(1).optional(),
  assignedToUserId: z.string().min(1).optional(),
  createdByUserId: z.string().min(1).optional(),
  recurrenceTemplateId: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  dueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
  priority: z.enum(CRM_TASK_PRIORITIES).optional(),
  status: z.enum(CRM_TASK_STATUSES).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  relatedType: relatedTypeSchema,
  relatedId: relatedIdSchema,
});
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;
