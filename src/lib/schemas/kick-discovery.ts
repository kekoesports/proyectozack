import { z } from 'zod';

const id = z.number().int().positive().safe();
const image = z.string().url().refine(value => /^https?:\/\//.test(value)).or(z.literal('')).nullish();
// Official V2 pagination permits an empty cursor: no next page, not malformed data.
const cursor = z.string().max(2000).nullish();
const category = z.object({ id, name: z.string().min(1) });
export const KickSlug = z.string().trim().min(1).max(25).regex(/^[a-zA-Z0-9_-]+$/).transform(value => value.toLowerCase());
export const KickToken = z.object({ access_token: z.string().min(1), expires_in: z.number().int().positive().safe() });
export const KickCategories = z.object({
  data: z.array(category).max(1000),
  pagination: z.object({ next_cursor: cursor }).optional(),
});
export const KickLivestreams = z.object({
  data: z.array(z.object({
    broadcaster_user: z.object({ id, username: z.string().min(1), profile_picture: image }),
    category, channel: z.object({ slug: KickSlug }), language_code: z.string().min(1),
    started_at: z.string().datetime({ offset: true }), title: z.string(),
    viewer_count: z.number().int().nonnegative().safe(),
  })).max(1000),
  pagination: z.object({ next_cursor: cursor }).optional(),
});
export const KickChannels = z.object({ data: z.array(z.object({
  broadcaster_user_id: id, slug: KickSlug, channel_description: z.string().nullish(),
  banner_picture: image, category: category.nullish(),
  stream: z.object({
    is_live: z.boolean(), start_time: z.string().datetime({ offset: true }).or(z.literal('')).nullish(),
  }).nullish(),
})).max(50) });
export const KickUsers = z.object({ data: z.array(z.object({
  user_id: id, name: z.string().min(1), profile_picture: image,
})).max(100) });
export const KickDiscoveryInput = z.object({
  categoryName: z.string().trim().min(3).max(100).default('Counter-Strike 2'),
  languageCodes: z.array(z.string().regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/)).max(25).default([]),
  minViewerCount: z.number().int().nonnegative().safe().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  pageSize: z.number().int().min(1).max(1000).default(100),
  maxPages: z.number().int().min(1).max(10).default(5),
});
export type KickDiscoveryInput = z.input<typeof KickDiscoveryInput>;
