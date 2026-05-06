import { z } from 'zod';

export const crmEventSchema = z.object({
  title:       z.string().trim().min(1, 'El título es obligatorio').max(200),
  description: z.string().trim().max(2000).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  attendees:   z.string().array().default([]),
});

export type CrmEventInput = z.infer<typeof crmEventSchema>;
