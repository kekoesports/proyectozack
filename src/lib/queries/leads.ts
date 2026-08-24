import { and, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { contactSubmissions, user } from '@/db/schema';
import { OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import type { Lead, LeadStatus, LeadWithAssignee } from '@/types';

/** Escapa comodines LIKE en input de usuario antes de un ILIKE. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

const LEAD_COLUMNS = {
  id: contactSubmissions.id,
  name: contactSubmissions.name,
  email: contactSubmissions.email,
  phone: contactSubmissions.phone,
  type: contactSubmissions.type,
  company: contactSubmissions.company,
  message: contactSubmissions.message,
  budget: contactSubmissions.budget,
  timeline: contactSubmissions.timeline,
  audience: contactSubmissions.audience,
  vertical: contactSubmissions.vertical,
  campaignType: contactSubmissions.campaignType,
  platform: contactSubmissions.platform,
  viewers: contactSubmissions.viewers,
  monetization: contactSubmissions.monetization,
  createdAt: contactSubmissions.createdAt,
  ipHash: contactSubmissions.ipHash,
  status: contactSubmissions.status,
  assignedToId: contactSubmissions.assignedToId,
  notes: contactSubmissions.notes,
  respondedAt: contactSubmissions.respondedAt,
  assignedToName: user.name,
} as const;

export type LeadFilters = {
  readonly status?: LeadStatus;
  readonly type?: string;
  readonly assignedToId?: string;
  /** Excluyente con assignedToId: sólo leads sin owner. */
  readonly unassigned?: boolean;
  readonly search?: string;
};

/**
 * Listado de leads con filtros combinables.
 *
 * @cache none
 * @visibility admin — gatear con requirePermission('leads', 'read')
 * @returns leads ordenados por fecha de entrada descendente
 */
export async function listLeads(filters: LeadFilters = {}): Promise<readonly LeadWithAssignee[]> {
  const conditions: SQL[] = [];

  if (filters.status) conditions.push(eq(contactSubmissions.status, filters.status));
  if (filters.type) conditions.push(eq(contactSubmissions.type, filters.type));
  if (filters.unassigned) {
    conditions.push(isNull(contactSubmissions.assignedToId));
  } else if (filters.assignedToId) {
    conditions.push(eq(contactSubmissions.assignedToId, filters.assignedToId));
  }

  const term = filters.search?.trim();
  if (term) {
    const q = `%${escapeLike(term)}%`;
    const searchClause = or(
      ilike(contactSubmissions.name, q),
      ilike(contactSubmissions.email, q),
      ilike(contactSubmissions.message, q),
    );
    if (searchClause !== undefined) conditions.push(searchClause);
  }

  const rows = await db
    .select(LEAD_COLUMNS)
    .from(contactSubmissions)
    .leftJoin(user, eq(user.id, contactSubmissions.assignedToId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contactSubmissions.createdAt));

  return rows;
}

/**
 * Lead individual por id.
 *
 * @cache none
 * @visibility admin — gatear con requirePermission('leads', 'read')
 * @returns el lead, o undefined si no existe
 */
export async function getLeadById(id: number): Promise<LeadWithAssignee | undefined> {
  const [row] = await db
    .select(LEAD_COLUMNS)
    .from(contactSubmissions)
    .leftJoin(user, eq(user.id, contactSubmissions.assignedToId))
    .where(eq(contactSubmissions.id, id))
    .limit(1);

  return row ?? undefined;
}

/**
 * Formatea una entrada del log interno. `notes` es append-only: guarda tanto
 * las notas manuales del equipo como las transiciones de status, y es lo que
 * la ficha de detalle renderiza como historial.
 */
function logEntry(authorName: string, body: string, at: Date): string {
  return `[${at.toISOString()}] ${authorName}: ${body}`;
}

/** Añade una línea al log interno sin pisar lo anterior. */
function appendNote(previous: string | null, entry: string): string {
  return previous && previous.length > 0 ? `${previous}\n${entry}` : entry;
}

async function resolveActorName(userId: string): Promise<string> {
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.name ?? userId;
}

/**
 * Cambia el status del lead y lo registra en el log interno.
 *
 * `respondedAt` se sella la primera vez que el lead sale de 'nuevo' y no se
 * vuelve a tocar — mide tiempo de primera respuesta, no de última.
 *
 * @cache none
 * @visibility admin — gatear con requirePermission('leads', 'write')
 * @returns el lead actualizado, o undefined si el id no existe
 */
export async function updateLeadStatus(
  id: number,
  status: LeadStatus,
  userId: string,
): Promise<Lead | undefined> {
  const [current] = await db
    .select({ status: contactSubmissions.status, notes: contactSubmissions.notes })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, id))
    .limit(1);
  if (!current) return undefined;
  if (current.status === status) return undefined;

  const actor = await resolveActorName(userId);
  const now = new Date();
  const entry = logEntry(actor, `status ${current.status} → ${status}`, now);

  const [updated] = await db
    .update(contactSubmissions)
    .set({
      status,
      notes: appendNote(current.notes, entry),
      ...(status !== 'nuevo'
        ? { respondedAt: sql`coalesce(${contactSubmissions.respondedAt}, ${now})` }
        : {}),
    })
    .where(eq(contactSubmissions.id, id))
    .returning();

  return updated ?? undefined;
}

