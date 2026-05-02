import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

/**
 * Política unificada de auth para route handlers de cron.
 *
 * Acepta `x-vercel-cron: 1` (Vercel lo filtra en requests externas) o
 * `Authorization: Bearer ${CRON_SECRET}` (comparado en tiempo constante).
 *
 * Fail-closed: si `CRON_SECRET` no está configurado y la request no viene de
 * Vercel cron, devuelve 503 — evita un vector de mutación masiva sin auth.
 */
export function assertCronAuth(req: NextRequest): NextResponse | null {
  if (req.headers.get('x-vercel-cron') === '1') return null;

  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron] CRON_SECRET not configured — refusing to run');
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (!timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
