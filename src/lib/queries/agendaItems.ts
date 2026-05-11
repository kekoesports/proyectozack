import { asc, desc, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agendaItems } from '@/db/schema';

/** Eventos de hoy en adelante, ordenados por fecha y hora. Máx. 5 para el widget. */
export async function getUpcomingAgendaItems(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(agendaItems)
    .where(gte(agendaItems.matchDate, today))
    .orderBy(asc(agendaItems.matchDate), asc(agendaItems.sortOrder))
    .limit(limit);
}

/** Todos los eventos para el admin (incluyendo pasados). */
export async function getAllAgendaItems() {
  return db.select().from(agendaItems).orderBy(desc(agendaItems.matchDate), asc(agendaItems.sortOrder));
}
