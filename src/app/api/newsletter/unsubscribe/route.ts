'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/security/rateLimit';

const schema = z.object({
  token: z.string().min(1).max(64).regex(/^[0-9a-f]+$/),
});

async function doUnsubscribe(token: string, ip: string): Promise<NextResponse> {
  const rl = checkRateLimit({ key: `unsub:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });
  }

  const parsed = schema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json({ ok: true }); // Silencioso para tokens inválidos
  }

  await db
    .update(newsletterSubscribers)
    .set({ status: 'unsubscribed', unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(newsletterSubscribers.unsubscribeToken, parsed.data.token));

  return NextResponse.json({ ok: true });
}

function extractIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

/** POST: usado por la UI y por RFC 8058 one-click List-Unsubscribe */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = extractIp(req);
  let token = '';

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    // RFC 8058 one-click (enviado por Gmail/Apple Mail)
    const text = await req.text();
    const params = new URLSearchParams(text);
    token = params.get('token') ?? params.get('List-Unsubscribe') ?? '';
  } else {
    try {
      const body = await req.json() as Record<string, unknown>;
      token = typeof body.token === 'string' ? body.token : '';
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }
  }

  return doUnsubscribe(token, ip);
}
