import { z } from 'zod';

export const creatorPlatformSchema = z.enum(['youtube', 'twitch', 'kick', 'instagram']);
export const creatorSearchProfileSchema = z.object({
  name: z.string().trim().min(3).max(100),
  keywords: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  platforms: z.array(creatorPlatformSchema).min(1).max(4),
  markets: z.array(z.string().trim().regex(/^(WORLDWIDE|[A-Z]{2})$/)).min(1).max(50),
  languages: z.array(z.string().trim().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/)).max(20),
  windowDays: z.number().int().min(7).max(120),
  minRecentVideos: z.number().int().min(1).max(30),
  targetMedianViews: z.number().int().min(0).max(1_000_000),
  minLiveViewers: z.number().int().min(1).max(1_000_000).default(20),
  maxCandidatesPerPlatform: z.number().int().min(1).max(100),
  searchPagesPerDay: z.number().int().min(1).max(20),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().max(80).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
    catch { return false; }
  }, 'Zona horaria no válida'),
  enabled: z.boolean(),
}).strict();

export type CreatorSearchConfig = z.infer<typeof creatorSearchProfileSchema>;
export type CreatorPlatform = z.infer<typeof creatorPlatformSchema>;
export const creatorSearchProfileIdSchema = z.number().int().positive();
export const creatorSearchProfileIdentitySchema = z.object({ id: creatorSearchProfileIdSchema, version: z.number().int().positive() }).strict();

export const DEFAULT_CREATOR_SEARCH_PROFILE: CreatorSearchConfig = {
  name: 'CS2 WORLDWIDE',
  keywords: ['CS2', 'Counter-Strike 2', 'Counter-Strike', 'CS2 skins', 'CS2 cases', 'CS2 gameplay', 'CS2 update', 'CS2 tournament'],
  platforms: ['youtube', 'twitch', 'kick', 'instagram'],
  markets: ['WORLDWIDE'], languages: [], windowDays: 90, minRecentVideos: 3,
  targetMedianViews: 1000, minLiveViewers: 20, maxCandidatesPerPlatform: 36, searchPagesPerDay: 8,
  scheduleTime: '08:30', timezone: 'Europe/Madrid', enabled: false,
};

export const creatorFeedbackReasonSchema = z.enum([
  'audience_low', 'wrong_content', 'language', 'country', 'inactive',
  'already_represented', 'no_contact', 'not_interesting', 'brand_incompatible',
  'contacted', 'agreement_completed', 'reopened', 'other',
]);

export const creatorFeedbackSchema = z.object({
  targetId: z.number().int().positive(),
  status: z.enum(['pendiente', 'contactado', 'finalizado', 'descartado']),
  reason: creatorFeedbackReasonSchema,
  note: z.string().trim().max(1000).optional(),
}).strict();

export const creatorObservationSchema = z.object({
  value: z.union([z.string(), z.number().finite(), z.boolean()]).nullable(),
  source: z.string().min(1).max(200),
  observed_at: z.iso.datetime().nullable(),
  synced_at: z.iso.datetime(),
  status: z.enum(['available', 'unavailable', 'stale', 'error']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
}).strict();
export type CreatorObservation = z.infer<typeof creatorObservationSchema>;