/**
 * Asigna (o desasigna, pasando null) el owner del lead.
 *
 * @cache none
 * @visibility admin — gatear con requirePermission('leads', 'write')
 * @returns el lead actualizado, o undefined si el id no existe
 */
export async function assignLead(id: number, userToId: string | null): Promise<Lead | undefined> {
  const [updated] = await db
    .update(contactSubmissions)
    .set({ assignedToId: userToId })
    .where(eq(contactSubmissions.id, id))
    .returning();

  return updated ?? undefined;
}

/**
 * Añade una nota interna al log append-only del lead.
 *
 * @cache none
 * @visibility admin — gatear con requirePermission('leads', 'write')
 * @returns el lead actualizado, o undefined si el id no existe
 */
export async function addLeadNote(
  id: number,
  note: string,
  userId: string,
): Promise<Lead | undefined> {
  const body = note.trim();
  if (body.length === 0) return undefined;

  const [current] = await db
    .select({ notes: contactSubmissions.notes })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, id))
    .limit(1);
  if (!current) return undefined;

  const actor = await resolveActorName(userId);
  const entry = logEntry(actor, body, new Date());

  const [updated] = await db
    .update(contactSubmissions)
    .set({ notes: appendNote(current.notes, entry) })
    .where(eq(contactSubmissions.id, id))
    .returning();

  return updated ?? undefined;
}

/**
 * Registra un email aceptado por el proveedor y sella la primera respuesta.
 * El id del proveedor evita duplicar el historial si una petición se reintenta.
 */
export async function recordLeadEmailSent(input: {
  readonly id: number;
  readonly subject: string;
  readonly providerEmailId: string;
  readonly userId: string;
}): Promise<Lead | undefined> {
  const [current] = await db
    .select({
      status: contactSubmissions.status,
      notes: contactSubmissions.notes,
    })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, input.id))
    .limit(1);
  if (!current) return undefined;

  const marker = `[email:${input.providerEmailId}]`;
  if (current.notes?.includes(marker)) return undefined;

  const actor = await resolveActorName(input.userId);
  const now = new Date();
  const entry = logEntry(
    actor,
    `Email enviado desde ${OPERATIONAL_GOOGLE_EMAIL} · Asunto: ${input.subject} ${marker}`,
    now,
  );

  const [updated] = await db
    .update(contactSubmissions)
    .set({
      status: current.status === 'nuevo' ? 'contactado' : current.status,
      notes: appendNote(current.notes, entry),
      respondedAt: sql`coalesce(${contactSubmissions.respondedAt}, ${now})`,
    })
    .where(eq(contactSubmissions.id, input.id))
    .returning();

  return updated ?? undefined;
}
