import type { InferSelectModel } from 'drizzle-orm';
import type { contactSubmissions } from '@/db/schema';

/**
 * Un lead es una fila de `contact_submissions`. La tabla es la misma que
 * alimenta el formulario público; el módulo CRM sólo añade el pipeline
 * (status / assignedToId / notes / respondedAt).
 */
export type Lead = InferSelectModel<typeof contactSubmissions>;

export type LeadStatus = Lead['status'];

/** Lead con el nombre del owner resuelto por join contra `user`. */
export type LeadWithAssignee = Lead & {
  readonly assignedToName: string | null;
};
