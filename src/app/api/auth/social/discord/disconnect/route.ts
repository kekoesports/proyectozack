import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { disconnectAccountAndTakeToken } from '@/lib/queries/connectedSocialAccounts';
import { decrypt } from '@/lib/crypto/token-encryption';
import { env } from '@/lib/env';

/**
 * POST /api/auth/social/discord/disconnect
 *
 * Marca la cuenta como desconectada, elimina el token almacenado e intenta
 * revocarlo en Discord. El fallo de red no impide la desconexión local.
 * NO revierte `mission_claims` — los canjes históricos son firmes.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const encryptedToken = await disconnectAccountAndTakeToken(session.user.id, 'discord');
  if (encryptedToken && env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
    try {
      const token = decrypt(encryptedToken);
      await fetch('https://discord.com/api/oauth2/token/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          token,
        }),
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      console.warn('[discord-disconnect] provider revocation failed');
    }
  }
  return NextResponse.json({ ok: true });
}
