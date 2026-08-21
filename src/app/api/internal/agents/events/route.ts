import { NextResponse } from 'next/server';

import { redactForStorage } from '@/lib/agents/redaction';
import { logRedacted } from '@/lib/log';
import { ingestAgentEvent } from '@/lib/queries/agents/events';
import { AgentEventIngestSchema, MAX_PAYLOAD_BYTES } from '@/lib/schemas/agentEvent';
import {
  statusForAuthReason,
  verifyAgentEventRequest,
} from '@/lib/security/assertAgentInternalAuth';

export const dynamic = 'force-dynamic';

/**
 * Entrada de señales externas.
 *
 * Cinco filtros antes de que nada llegue a la base, en este orden:
 *
 * 1. **Tamaño.** Se lee el cuerpo como texto y se mide antes de parsearlo. Un
 *    JSON de 50 MB no debe llegar siquiera al parser.
 * 2. **Bearer + HMAC + ventana de replay.** La firma se calcula sobre el texto
 *    crudo, así que tiene que comprobarse antes de `JSON.parse` — parsear y
 *    volver a serializar cambiaría los bytes y la firma no cuadraría.
 * 3. **Zod**, con allowlist de tipos: un `eventType` desconocido se rechaza.
 * 4. **Redacción.** El payload pasa por el mismo redactor que el resto del
 *    runtime antes de persistirse.
 * 5. **Deduplicación** por `event_key`, que impone el índice único.
 *
 * Lo que este endpoint **no** hace: decidir si el evento merece una ejecución.
 * Eso es del procesador de eventos del worker, con reglas deterministas. Aquí
 * solo se recibe, se valida y se guarda.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // 1. Tamaño, antes de parsear.
  const declarado = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_PAYLOAD_BYTES * 2) {
    return NextResponse.json({ ok: false, error: 'payload-too-large' }, { status: 413 });
  }

  const crudo = await req.text().catch(() => '');
  if (crudo.length > MAX_PAYLOAD_BYTES * 2) {
    return NextResponse.json({ ok: false, error: 'payload-too-large' }, { status: 413 });
  }

  // 2. Autenticación sobre el texto crudo. Parsear antes rompería la firma.
  const auth = verifyAgentEventRequest(req, crudo);
  if (!auth.ok) {
    // El motivo se devuelve pero no se registra con detalle: un log lleno de
    // "bad-signature" con la firma presentada es material para afinar ataques.
    logRedacted('warn', `[agents] evento rechazado: ${auth.reason}`);
    return NextResponse.json({ ok: false, error: auth.reason }, { status: statusForAuthReason(auth.reason) });
  }

  // 3. Validación con allowlist.
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const parsed = AgentEventIngestSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    // 4 y 5. Redacción y dedupe.
    const resultado = await ingestAgentEvent({
      source: parsed.data.source,
      eventType: parsed.data.eventType,
      externalId: parsed.data.externalId ?? null,
      severity: parsed.data.severity,
      fingerprint: parsed.data.fingerprint ?? null,
      payloadJson: redactForStorage(parsed.data.payload),
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    });

    // 200 para el duplicado, 201 para el nuevo: un collector que reintenta no
    // debe interpretar el duplicado como un fallo y volver a intentarlo.
    return NextResponse.json(
      { ok: true, eventId: resultado.event.id, deduplicated: resultado.deduplicated },
      { status: resultado.deduplicated ? 200 : 201 },
    );
  } catch (err) {
    logRedacted('error', '[agents] fallo al registrar el evento:', err);
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
