import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { SITE_URL } from '@/lib/site-url';
import { getProvider, isActiveProvider, isProviderConfigured } from '@/lib/social/providers';
import { isSocialCryptoConfigured } from '@/lib/social/crypto';
import { generateState, signState, STATE_COOKIE_NAME, STATE_TTL_MS } from '@/lib/social/state';

/**
 * GET /api/social/[provider]/connect
 *
 * Session guard → genera state firmado → cookie httpOnly Path=/api/social
 * → 302 al authorizeUrl del provider con state en query.
 *
 * Responde:
 *   302 → provider           OK
 *   302 → /sorteos/plataforma no logueado
 *   400                       provider desconocido
 *   501                       provider planned (x, instagram)
 *   503                       provider activo sin env vars configuradas
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await ctx.params;
  const cfg = getProvider(provider);
  if (!cfg) return NextResponse.json({ error: 'provider_unknown' }, { status: 400 });
  if (cfg.status === 'planned') {
    return NextResponse.json({ error: 'provider_planned', reason: cfg.reason }, { status: 501 });
  }
  if (!isActiveProvider(provider)) {
    return NextResponse.json({ error: 'provider_unknown' }, { status: 400 });
  }
  if (!isProviderConfigured(provider) || !isSocialCryptoConfigured()) {
    return NextResponse.json({ error: 'provider_not_configured' }, { status: 503 });
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.redirect(new URL('/sorteos/plataforma', SITE_URL), { status: 302 });
  }

  const state = generateState();
  const signed = signState({ state, provider, ts: Date.now() });
  const clientId = cfg.clientId();
  if (!clientId) return NextResponse.json({ error: 'provider_not_configured' }, { status: 503 });

  const redirectUri = `${SITE_URL}/api/social/${provider}/callback`;
  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
  });
  // Google necesita explicitly access_type=offline + prompt=consent para emitir refresh_token
  if (provider === 'google') {
    authorizeParams.set('access_type', 'offline');
    authorizeParams.set('prompt', 'consent');
    authorizeParams.set('include_granted_scopes', 'true');
  }
  // Discord: prompt=consent para pedir aceptación explícita cada vez
  if (provider === 'discord') {
    authorizeParams.set('prompt', 'consent');
  }

  const response = NextResponse.redirect(
    `${cfg.authorizeUrl}?${authorizeParams.toString()}`,
    { status: 302 },
  );
  response.cookies.set(STATE_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SITE_URL.startsWith('https://'),
    path: '/api/social',
    maxAge: Math.floor(STATE_TTL_MS / 1000),
  });
  // env se importa para forzar validación temprana; evita el "unused" del lint
  void env;
  return response;
}
