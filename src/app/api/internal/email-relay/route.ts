import { NextRequest, NextResponse } from 'next/server';
import type { CreateEmailOptions } from 'resend';

import { sendDirectResendEmail } from '@/lib/email/sendResendEmail';
import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RelayBody = {
  context?: unknown;
  options?: unknown;
  requestOptions?: { idempotencyKey?: unknown };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const relayToken = env.EMAIL_RELAY_AUTH_TOKEN;
  if (!relayToken) {
    return NextResponse.json({ error: { name: 'relay_misconfigured', message: 'Service misconfigured' } }, { status: 503 });
  }
  const authorization = request.headers.get('authorization') ?? '';
  if (!timingSafeEqual(authorization, `Bearer ${relayToken}`)) {
    return NextResponse.json({ error: { name: 'unauthorized', message: 'Unauthorized' } }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 512_000) {
    return NextResponse.json({ error: { name: 'payload_too_large', message: 'Payload too large' } }, { status: 413 });
  }

  let body: RelayBody;
  try {
    body = await request.json() as RelayBody;
  } catch {
    return NextResponse.json({ error: { name: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 });
  }

  if (
    typeof body.context !== 'string'
    || body.context.length < 1
    || body.context.length > 100
    || !body.options
    || typeof body.options !== 'object'
  ) {
    return NextResponse.json({ error: { name: 'invalid_payload', message: 'Invalid payload' } }, { status: 400 });
  }
  const idempotencyKey = body.requestOptions?.idempotencyKey;
  if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || idempotencyKey.length > 256)) {
    return NextResponse.json({ error: { name: 'invalid_payload', message: 'Invalid idempotency key' } }, { status: 400 });
  }

  try {
    const id = await sendDirectResendEmail(
      body.context,
      body.options as CreateEmailOptions,
      typeof idempotencyKey === 'string' ? { idempotencyKey } : undefined,
    );
    return NextResponse.json({ id });
  } catch (error) {
    const name = error instanceof Error && 'resendErrorName' in error
      ? String(error.resendErrorName)
      : 'send_failed';
    console.error('[email-relay] send failed', { context: body.context, resendError: name });
    return NextResponse.json(
      { error: { name, message: 'Email provider rejected the request' } },
      { status: 502 },
    );
  }
}
