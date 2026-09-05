import { z } from 'zod';

export const InstagramUsername = z.string().trim().min(1).max(30)
  .regex(/^[a-zA-Z0-9._]+$/).transform(value => value.toLowerCase());
export const InstagramDiscoveryConfig = z.object({
  loginMode: z.enum(['facebook', 'instagram']),
  apiVersion: z.string().regex(/^v\d+\.0$/),
  accessToken: z.string().min(1).optional(),
  ownInstagramUserId: z.string().regex(/^\d+$/).optional(),
  grantedPermissions: z.array(z.string()).readonly(),
  pageRoleViaBusinessManager: z.boolean(),
});
export type InstagramDiscoveryConfig = Readonly<z.infer<typeof InstagramDiscoveryConfig>>;
export const InstagramDiscoveryOptions = z.object({
  maxPages: z.number().int().min(1).max(10).default(3),
  pageSize: z.number().int().min(1).max(50).default(25),
  maxMedia: z.number().int().min(1).max(500).default(100),
});
export type InstagramDiscoveryOptions = z.input<typeof InstagramDiscoveryOptions>;
const metric = z.number().int().nonnegative().safe().nullish();
// Only the cursor is reused. No provider-supplied URL is ever followed.
const cursor = z.string().min(1).max(2000).regex(/^[a-zA-Z0-9_+/=-]+$/).nullish();
const publicUrl = z.string().url().refine(value => /^https?:\/\//.test(value));
export const InstagramDiscoveryMedia = z.object({
  id: z.string().regex(/^\d+$/), media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
  permalink: publicUrl.nullish(), timestamp: z.string().datetime({ offset: true }).nullish(),
  caption: z.string().nullish(), like_count: metric, comments_count: metric, view_count: metric,
});
export const InstagramBusinessDiscovery = z.object({
  business_discovery: z.object({
    id: z.string().regex(/^\d+$/), username: InstagramUsername,
    biography: z.string().nullish(), website: publicUrl.or(z.literal('')).nullish(),
    followers_count: metric, media_count: metric,
    media: z.object({
      data: z.array(InstagramDiscoveryMedia).max(50),
      paging: z.object({ cursors: z.object({ before: cursor, after: cursor }).optional() }).optional(),
    }).nullish(),
  }).nullish(),
});
