import { z } from 'zod';

export const TwitchToken = z.object({
  access_token: z.string().min(1), expires_in: z.number().int().nonnegative().safe(),
  token_type: z.literal('bearer'),
});
export const TwitchFollowerTotal = z.object({ total: z.number().int().nonnegative().safe() });

export const TwitchCategorySearch = z.object({ query: z.string().trim().min(1).max(100) });
export const TwitchCategories = z.object({
  data: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).max(20),
  pagination: z.object({ cursor: z.string().min(1).optional() }),
});
export const TwitchUsers = z.object({ data: z.array(z.object({
  id: z.string().min(1), login: z.string().min(1), display_name: z.string(),
  profile_image_url: z.union([z.literal(''), z.url()]),
})) });
export const TwitchGameDiscovery = z.object({
  gameId: z.string().trim().min(1).max(200), maxPages: z.number().int().min(1).max(3),
  first: z.number().int().min(1).max(100), language: z.string().min(2).max(10).optional(),
});
export const TwitchGameStreams = z.object({
  data: z.array(z.object({
    id: z.string().min(1), user_id: z.string().min(1), user_login: z.string().min(1),
    user_name: z.string(), game_id: z.string(), game_name: z.string(),
    language: z.string(), viewer_count: z.number().int().nonnegative().safe(),
    started_at: z.iso.datetime({ offset: true }), thumbnail_url: z.string(),
  })),
  pagination: z.object({ cursor: z.string().min(1).optional() }),
});
