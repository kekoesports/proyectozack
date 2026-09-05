import { z } from 'zod';

const YouTubeCount = z.string().regex(/^\d+$/).transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));

export const CompleteYouTubeChannelStatistics = z.object({
  subscriberCount: YouTubeCount, videoCount: YouTubeCount, viewCount: YouTubeCount,
  hiddenSubscriberCount: z.literal(false).optional(),
});

export const AvailableYouTubeChannelStatistics = z.object({
  subscriberCount: z.unknown().optional(), videoCount: z.unknown().optional(),
  viewCount: z.unknown().optional(), hiddenSubscriberCount: z.boolean().optional(),
});

export function readYouTubeCount(value: unknown): number | null {
  const parsed = YouTubeCount.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const YouTubeContentDetailsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        contentDetails: z.object({
          relatedPlaylists: z.object({ uploads: z.string() }),
        }),
      }),
    ),
});

export const YouTubePlaylistItemsSchema = z.object({
  items: z
    .array(z.object({ contentDetails: z.object({
      videoId: z.string().min(1), videoPublishedAt: z.iso.datetime({ offset: true }),
    }), snippet: z.object({
      publishedAt: z.string(),
      title: z.string().optional(),
      thumbnails: z.object({
        medium: z.object({ url: z.string() }).optional(),
        high: z.object({ url: z.string() }).optional(),
        default: z.object({ url: z.string() }).optional(),
      }).optional(),
      resourceId: z.object({ videoId: z.string() }),
    }) })),
  nextPageToken: z.string().optional(),
});

export const YouTubeVideosStatsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        statistics: z.object({
          viewCount: z.string().optional(),
          likeCount: z.string().optional(),
          commentCount: z.string().optional(),
        }),
      }),
    ),
});

export const YouTubeDiscoveryOptions = z.object({
  query: z.string().trim().min(1).max(300),
  maxResults: z.number().int().min(1).max(50),
  maxPages: z.number().int().min(1).max(3),
  publishedAfter: z.date(),
  language: z.string().min(2).max(10).optional(),
});
export const YouTubeDiscoveryPage = z.object({
  items: z.array(z.object({ snippet: z.object({ channelId: z.string().min(1) }) })),
  nextPageToken: z.string().min(1).optional(),
});
