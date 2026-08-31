import { z } from 'zod';
import { env } from '@/lib/env';

const KickChannelSchema = z.object({
  id: z.coerce.number(),
  user_id: z.coerce.number(),
  slug: z.string(),
  is_banned: z.boolean(),
  followers_count: z.coerce.number(),
  banner_image: z.object({ url: z.string() }).nullable(),
  recent_categories: z.array(z.object({ id: z.coerce.number(), name: z.string() })).nullable().optional(),
  user: z.object({
    id: z.coerce.number(),
    username: z.string(),
    bio: z.string().nullable(),
    country: z.string().nullable().optional(),
    profile_pic: z.string().nullable(),
  }),
  livestream: z.object({ is_live: z.boolean(), session_title: z.string() }).nullable(),
  previous_livestreams: z.array(z.object({ created_at: z.string() })).nullable().optional(),
});

export type KickChannelPreview = {
  readonly slug: string;
  readonly username: string;
  readonly userId: number;
  readonly followers: number;
  readonly bio: string | null;
  readonly country: string | null;
  readonly profilePicUrl: string | null;
  readonly bannerUrl: string | null;
  readonly recentCategories: readonly string[];
  readonly isLive: boolean;
  readonly lastLivestreamAt: Date | null;
}

const KICK_BASE = 'https://kick.com/api/v2/channels';
const KICK_PUBLIC_API = 'https://api.kick.com/public/v2';

const KickTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.coerce.number().positive().optional(),
});

const KickCategoriesSchema = z.object({
  data: z.array(z.object({ id: z.coerce.number(), name: z.string() })),
});

const KickLivestreamsSchema = z.object({
  data: z.array(z.object({
    broadcaster_user: z.object({
      id: z.coerce.number(),
      username: z.string(),
      profile_picture: z.string().nullable().optional(),
    }),
    category: z.object({ id: z.coerce.number(), name: z.string() }),
    channel: z.object({ slug: z.string() }),
    language_code: z.string(),
    started_at: z.string(),
    title: z.string(),
    viewer_count: z.coerce.number(),
  })),
});

export type KickLiveCreator = {
  readonly userId: number;
  readonly username: string;
  readonly slug: string;
  readonly profilePicUrl: string | null;
  readonly category: string;
  readonly language: string;
  readonly title: string;
  readonly viewerCount: number;
  readonly startedAt: Date;
};

let cachedAppToken: { readonly value: string; readonly expiresAt: number } | null = null;

async function getKickAppToken(): Promise<string> {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) return cachedAppToken.value;
  if (!env.KICK_CLIENT_ID || !env.KICK_CLIENT_SECRET) {
    throw new Error('KICK_CLIENT_ID or KICK_CLIENT_SECRET is not set');
  }

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.KICK_CLIENT_ID,
      client_secret: env.KICK_CLIENT_SECRET,
    }),
  });
  if (!response.ok) throw new Error(`Kick token error (${response.status})`);

  const token = KickTokenSchema.parse(await response.json());
  cachedAppToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3_600) * 1_000,
  };
  return token.access_token;
}

/** Finds live CS2 creators using Kick's official Developer Public API. */
export async function getKickCs2LiveCreators(limit = 100): Promise<KickLiveCreator[]> {
  const token = await getKickAppToken();
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const categoryParams = new URLSearchParams({ name: 'Counter-Strike 2', limit: '25' });
  const categoriesResponse = await fetch(`${KICK_PUBLIC_API}/categories?${categoryParams.toString()}`, { headers });
  if (!categoriesResponse.ok) throw new Error(`Kick categories API error (${categoriesResponse.status})`);

  const categories = KickCategoriesSchema.parse(await categoriesResponse.json());
  const category = categories.data.find((item) => /counter[- ]?strike 2|\bcs2\b/i.test(item.name));
  if (!category) return [];

  const streamsParams = new URLSearchParams({
    category_id: String(category.id),
    limit: String(Math.min(Math.max(limit, 1), 1_000)),
  });
  const streamsResponse = await fetch(`${KICK_PUBLIC_API}/livestreams?${streamsParams.toString()}`, { headers });
  if (!streamsResponse.ok) throw new Error(`Kick livestreams API error (${streamsResponse.status})`);

  const streams = KickLivestreamsSchema.parse(await streamsResponse.json());
  return streams.data.map((stream) => ({
    userId: stream.broadcaster_user.id,
    username: stream.broadcaster_user.username,
    slug: stream.channel.slug,
    profilePicUrl: stream.broadcaster_user.profile_picture ?? null,
    category: stream.category.name,
    language: stream.language_code,
    title: stream.title,
    viewerCount: stream.viewer_count,
    startedAt: new Date(stream.started_at),
  }));
}

/**
 * Fetch a Kick channel by slug. Returns null on 404 (channel not found or banned).
 * Throws on other non-OK responses.
 */
export async function getKickChannel(slug: string): Promise<KickChannelPreview | null> {
  const res = await fetch(`${KICK_BASE}/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kick API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = KickChannelSchema.parse(await res.json());
  if (data.is_banned) return null;

  const previous = data.previous_livestreams ?? [];
  const firstPrevious = previous[0];
  const lastLivestreamAt = firstPrevious ? new Date(firstPrevious.created_at) : null;

  return {
    slug: data.slug,
    username: data.user.username,
    userId: data.user.id,
    followers: data.followers_count,
    bio: data.user.bio,
    country: data.user.country ?? null,
    profilePicUrl: data.user.profile_pic,
    bannerUrl: data.banner_image?.url ?? null,
    recentCategories: (data.recent_categories ?? []).map((c) => c.name),
    isLive: data.livestream?.is_live ?? false,
    lastLivestreamAt,
  };
}
