import { env } from '@/lib/env';
import { TwitchToken } from '@/lib/schemas/twitch-discovery';
import { readProviderJson } from './provider-http';

type TwitchAuth = { readonly token: string; readonly clientId: string };
let cachedAuth: TwitchAuth | null = null;
let tokenExpiresAt = 0;
let pendingAuth: Promise<TwitchAuth> | null = null;

/** Single-flight prevents concurrent enrichment from issuing a burst of token requests. */
export async function getAppAccessToken(): Promise<TwitchAuth> {
  if (cachedAuth && Date.now() < tokenExpiresAt) return cachedAuth;
  if (pendingAuth) return pendingAuth;
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set');
  pendingAuth = (async () => {
    const data = await readProviderJson('https://id.twitch.tv/oauth2/token', TwitchToken, 'Twitch token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    });
    cachedAuth = { token: data.access_token, clientId };
    tokenExpiresAt = Date.now() + Math.max(0, data.expires_in - 300) * 1000;
    return cachedAuth;
  })();
  try { return await pendingAuth; } finally { pendingAuth = null; }
}
