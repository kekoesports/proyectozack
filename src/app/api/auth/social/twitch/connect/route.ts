import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { TWITCH_OAUTH_SCOPES, isTwitchOauthConfigured } from '@/features/giveaway-platform/constants/twitch-missions';

/**
 * GET /api/auth/social/twitch/connect
 *
 * Inicia el flujo OAuth 2.0 code grant para conectar la cuenta Twitch
 * del usuario SocialPro autenticado.
 *
 * Pasos:
 *   1. Verifica sesión Better Auth. Si no hay → 401.
 *   2. Genera `state` aleatorio (32 bytes hex) y lo persiste en cookie
 *      httpOnly + sameSite=Lax + 10 min TTL. Se usa para verificar en el
 *      callback (protección CSRF).
 *   3. Redirige a `https://id.twitch.tv/oauth2/authorize` con:
 *        client_id, redirect_uri, response_type=code,
 *        scope=user:read:follows, state, force_verify=true.
 *
 * NO concede puntos. NO consulta APIs Twitch. Solo inicia el redirect.
 */
export async function GET(request: Request) {
  if (!isTwitchOauthConfigured()) {
    return NextResponse.json(
      { error: 'twitch_oauth_not_configured' },
      { status: 503 },
    );
  }
  const clientId = env.TWITCH_CLIENT_ID;
  const redirectUri = env.TWITCH_OAUTH_REDIRECT_URL;
  if (!clientId || !redirectUri) {
    // Guard extra para narrowing — el chequeo anterior ya lo cubre.
    return NextResponse.json(
      { error: 'twitch_oauth_not_configured' },
      { status: 503 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Preserva el destino de retorno (querystring `return` opcional).
  const url = new URL(request.url);
  const returnTo = sanitizeReturnPath(url.searchParams.get('return'));

  // State: 32 bytes hex.
  const state = randomBytes(32).toString('hex');
  const stateCookie = await cookies();
  stateCookie.set('sp_twitch_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalHost(),
    path: '/api/auth/social/twitch',
    maxAge: 10 * 60,
  });
  stateCookie.set('sp_twitch_oauth_return', returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalHost(),
    path: '/api/auth/social/twitch',
    maxAge: 10 * 60,
  });

  const authorizeUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', TWITCH_OAUTH_SCOPES);
  authorizeUrl.searchParams.set('state', state);
  // force_verify=true fuerza a Twitch a mostrar la pantalla de consentimiento
  // incluso si el usuario ya autorizó esta app antes. Útil porque en Fase B
  // pedimos re-autorización cada ~4h (no guardamos refresh_token).
  authorizeUrl.searchParams.set('force_verify', 'true');

  return NextResponse.redirect(authorizeUrl.toString(), 302);
}

/** Normaliza el destino de retorno — solo aceptamos rutas internas. */
function sanitizeReturnPath(raw: string | null): string {
  if (!raw) return '/sorteos/perfil';
  if (!raw.startsWith('/')) return '/sorteos/perfil';
  if (raw.startsWith('//')) return '/sorteos/perfil';
  return raw;
}

function isLocalHost(): boolean {
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (!site) return false;
  try {
    const u = new URL(site);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
