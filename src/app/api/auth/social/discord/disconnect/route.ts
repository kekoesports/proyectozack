import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { markAccountDisconnected } from '@/lib/queries/connectedSocialAccounts';

/**
 * POST /api/auth/social/discord/disconnect
 *
 * Marca la cuenta Discord del usuario como desconectada (soft delete).
 * NO borra la fila — mantiene auditoría.
 * NO revoca el token en Discord (Discord no expone endpoint público
 * simple para ello; el token caducará por sí solo en 7 días).
 * NO revierte `mission_claims` — los canjes históricos son firmes.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  await markAccountDisconnected(session.user.id, 'discord');
  return NextResponse.json({ ok: true });
}
