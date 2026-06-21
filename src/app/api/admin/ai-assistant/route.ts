import { type NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth-guard';
import { sendMessageSchema, deleteThreadSchema } from '@/lib/schemas/aiAssistant';
import { sendMessage } from '@/lib/services/ai-assistant/index';
import { listThreadsForUser, deleteThread } from '@/lib/queries/aiAssistant';

const ALLOWED_ROLES = ['admin', 'manager', 'finance', 'analyst', 'ops', 'talent_manager', 'editor'] as const;

// POST /api/admin/ai-assistant — enviar mensaje al asistente
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAnyRole(ALLOWED_ROLES, '/admin/login');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { message, threadId, contextType } = parsed.data;

  try {
    const result = await sendMessage({
      userId: session.user.id,
      userMessage: message,
      contextType,
      ...(threadId !== undefined ? { threadId } : {}),
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/admin/ai-assistant — listar hilos del usuario
export async function GET(): Promise<NextResponse> {
  const session = await requireAnyRole(ALLOWED_ROLES, '/admin/login');

  try {
    const threads = await listThreadsForUser(session.user.id);
    return NextResponse.json({ threads });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/admin/ai-assistant — eliminar un hilo
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await requireAnyRole(ALLOWED_ROLES, '/admin/login');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = deleteThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'threadId inválido' }, { status: 400 });
  }

  try {
    await deleteThread(parsed.data.threadId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
