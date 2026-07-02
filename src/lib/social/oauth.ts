import { getProvider, type SocialProviderKey } from './providers';

/**
 * Cliente OAuth genérico: exchange code → token, fetch profile,
 * revoke token. Cada provider comparte el mismo flow OAuth 2.0
 * authorization_code, solo cambian URLs y la forma del perfil.
 *
 * Sin dependencias externas. Fetch nativo con timeout.
 */

const FETCH_TIMEOUT_MS = 10_000;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  scope: string | null;
  tokenType: string;
}

export interface NormalizedProfile {
  providerUserId: string;
  username: string | null;
  avatarUrl: string | null;
}

/**
 * Intercambia el authorization code por un token bundle.
 * Throws si el provider no está activo/configurado o si Discord/Google fallan.
 */
export async function exchangeCode(
  provider: SocialProviderKey,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const cfg = getProvider(provider);
  if (cfg?.status !== 'active') throw new Error(`Provider ${provider} no activo`);
  const clientId = cfg.clientId();
  const clientSecret = cfg.clientSecret();
  if (!clientId || !clientSecret) throw new Error(`Provider ${provider} no configurado`);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetchWithTimeout(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange fallo (${provider}): HTTP ${res.status}`);
  }
  const raw = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!raw.access_token) throw new Error(`Token exchange sin access_token (${provider})`);
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? null,
    expiresIn: typeof raw.expires_in === 'number' ? raw.expires_in : null,
    scope: raw.scope ?? null,
    tokenType: raw.token_type ?? 'Bearer',
  };
}

/**
 * Descarga el perfil público del usuario en el provider y lo normaliza
 * al shape común (`providerUserId`, `username`, `avatarUrl`).
 */
export async function fetchProfile(
  provider: SocialProviderKey,
  accessToken: string,
): Promise<NormalizedProfile> {
  const cfg = getProvider(provider);
  if (cfg?.status !== 'active') throw new Error(`Provider ${provider} no activo`);

  const res = await fetchWithTimeout(cfg.profileUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Profile fetch fallo (${provider}): HTTP ${res.status}`);
  const raw = await res.json() as Record<string, unknown>;

  if (provider === 'discord') return normalizeDiscord(raw);
  if (provider === 'google') return normalizeGoogle(raw);
  throw new Error(`Provider ${provider} sin normalizer`);
}

/**
 * Revoca un access_token en el provider. Best-effort: swallows errors y
 * timeouts para no bloquear el disconnect en DB si el provider está caído.
 */
export async function revokeToken(provider: SocialProviderKey, accessToken: string): Promise<void> {
  const cfg = getProvider(provider);
  if (cfg?.status !== 'active' || !cfg.revokeUrl) return;
  const clientId = cfg.clientId();
  const clientSecret = cfg.clientSecret();
  if (!clientId || !clientSecret) return;

  try {
    if (provider === 'discord') {
      // Discord: POST con client credentials en body
      await fetchWithTimeout(cfg.revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken, client_id: clientId, client_secret: clientSecret }).toString(),
      }, 3_000);
    } else if (provider === 'google') {
      // Google: POST simple con token en body
      await fetchWithTimeout(cfg.revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken }).toString(),
      }, 3_000);
    }
  } catch {
    // best-effort: ignore
  }
}

function normalizeDiscord(raw: Record<string, unknown>): NormalizedProfile {
  const id = typeof raw.id === 'string' ? raw.id : null;
  if (!id) throw new Error('Discord profile sin id');
  const username = typeof raw.global_name === 'string' && raw.global_name
    ? raw.global_name
    : typeof raw.username === 'string' ? raw.username : null;
  const avatarHash = typeof raw.avatar === 'string' ? raw.avatar : null;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=128`
    : null;
  return { providerUserId: id, username, avatarUrl };
}

function normalizeGoogle(raw: Record<string, unknown>): NormalizedProfile {
  const id = typeof raw.sub === 'string' ? raw.sub : null;
  if (!id) throw new Error('Google profile sin sub');
  const email = typeof raw.email === 'string' ? raw.email : null;
  const name = typeof raw.name === 'string' ? raw.name : null;
  const picture = typeof raw.picture === 'string' ? raw.picture : null;
  return { providerUserId: id, username: name ?? email, avatarUrl: picture };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
