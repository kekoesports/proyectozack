import { z } from 'zod';

const KickChannelSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  slug: z.string(),
  is_banned: z.boolean(),
  followers_count: z.number(),
  banner_image: z.object({ url: z.string() }).nullable(),
  recent_categories: z.array(z.object({ id: z.number(), name: z.string() })).nullable(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    bio: z.string().nullable(),
    country: z.string().nullable(),
    profile_pic: z.string().nullable(),
  }),
  livestream: z.object({ is_live: z.boolean(), session_title: z.string() }).nullable(),
  previous_livestreams: z.array(z.object({ created_at: z.string() })).nullable(),
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
    country: data.user.country,
    profilePicUrl: data.user.profile_pic,
    bannerUrl: data.banner_image?.url ?? null,
    recentCategories: (data.recent_categories ?? []).map((c) => c.name),
    isLive: data.livestream?.is_live ?? false,
    lastLivestreamAt,
  };
}
