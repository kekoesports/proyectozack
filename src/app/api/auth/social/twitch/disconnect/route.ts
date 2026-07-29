import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  disconnectAccountAndTakeToken,
  getConnectedAccount,
} from '@/lib/queries/connectedSocialAccounts';
import { decrypt } from '@/lib/crypto/token-encryption';
import { env } from '@/lib/env';

/**
 * POST /api/auth/social/twitch/disconnect
 *
 * Desconecta, elimina el token almacenado y solicita su revocación a Twitch.
 * NO revierte `mission_claims` — los canjes históricos son firmes.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const account = await getConnectedAccount(session.user.id, 'twitch');
  if (account?.accessTokenEncrypted && env.TWITCH_CLIENT_ID) {
    try {
      const token = decrypt(account.accessTokenEncrypted);
      const revokeResponse = await fetch('https://id.twitch.tv/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.TWITCH_CLIENT_ID,
          token,
        }),
        signal: AbortSignal.timeout(3_000),
      });
      const alreadyInactive = revokeResponse.status === 400;
      if (!revokeResponse.ok && !alreadyInactive) {
        console.warn('[twitch-disconnect] provider revocation rejected', {
          status: revokeResponse.status,
        });
        return NextResponse.json(
          { error: 'provider_revocation_failed' },
          { status: 502 },
        );
      }
    } catch {
      console.warn('[twitch-disconnect] provider revocation failed');
      return NextResponse.json(
        { error: 'provider_revocation_failed' },
        { status: 502 },
      );
    }
  }
  await disconnectAccountAndTakeToken(session.user.id, 'twitch');
  return NextResponse.json({ ok: true });
}
