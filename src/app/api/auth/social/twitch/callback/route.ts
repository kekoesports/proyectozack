import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { encrypt, isTokenEncryptionConfigured } from '@/lib/crypto/token-encryption';
import { upsertConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { isTwitchOauthConfigured } from '@/features/giveaway-platform/constants/twitch-missions';

const TwitchTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().int().positive(),
  // Twitch devuelve refresh_token pero en Fase B NO lo persistimos.
  refresh_token: z.string().optional(),
  // Twitch devuelve `scope` como array de strings (distinto de Discord que
  // lo manda como string espaciada). Ejemplo: ["user:read:follows"].
  scope: z.array(z.string()),
});

const TwitchUserResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      login: z.string(),
      display_name: z.string(),
    }),
  ).min(1),
});

/**
 * GET /api/auth/social/twitch/callback?code=...&state=...
 *
 * Recibe el redirect del OAuth server de Twitch. Verifica sesión + state,
 * intercambia `code` por token, obtiene el user via
 * `GET /helix/users` (usuario del token), y guarda la cuenta conectada
 * con el access_token cifrado.
 *
 * NUNCA concede puntos aquí — la verificación de misiones se hace
 * después vía server action.
 *
 * Fase B: NO se guarda `refresh_token`. El access token de Twitch dura
 * ~4h; cuando expira, la UI pide reconectar.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return redirectToProfile('oauth_denied');
  }
  if (!code || !state) {
    return redirectToProfile('invalid_params');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (!isTwitchOauthConfigured() || !isTokenEncryptionConfigured()) {
    return redirectToProfile('twitch_not_configured');
  }
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const redirectUri = env.TWITCH_OAUTH_REDIRECT_URL;
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectToProfile('twitch_not_configured');
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('sp_twitch_oauth_state')?.value;
  const returnTo = cookieStore.get('sp_twitch_oauth_return')?.value ?? '/sorteos/perfil';
  if (!savedState || savedState !== state) {
    return redirectToProfile('state_mismatch');
  }
  cookieStore.delete('sp_twitch_oauth_state');
  cookieStore.delete('sp_twitch_oauth_return');

  // Intercambio code → token.
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  let tokenData: z.infer<typeof TwitchTokenSchema>;
  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    if (!tokenRes.ok) {
      console.warn('[twitch-callback] token exchange failed', { status: tokenRes.status });
      return redirectToProfile('token_exchange_failed', returnTo);
    }
    tokenData = TwitchTokenSchema.parse(await tokenRes.json());
  } catch (err) {
    console.warn('[twitch-callback] token network error', { message: err instanceof Error ? err.name : 'unknown' });
    return redirectToProfile('token_network_error', returnTo);
  }

  // Obtener el user Twitch del token (GET /helix/users sin params → user del token).
  let twitchUser: { id: string; login: string; display_name: string };
  try {
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    });
    if (!userRes.ok) {
      return redirectToProfile('twitch_user_fetch_failed', returnTo);
    }
    const parsed = TwitchUserResponseSchema.parse(await userRes.json());
    // TwitchUserResponseSchema.data.min(1) garantiza al menos 1 elemento,
    // pero el narrowing de TS no lo captura — usamos guard explícito.
    const first = parsed.data[0];
    if (!first) {
      return redirectToProfile('twitch_user_fetch_failed', returnTo);
    }
    twitchUser = first;
  } catch {
    return redirectToProfile('twitch_user_network_error', returnTo);
  }

  const encryptedAccess = encrypt(tokenData.access_token);
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await upsertConnectedAccount({
    userId: session.user.id,
    provider: 'twitch',
    providerUserId: twitchUser.id,
    providerUsername: twitchUser.login,
    providerDisplayName: twitchUser.display_name,
    accessTokenEncrypted: encryptedAccess,
    // Twitch devuelve scope como array; lo normalizamos a string separado
    // por espacios (formato universal, coherente con la col `scope text`).
    scope: tokenData.scope.join(' '),
    expiresAt,
  });

  return redirectToProfile('ok', returnTo);
}

function redirectToProfile(status: string, target = '/sorteos/perfil'): NextResponse {
  const base = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const dest = new URL(target, base);
  dest.searchParams.set('twitch_status', status);
  return NextResponse.redirect(dest.toString(), 302);
}
