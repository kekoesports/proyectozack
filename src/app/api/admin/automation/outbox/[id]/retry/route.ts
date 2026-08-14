import { NextResponse } from 'next/server';
import { retryOutboxEvent } from '@/lib/automation/outbox';
import { requireAnyRole } from '@/lib/auth-guard';
import { UuidIdParam } from '@/lib/schemas/integrationApi';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAnyRole(['admin', 'admin_limited_tasks'], '/admin/login');
  const id = UuidIdParam.safeParse(await context.params);
  if (!id.success) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  const retried = await retryOutboxEvent(id.data.id);
  if (!retried) return NextResponse.json({ success: false, error: 'Evento no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
