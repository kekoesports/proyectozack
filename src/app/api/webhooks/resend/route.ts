import { NextRequest, NextResponse } from 'next/server';

import { persistResendWebhookEvent } from '@/lib/email/resendWebhook';
import { resend } from '@/lib/email/sendResendEmail';
import { env } from '@/lib/env';
import {
  resendEmailWebhookEventSchema,
  resendEmailEventTypeSchema,
  resendWebhookEnvelopeSchema,
  resendWebhookHeadersSchema,
} from '@/lib/schemas/resend-webhook';

export const runtime = 'nodejs';

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload demasiado grande.' }, { status: 413 });
  }

  const headers = resendWebhookHeadersSchema.safeParse({
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
  });
  if (!headers.success) {
    return NextResponse.json({ error: 'Firma requerida.' }, { status: 401 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload demasiado grande.' }, { status: 413 });
  }

  let verifiedPayload: unknown;
  try {
    verifiedPayload = resend.webhooks.verify({
      payload: rawBody,
      headers: headers.data,
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  const envelope = resendWebhookEnvelopeSchema.safeParse(verifiedPayload);
  if (!envelope.success || !resendEmailEventTypeSchema.safeParse(envelope.data.type).success) {
    // El endpoint puede recibir por error una familia nueva de eventos. Una
    // firma válida se reconoce con 200 para no provocar reintentos infinitos,
    // pero no se persiste ni ejecuta ningún efecto desconocido.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const event = resendEmailWebhookEventSchema.safeParse(verifiedPayload);
  if (!event.success) {
    return NextResponse.json({ error: 'Evento no compatible.' }, { status: 422 });
  }

  const result = await persistResendWebhookEvent(headers.data.id, event.data);
  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
