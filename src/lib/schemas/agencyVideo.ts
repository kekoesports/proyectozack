import { z } from 'zod';

export const TikTokMetadata = z.object({
  thumbnail_url: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['tiktokcdn-eu.com', 'tiktokcdn.com', 'tiktokcdn-us.com'].some(domain =>
        url.hostname.endsWith(`.${domain}`));
  }),
});

export const AgencyVideo = z.object({
  id: z.string().regex(/^\d{19}$/),
  title: z.string(),
  subtitle: z.string(),
  url: z.url(),
  thumbnail: z.url().nullable(),
});
export type AgencyVideo = z.infer<typeof AgencyVideo>;

export const TikTokPlayerMessage = z.object({
  'x-tiktok-player': z.literal(true),
  type: z.enum(['onPlayerReady', 'onStateChange', 'onPlayerError']),
  value: z.union([
    z.number(),
    z.object({ errorCode: z.number(), errorType: z.string() }),
  ]).nullish(),
});
