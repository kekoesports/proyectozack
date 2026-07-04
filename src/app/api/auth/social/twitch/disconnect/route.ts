import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { markAccountDisconnected } from '@/lib/queries/connectedSocialAccounts';

/**
 * POST /api/auth/social/twitch/disconnect
 *
 * Marca la cuenta Twitch del usuario como desconectada (soft delete).
 * NO borra la fila — mantiene auditoría.
 * NO revoca el token en Twitch (Twitch expone POST /oauth2/revoke pero
 * en Fase B nos limitamos al soft delete; el token caduca solo en ~4h).
 * NO revierte `mission_claims` — los canjes históricos son firmes.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  await markAccountDisconnected(session.user.id, 'twitch');
  return NextResponse.json({ ok: true });
}
