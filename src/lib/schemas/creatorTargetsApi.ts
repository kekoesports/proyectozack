import { z } from 'zod';

// ─── Shared ──────────────────────────────────────────────────────────────────

const platformEnum = z.enum(['twitch', 'youtube', 'kick']);

export const importBatchIdSchema = z
  .string()
  .regex(
    /^creator-\d{4}-\d{2}-\d{2}-(cs2|igaming|esports|gaming)-(twitch|youtube|kick)$/,
    'batchId must match `creator-YYYY-MM-DD-<vertical>-<platform>`',
  )
  .max(50);

// ─── POST /api/admin/targets/import ──────────────────────────────────────────

export const importItemSchema = z.object({
  platform: platformEnum,
  username: z.string().min(1).max(200),
  fullName: z.string().max(300).nullable(),
  profileUrl: z.url(),
  profilePicUrl: z.url().nullable(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative().nullable(),
  bio: z.string().max(5000).nullable(),
  externalUrl: z.url().nullable(),
  discoveredVia: z.string().max(200),
});

export const creatorTargetsImportBody = z.object({
  batchId: importBatchIdSchema,
  items: z.array(importItemSchema).min(1).max(100),
});

export type CreatorTargetsImportBody = z.infer<typeof creatorTargetsImportBody>;
export type ImportItem = z.infer<typeof importItemSchema>;

// ─── GET /api/admin/targets/active ───────────────────────────────────────────

export const creatorTargetsActiveQuery = z.object({
  platform: platformEnum.optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export type CreatorTargetsActiveQuery = z.infer<typeof creatorTargetsActiveQuery>;

// ─── POST /api/admin/discover/twitch/search ──────────────────────────────────

export const discoverTwitchSearchBody = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().positive().max(50).default(20),
  liveOnly: z.boolean().default(false),
});

export type DiscoverTwitchSearchBody = z.infer<typeof discoverTwitchSearchBody>;

// ─── POST /api/admin/discover/twitch/enrich ──────────────────────────────────

export const discoverTwitchEnrichBody = z.object({
  logins: z.array(z.string().min(1).max(50)).min(1).max(100),
});

export type DiscoverTwitchEnrichBody = z.infer<typeof discoverTwitchEnrichBody>;

// ─── POST /api/admin/discover/youtube/search ─────────────────────────────────

export const discoverYoutubeSearchBody = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().positive().max(50).default(20),
  regionCode: z.string().length(2).optional(),
});

export type DiscoverYoutubeSearchBody = z.infer<typeof discoverYoutubeSearchBody>;

// ─── POST /api/admin/discover/youtube/enrich ─────────────────────────────────

export const discoverYoutubeEnrichBody = z.object({
  channelIds: z.array(z.string().min(1).max(50)).min(1).max(100),
});

export type DiscoverYoutubeEnrichBody = z.infer<typeof discoverYoutubeEnrichBody>;

// ─── POST /api/admin/discover/kick/channel ───────────────────────────────────

export const discoverKickChannelBody = z.object({
  slug: z.string().min(1).max(100),
});

export type DiscoverKickChannelBody = z.infer<typeof discoverKickChannelBody>;
