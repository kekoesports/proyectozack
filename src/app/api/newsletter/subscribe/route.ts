'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/security/rateLimit';

const CONSENT_VERSION = 'sp-news-v1-2026-05';
const CONSENT_TEXT =
  'El usuario aceptó recibir el newsletter editorial de SocialPro News (obligatorio). ' +
  'Consentimiento de comunicaciones comerciales registrado por separado. ' +
  `Versión: ${CONSENT_VERSION}.`;

const schema = z.object({
  email:             z.string().email().max(254),
  consentNewsletter: z.literal(true),
  consentMarketing:  z.boolean(),
  honeypot:          z.string().max(0), // debe estar vacío
});

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  // Rate limit: 3 intentos / IP / 60s
  const rl = checkRateLimit({ key: `newsletter:${ip}`, limit: 3, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Honeypot hit o validación fallida — silencioso para bots
    if ((body as Record<string, unknown>)?.honeypot) {
      return NextResponse.json({ ok: true }); // silencioso
    }
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { email: rawEmail, consentMarketing } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  // Deduplicación: si ya existe, devuelve success silencioso
  const existing = await db
    .select({ id: newsletterSubscribers.id, status: newsletterSubscribers.status })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existing.length > 0) {
    // Si estaba unsubscribed, reactivar
    if (existing[0]?.status === 'unsubscribed') {
      await db
        .update(newsletterSubscribers)
        .set({ status: 'active', consentMarketing, subscribedAt: new Date(), unsubscribedAt: null, updatedAt: new Date() })
        .where(eq(newsletterSubscribers.email, email));
    }
    return NextResponse.json({ ok: true });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

  await db.insert(newsletterSubscribers).values({
    email,
    consentNewsletter: true,
    consentMarketing,
    consentVersion:    CONSENT_VERSION,
    consentText:       CONSENT_TEXT,
    ipHash:            hashIp(ip),
    userAgent,
    unsubscribeToken:  randomBytes(32).toString('hex'),
    source:            'news_popup',
  });

  return NextResponse.json({ ok: true });
}
