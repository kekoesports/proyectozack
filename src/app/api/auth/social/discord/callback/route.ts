import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { encrypt, isTokenEncryptionConfigured } from '@/lib/crypto/token-encryption';
import { upsertConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { isDiscordOauthConfigured } from '@/features/giveaway-platform/constants/discord-missions';
import { sanitizeSocialReturnPath } from '@/lib/auth/sanitize-social-return';
import { claimDiscordGuildMissionsForUser } from '@/lib/discord/claim-guild-missions';

const DiscordTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().optional(), // No lo guardamos en Fase A.
  scope: z.string(),
});

const DiscordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullable().optional(),
  discriminator: z.string().nullable().optional(),
});

/**
 * GET /api/auth/social/discord/callback?code=...&state=...
 *
 * Recibe el redirect del OAuth server de Discord. Verifica sesión + state,
 * intercambia `code` por token, obtiene el user, y guarda la cuenta
 * conectada con el access_token cifrado.
 *
 * NUNCA concede puntos aquí — la verificación de misiones se hace
 * después vía server action.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  // 1) Errores devueltos por Discord (user rechazó, etc.).
  if (oauthError) {
    return redirectToProfile('oauth_denied');
  }
  if (!code || !state) {
    return redirectToProfile('invalid_params');
  }

  // 2) Sesión SocialPro obligatoria.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (!isDiscordOauthConfigured() || !isTokenEncryptionConfigured()) {
    return redirectToProfile('discord_not_configured');
  }
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const redirectUri = env.DISCORD_OAUTH_REDIRECT_URL;
  if (!clientId || !clientSecret || !redirectUri) {
    // El guard anterior ya lo cubre; este narrowing evita `!` en el body.
    return redirectToProfile('discord_not_configured');
  }

  // 3) Verificar state contra cookie.
  const cookieStore = await cookies();
  const savedState = cookieStore.get('sp_disc_oauth_state')?.value;
  const returnTo = sanitizeSocialReturnPath(cookieStore.get('sp_disc_oauth_return')?.value);
  if (!savedState || savedState !== state) {
    return redirectToProfile('state_mismatch');
  }
  // Consume el state — de un solo uso.
  cookieStore.delete('sp_disc_oauth_state');
  cookieStore.delete('sp_disc_oauth_return');

  // 4) Intercambio code → token.
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  let tokenData: z.infer<typeof DiscordTokenSchema>;
  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    if (!tokenRes.ok) {
      console.warn('[discord-callback] token exchange failed', { status: tokenRes.status });
      return redirectToProfile('token_exchange_failed', returnTo);
    }
    tokenData = DiscordTokenSchema.parse(await tokenRes.json());
  } catch (err) {
    console.warn('[discord-callback] token network error', { message: err instanceof Error ? err.name : 'unknown' });
    return redirectToProfile('token_network_error', returnTo);
  }

  // 5) Obtener perfil Discord del usuario.
  let discordUser: z.infer<typeof DiscordUserSchema>;
  try {
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    if (!userRes.ok) {
      return redirectToProfile('discord_user_fetch_failed', returnTo);
    }
    discordUser = DiscordUserSchema.parse(await userRes.json());
  } catch {
    return redirectToProfile('discord_user_network_error', returnTo);
  }

  // 6) Guardar cuenta conectada con access_token cifrado.
  //    NO guardamos refresh_token (Fase A). NO guardamos la lista de
  //    guilds — se consulta en tiempo real al verificar cada misión.
  let encryptedAccess: string;
  try {
    encryptedAccess = encrypt(tokenData.access_token);
  } catch (err) {
    console.warn('[discord-callback] encrypt failed', {
      message: err instanceof Error ? err.name : 'unknown',
    });
    return redirectToProfile('encrypt_failed', returnTo);
  }
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  try {
    await upsertConnectedAccount({
      userId: session.user.id,
      provider: 'discord',
      providerUserId: discordUser.id,
      providerUsername: discordUser.username,
      providerDisplayName: discordUser.global_name ?? null,
      accessTokenEncrypted: encryptedAccess,
      scope: tokenData.scope,
      expiresAt,
    });
  } catch (err) {
    // UNIQUE (provider, provider_user_id): la misma cuenta Discord ya
    // está vinculada a otro usuario SocialPro.
    console.warn('[discord-callback] upsert failed', {
      message: err instanceof Error ? err.name : 'unknown',
    });
    return redirectToProfile('account_in_use', returnTo);
  }

  // 7) Auto-claim: si el jugador YA está en el guild de alguna misión
  //    Discord activa, concede puntos en el mismo redirect. Evita el
  //    anti-patrón "conecté y no me sumó" (antes había que pulsar Verificar).
  try {
    const claim = await claimDiscordGuildMissionsForUser({
      userId: session.user.id,
      accessToken: tokenData.access_token,
    });
    if (claim.ok && claim.awarded.length > 0) {
      const total = claim.awarded.reduce((s, a) => s + a.rewardCoins, 0);
      return redirectToProfile('rewarded', returnTo, { coins: String(total) });
    }
    // Conectado OK pero aún no en el servidor → pide unirse + verificar.
    return redirectToProfile('connected_join_server', returnTo);
  } catch (err) {
    console.warn('[discord-callback] auto-claim failed', {
      message: err instanceof Error ? err.name : 'unknown',
    });
    return redirectToProfile('ok', returnTo);
  }
}

function redirectToProfile(
  status: string,
  target = '/sorteos/perfil',
  extra?: Record<string, string>,
): NextResponse {
  const base = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const dest = new URL(sanitizeSocialReturnPath(target), base);
  dest.searchParams.set('discord_status', status);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      dest.searchParams.set(k, v);
    }
  }
  return NextResponse.redirect(dest.toString(), 302);
}
