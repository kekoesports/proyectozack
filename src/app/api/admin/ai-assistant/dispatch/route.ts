import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';
import { getThread } from '@/lib/queries/aiAssistant';
import { enqueueAgentRun } from '@/lib/queries/agents/runs';
import { dispatchAgentSchema } from '@/lib/schemas/aiAssistant';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requirePermission('agents', 'write', '/admin/login');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = dispatchAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Orden inválida', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { agentSlug, clientRequestId, threadId } = parsed.data;
  if (threadId !== undefined) {
    const thread = await getThread(threadId, session.user.id);
    if (!thread) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  try {
    const result = await enqueueAgentRun({
      agentSlug,
      triggerType: 'chat',
      correlationId: clientRequestId,
      idempotencyKey: `zack-chat:${session.user.id}:${clientRequestId}`,
      triggeredByUserId: session.user.id,
      threadId: threadId ?? null,
      priority: 20,
      inputJson: {
        reportKind: 'chat-request',
        objective: redactObjective(parsed.data.objective),
        requestedVia: 'zack-operaciones',
      },
    });

    return NextResponse.json({
      ok: true,
      runId: result.run.id,
      status: result.run.status,
      deduplicated: result.deduplicated,
      url: `/admin/agents/runs/${result.run.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo poner en marcha el agente';
    return NextResponse.json({ error: publicDispatchError(message) }, { status: 409 });
  }
}

function redactObjective(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email omitido]')
    .replace(/\b(?:\+?\d[\s().-]?){8,15}\b/g, '[teléfono omitido]')
    .replace(/\b(?:api[_ -]?key|token|password|contraseña)\s*[:=]\s*\S+/gi, '[secreto omitido]')
    .trim();
}

function publicDispatchError(message: string): string {
  if (message.includes('AGENTS_ENABLED')) return 'Los agentes están temporalmente desactivados por el interruptor global.';
  if (message.includes('desactivado')) return 'Ese agente está desactivado y no acepta nuevas tareas.';
  if (message.includes('pausado')) return 'Ese agente está pausado y no acepta nuevas tareas.';
  if (message.includes('límite') || message.includes('budget')) return 'El agente alcanzó su límite operativo y no se ha encolado la tarea.';
  return 'No se pudo encolar la tarea. Revisa el estado del agente en el centro de operaciones.';
}
