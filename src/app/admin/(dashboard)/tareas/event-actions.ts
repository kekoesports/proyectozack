'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { createCrmEvent, deleteCrmEvent } from '@/lib/queries/crmEvents';
import { createAlert } from '@/lib/queries/alerts';
import { crmEventSchema } from '@/lib/schemas/crmEvent';
import { IdSchema } from '@/lib/schemas/common';

type ActionResult = { readonly error?: string };

function revalidateCalendar(): void {
  revalidatePath('/admin/tareas');
}

export async function createEventAction(input: unknown): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = crmEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { title, description, date, startTime, endTime, attendees } = parsed.data;

  const startAt = new Date(`${date}T${startTime}:00`);
  const endAt   = endTime ? new Date(`${date}T${endTime}:00`) : null;

  if (isNaN(startAt.getTime())) return { error: 'Fecha u hora inválida' };

  // Incluir al creador en los asistentes si no está ya
  const allAttendees = Array.from(new Set([session.user.id, ...attendees]));

  const event = await createCrmEvent({
    title,
    description:     description ?? null,
    startAt,
    endAt:           endAt ?? null,
    attendees:       allAttendees,
    createdByUserId: session.user.id,
  });

  // Notificar a asistentes (excepto al creador)
  const others = allAttendees.filter((uid) => uid !== session.user.id);
  const organizer = session.user.name ?? session.user.email;
  await Promise.all(
    others.map((uid) =>
      createAlert({
        type:              'meeting_invited',
        title:             `Nueva reunión: ${title}`,
        description:       `Convocado por ${organizer} · ${date} ${startTime}`,
        severity:          'low',
        assignedToUserId:  uid,
        relatedEntityType: 'event',
        relatedEntityId:   event.id,
      }),
    ),
  );

  revalidateCalendar();
  return {};
}

export async function deleteEventAction(id: unknown): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const parsed  = IdSchema.safeParse(id);
  if (!parsed.success) return { error: 'ID inválido' };
  await deleteCrmEvent(parsed.data, session.user.id);
  revalidateCalendar();
  return {};
}
