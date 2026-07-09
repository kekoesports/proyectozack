import { z } from 'zod';
import { DELIVERABLE_TYPES } from './deliverable';

/**
 * Schema Zod para el payload `deliverables_json` que envía el drawer de
 * Tratos. Cada fila es una cantidad objetivo por tipo de entregable.
 *
 * `id` presente = tracker existente (UPDATE).
 * `id` ausente  = nuevo tracker (INSERT).
 *
 * targetCount debe ser >= 1. Filas con targetCount 0 se descartan al sincronizar.
 */
export const deliverableEditorRowSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  deliverableType: z.enum(DELIVERABLE_TYPES),
  targetCount: z.coerce.number().int().min(1).max(999),
  notes: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(500).optional(),
  ),
});

export type DeliverableEditorRowInput = z.infer<typeof deliverableEditorRowSchema>;

export const deliverableEditorPayloadSchema = z.array(deliverableEditorRowSchema);

/**
 * Parsea un `deliverables_json` que viene del FormData (o retorna array vacío
 * si el string está vacío/ausente/inválido). NUNCA lanza — filtra silencioso
 * lo malformado para que la Server Action no pete por un JSON roto del cliente.
 */
export function parseDeliverablesJson(raw: unknown): DeliverableEditorRowInput[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '[]') return [];
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return [];
  }
  const parsed = deliverableEditorPayloadSchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}
