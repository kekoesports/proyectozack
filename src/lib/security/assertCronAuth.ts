import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

/**
 * Política unificada de auth para route handlers de cron.
 *
 * Exige `Authorization: Bearer ${CRON_SECRET}` (comparado en tiempo constante).
 * Vercel añade esa cabecera automáticamente a sus Cron Jobs cuando existe
 * `CRON_SECRET`. No se confía en cabeceras identificativas aportadas por el
 * cliente, porque también pueden falsificarse desde una petición externa.
 *
 * Fail-closed: si `CRON_SECRET` no está configurado y la request no viene de
 * Vercel cron, devuelve 503 — evita un vector de mutación masiva sin auth.
 */
export function assertCronAuth(req: NextRequest): NextResponse | null {
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
