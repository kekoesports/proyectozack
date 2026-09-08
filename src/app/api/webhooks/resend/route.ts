import { NextRequest, NextResponse } from 'next/server';

import { persistResendWebhookEvent } from '@/lib/email/resendWebhook';
import { normalizeEmail, persistReceivedCreatorEmail } from '@/lib/queries/creatorOutreach';
import { resend } from '@/lib/email/sendResendEmail';
import { env } from '@/lib/env';
import {
  resendEmailWebhookEventSchema,
  resendEmailEventTypeSchema,
  resendReceivedEventTypeSchema,
  resendWebhookEnvelopeSchema,
  resendWebhookHeadersSchema,
} from '@/lib/schemas/resend-webhook';
import {
  resendReceivedContentSchema,
  resendReceivedWebhookEventSchema,
} from '@/lib/schemas/creator-outreach';

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
  if (!envelope.success) {
    return NextResponse.json({ error: 'Evento no compatible.' }, { status: 422 });
  }

  if (resendReceivedEventTypeSchema.safeParse(envelope.data.type).success) {
    const receivedEvent = resendReceivedWebhookEventSchema.safeParse(verifiedPayload);
    if (!receivedEvent.success) return NextResponse.json({ error: 'Evento recibido inválido.' }, { status: 422 });
    const result = await processReceivedEmail(headers.data.id, receivedEvent.data);
    return NextResponse.json({ ok: true, ...result });
  }

  if (!resendEmailEventTypeSchema.safeParse(envelope.data.type).success) {
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

async function processReceivedEmail(
  svixId: string,
  event: import('@/lib/schemas/creator-outreach').ResendReceivedWebhookEvent,
): Promise<{ readonly duplicate: boolean; readonly matched: boolean }> {
  const domain = env.CREATOR_REPLY_RECEIVING_DOMAIN;
  if (!domain) return { duplicate: false, matched: false };
  const replyToken = extractReplyToken(event.data.to, domain);
  const senderEmail = normalizeEmail(event.data.from);
  if (!replyToken || !senderEmail) return { duplicate: false, matched: false };

  const response = await resend.emails.receiving.get(event.data.email_id);
  if (response.error || !response.data) throw new Error('resend-received-content-unavailable');
  const content = resendReceivedContentSchema.safeParse(response.data);
  if (!content.success) throw new Error('resend-received-content-invalid');
  const persisted = await persistReceivedCreatorEmail({
    svixId,
    receivedAt: new Date(event.created_at),
    replyToken,
    senderEmail,
    content: content.data,
  });
  return { duplicate: persisted.duplicate, matched: persisted.matched };
}

function extractReplyToken(recipients: readonly string[], domain: string): string | null {
  for (const recipient of recipients) {
    const email = normalizeEmail(recipient);
    if (!email?.endsWith(`@${domain}`)) continue;
    const localPart = email.slice(0, -domain.length - 1);
    const token = localPart.match(/^creator-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)?.[1];
    if (token) return token.toLowerCase();
  }
  return null;
}
