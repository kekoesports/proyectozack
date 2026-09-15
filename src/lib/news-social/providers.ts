import { createHash, createHmac, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';
import { InstagramContainer, InstagramCreated, InstagramError, InstagramIdentity, XIdentity, XPublished } from '@/lib/schemas/news-social';
import type { NewsSocialChannel } from '@/lib/schemas/news-social';

export class SocialProviderError extends Error {
  constructor(readonly code: string, readonly uncertain = false, readonly retryable = false) {
    super(code);
  }
}

export function hasPublishingCredentials(channel: NewsSocialChannel): boolean {
  if (channel === 'x') return !!(env.NEWS_SOCIAL_X_API_KEY && env.NEWS_SOCIAL_X_API_SECRET
    && env.NEWS_SOCIAL_X_ACCESS_TOKEN && env.NEWS_SOCIAL_X_ACCESS_SECRET);
  return !!(env.INSTAGRAM_BUSINESS_ACCOUNT_ID && env.META_INSTAGRAM_ACCESS_TOKEN && env.META_GRAPH_API_VERSION);
}

const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function socialCredentialFingerprint(channel: NewsSocialChannel): string {
  const values = channel === 'x'
    ? [env.NEWS_SOCIAL_X_API_KEY, env.NEWS_SOCIAL_X_API_SECRET, env.NEWS_SOCIAL_X_ACCESS_TOKEN, env.NEWS_SOCIAL_X_ACCESS_SECRET]
    : [env.INSTAGRAM_BUSINESS_ACCOUNT_ID, env.META_INSTAGRAM_ACCESS_TOKEN, env.META_GRAPH_API_VERSION];
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

function xAuthorization(method: string, url: string): string {
  if (!hasPublishingCredentials('x')) throw new SocialProviderError('credentials_missing');
  const params: Record<string, string> = {
    oauth_consumer_key: env.NEWS_SOCIAL_X_API_KEY ?? '',
    oauth_token: env.NEWS_SOCIAL_X_ACCESS_TOKEN ?? '',
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA1', oauth_version: '1.0',
  };
  const parsed = new URL(url);
  const pairs = [...Object.entries(params), ...parsed.searchParams.entries()]
    .map(([key, value]) => [encode(key), encode(value)] as const)
    .sort(([a, av], [b, bv]) => a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0);
  const base = `${method}&${encode(`${parsed.origin}${parsed.pathname}`)}&${encode(pairs.map(([k, v]) => `${k}=${v}`).join('&'))}`;
  params.oauth_signature = createHmac('sha1', `${encode(env.NEWS_SOCIAL_X_API_SECRET ?? '')}&${encode(env.NEWS_SOCIAL_X_ACCESS_SECRET ?? '')}`)
    .update(base).digest('base64');
  return `OAuth ${Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(', ')}`;
}

async function requestJson(url: string, options: RequestInit, publishes: boolean): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000), redirect: 'error', cache: 'no-store' });
  } catch {
    throw new SocialProviderError('network_error', publishes, !publishes);
  }
  if (!response.ok) {
    // Never include provider bodies: they can echo tokens or account details.
    if (url.startsWith('https://graph.facebook.com/')) {
      const parsed = InstagramError.safeParse(await response.json().catch(() => null));
      if (parsed.success) {
        const code = parsed.data.error.code;
        if (code === 190) throw new SocialProviderError('provider_http_401');
        if (code === 10 || code === 200) throw new SocialProviderError('provider_http_403');
        if ([4, 17, 32, 613].includes(code)) throw new SocialProviderError('provider_http_429', false, true);
      }
    }
    throw new SocialProviderError(`provider_http_${response.status}`, publishes && response.status >= 500, response.status === 429 || (!publishes && response.status >= 500));
  }
  try { return await response.json(); }
  catch { throw new SocialProviderError('invalid_provider_response', publishes, !publishes); }
}

async function xRequest(path: string, text?: string): Promise<unknown> {
  const url = `https://api.x.com/2/${path}`;
  const method = text === undefined ? 'GET' : 'POST';
  return requestJson(url, { method, headers: { Authorization: xAuthorization(method, url), 'Content-Type': 'application/json' },
    ...(text === undefined ? {} : { body: JSON.stringify({ text }) }),
  }, text !== undefined);
}

async function instagramRequest(path: string, body?: Record<string, string>, publishes = false): Promise<unknown> {
  if (!hasPublishingCredentials('instagram')) throw new SocialProviderError('credentials_missing');
  const url = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${path}`;
  return requestJson(url, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env.META_INSTAGRAM_ACCESS_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
  }, publishes);
}

export async function verifySocialIdentity(channel: NewsSocialChannel): Promise<string> {
  if (channel === 'x') {
    const identity = XIdentity.safeParse(await xRequest('users/me'));
    if (!identity.success || identity.data.data.username.toLowerCase() !== 'socialproes') throw new SocialProviderError('account_mismatch');
    return identity.data.data.id;
  }
  // Facebook Login's IGUser has id/username, but no account_type field.
  const identity = InstagramIdentity.safeParse(await instagramRequest(`${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=id,username`));
  if (!identity.success || identity.data.username.toLowerCase() !== 'socialproes'
    || identity.data.id !== env.INSTAGRAM_BUSINESS_ACCOUNT_ID) throw new SocialProviderError('account_mismatch');
  return identity.data.id;
}

export async function publishX(text: string): Promise<string> {
  const result = XPublished.safeParse(await xRequest('tweets', text));
  if (!result.success) throw new SocialProviderError('invalid_provider_response', true);
  return result.data.data.id;
}

export async function createInstagramStory(imageUrl: string): Promise<string> {
  const result = InstagramCreated.safeParse(await instagramRequest(`${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, { media_type: 'STORIES', image_url: imageUrl }));
  if (!result.success) throw new SocialProviderError('invalid_provider_response', false, true);
  return result.data.id;
}

export async function instagramContainerStatus(containerId: string) {
  const result = InstagramContainer.safeParse(await instagramRequest(`${containerId}?fields=status_code`));
  if (!result.success) throw new SocialProviderError('invalid_provider_response', false, true);
  return result.data.status_code;
}

export async function publishInstagramStory(containerId: string): Promise<string> {
  const result = InstagramCreated.safeParse(await instagramRequest(`${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, { creation_id: containerId }, true));
  if (!result.success) throw new SocialProviderError('invalid_provider_response', true);
  return result.data.id;
}
