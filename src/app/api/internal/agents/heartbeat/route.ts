import { NextResponse } from 'next/server';

import { redactForStorage } from '@/lib/agents/redaction';
import { logRedacted } from '@/lib/log';
import { upsertWorkerHeartbeat } from '@/lib/queries/agents/workers';
import { AgentHeartbeatSchema } from '@/lib/schemas/agentEvent';
import {
  statusForAuthReason,
  verifyAgentInternalToken,
} from '@/lib/security/assertAgentInternalAuth';

export const dynamic = 'force-dynamic';

/**
 * Latido de un worker o collector.
 *
 * Solo bearer, sin HMAC: el heartbeat no transporta nada que importe falsificar
 * —quien tenga el token puede escribir un latido, y lo peor que consigue es que
 * el panel muestre un worker que no existe—. Exigir firma aquí complicaría el
 * collector sin ganar nada.
 *
 * El worker escribe su latido directamente contra la base; este endpoint existe
 * para los collectors del VPS, que no tienen credenciales de Postgres y no
 * deberían tenerlas.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyAgentInternalToken(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: statusForAuthReason(auth.reason) });
  }

  const cuerpo: unknown = await req.json().catch(() => null);
  const parsed = AgentHeartbeatSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await upsertWorkerHeartbeat({
      workerId: parsed.data.workerId,
      version: parsed.data.version,
      hostname: parsed.data.hostname,
      status: parsed.data.status,
      currentRunId: parsed.data.currentRunId,
      // Los metadatos vienen de fuera: se redactan como cualquier otro dato
      // ajeno, aunque se supone que son métricas.
      metadataJson: redactForStorage(parsed.data.metadata),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logRedacted('error', '[agents] fallo al registrar el latido:', err);
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
