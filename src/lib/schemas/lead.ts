import { z } from 'zod';

import { leadStatusEnum } from '@/db/schema';

/** Estados válidos del pipeline, derivados del enum de la DB. */
export const leadStatusSchema = z.enum(leadStatusEnum.enumValues);

export const leadIdSchema = z.coerce.number().int().positive();

export const updateLeadStatusSchema = z.object({
  id: leadIdSchema,
  status: leadStatusSchema,
});

export const assignLeadSchema = z.object({
  id: leadIdSchema,
  /** Cadena vacía = desasignar. */
  assignedToId: z.string().trim().max(255),
});

export const addLeadNoteSchema = z.object({
  id: leadIdSchema,
  note: z.string().trim().min(1, 'La nota no puede estar vacía').max(2000),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;
