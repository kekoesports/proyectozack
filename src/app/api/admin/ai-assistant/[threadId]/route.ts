import { type NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth-guard';
import { getThread } from '@/lib/queries/aiAssistant';

const ALLOWED_ROLES = ['admin', 'admin_limited_tasks', 'manager', 'finance', 'analyst', 'ops', 'talent_manager', 'editor'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
): Promise<NextResponse> {
  const session = await requireAnyRole(ALLOWED_ROLES, '/admin/login');
  const { threadId: rawId } = await params;
  const threadId = parseInt(rawId, 10);

  if (isNaN(threadId) || threadId <= 0) {
    return NextResponse.json({ error: 'threadId inválido' }, { status: 400 });
  }

  try {
    const thread = await getThread(threadId, session.user.id);
    if (!thread) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ thread });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
