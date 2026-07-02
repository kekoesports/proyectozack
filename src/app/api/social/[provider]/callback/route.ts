import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SITE_URL } from '@/lib/site-url';
import { getProvider, isActiveProvider, isProviderConfigured } from '@/lib/social/providers';
import { isSocialCryptoConfigured } from '@/lib/social/crypto';
import { STATE_COOKIE_NAME, verifyState } from '@/lib/social/state';
import { exchangeCode, fetchProfile } from '@/lib/social/oauth';
import { upsertSocialAccount } from '@/lib/social/accounts';

/**
 * GET /api/social/[provider]/callback
 *
 * Valida state cookie → intercambia code → descarga perfil → upsert
 * cifrando tokens → limpia state cookie → 302 a /perfil con banner
 * `?social=connected` (o `?social_error=...` si algo falló).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await ctx.params;
  const perfilUrl = new URL('/sorteos/plataforma/perfil', SITE_URL);

  if (!isActiveProvider(provider) || !isProviderConfigured(provider) || !isSocialCryptoConfigured()) {
    return redirectWithError(perfilUrl, 'provider_not_configured', provider);
  }
  const cfg = getProvider(provider);
  if (!cfg || cfg.status !== 'active') {
    return redirectWithError(perfilUrl, 'provider_not_configured', provider);
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.redirect(new URL('/sorteos/plataforma', SITE_URL), { status: 302 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateQuery = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) {
    // El user canceló en el provider (access_denied) o algo similar.
    return redirectWithError(perfilUrl, 'user_denied', provider);
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieValue = parseCookieValue(cookieHeader, STATE_COOKIE_NAME);
  const payload = verifyState(cookieValue, provider);
  if (!payload || !stateQuery || payload.state !== stateQuery) {
    return redirectWithError(perfilUrl, 'state', provider, /* clearCookie */ true);
  }
  if (!code) {
    return redirectWithError(perfilUrl, 'no_code', provider, true);
  }

  const redirectUri = `${SITE_URL}/api/social/${provider}/callback`;

  try {
    const token = await exchangeCode(provider, code, redirectUri);
    const profile = await fetchProfile(provider, token.accessToken);
    await upsertSocialAccount({ userId: session.user.id, provider, profile, token });
  } catch (e) {
    const errCode = e instanceof Error && e.name === 'SocialAccountAlreadyLinkedError'
      ? 'already_linked'
      : 'exchange_or_profile_failed';
    return redirectWithError(perfilUrl, errCode, provider, true);
  }

  perfilUrl.searchParams.set('social', 'connected');
  perfilUrl.searchParams.set('provider', provider);
  const response = NextResponse.redirect(perfilUrl, { status: 302 });
  // Limpia state cookie
  response.cookies.set(STATE_COOKIE_NAME, '', { httpOnly: true, path: '/api/social', maxAge: 0 });
  return response;
}

function redirectWithError(perfilUrl: URL, code: string, provider: string, clearCookie = false): Response {
  perfilUrl.searchParams.set('social_error', code);
  perfilUrl.searchParams.set('provider', provider);
  const response = NextResponse.redirect(perfilUrl, { status: 302 });
  if (clearCookie) {
    response.cookies.set(STATE_COOKIE_NAME, '', { httpOnly: true, path: '/api/social', maxAge: 0 });
  }
  return response;
}

/** Extract una cookie por nombre de un header `Cookie:` crudo. */
function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}
