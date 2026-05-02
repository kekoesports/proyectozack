type KickChannelResponse = {
  id: number;
  user_id: number;
  slug: string;
  is_banned: boolean;
  followers_count: number;
  banner_image: { url: string } | null;
  recent_categories: Array<{ id: number; name: string }> | null;
  user: {
    id: number;
    username: string;
    bio: string | null;
    country: string | null;
    profile_pic: string | null;
  };
  livestream: { is_live: boolean; session_title: string } | null;
  previous_livestreams: Array<{ created_at: string }> | null;
}

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

  const data: KickChannelResponse = await res.json();
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
