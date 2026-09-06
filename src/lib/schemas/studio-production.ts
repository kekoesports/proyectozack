import { z } from 'zod';
import { StudioId } from './studio';

const safeText = (max: number) => z.string().trim().max(max).refine((s) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s));
export const StudioScene = z.object({
  id: StudioId,
  kind: z.enum(['video', 'image', 'title']),
  assetId: StudioId.nullable(),
  title: safeText(90),
  body: safeText(240),
  duration: z.number().min(1).max(60),
  start: z.number().min(0).max(600),
  // Versioned designs; omission preserves legacy cards.
  motion: z.enum(['statement-v1', 'steps-v1', 'contact-v1']).optional(),
}).refine((s) => s.kind === 'title' || s.assetId !== null, { message: 'Selecciona el material de cada escena.' })
  .refine((s) => !s.motion || s.kind === 'title', { message: 'Los diseños animados son solo para cartelas.' })
  .refine((s) => !s.motion || s.duration >= 2, { message: 'Deja al menos 2 segundos para la animación.' })
  .refine((s) => !s.motion || (s.title.length <= 60 && s.body.length <= 150),
    { message: 'Para mantener la lectura: máximo 60 caracteres de titular y 150 de apoyo en diseños HyperFrames.' })
  .refine((s) => s.motion !== 'steps-v1' || s.body.split('\n').filter((line) => line.trim()).length <= 3,
    { message: 'Un proceso admite hasta 3 pasos, uno por línea.' })
  .refine((s) => s.motion !== 'steps-v1' || s.body.split('\n').every((line) => line.trim().length <= 48),
    { message: 'Cada paso admite hasta 48 caracteres para que se lea bien.' });
export const StudioBoard = z.object({
  version: z.literal(1),
  format: z.enum(['9:16', '1:1', '16:9']),
  palette: z.enum(['light', 'dark']),
  audioAssetId: StudioId.nullable(),
  scenes: z.array(StudioScene).min(1).max(8),
}).refine((b) => b.scenes.reduce((n, s) => n + s.duration, 0) <= 120, { message: 'Máximo 120 segundos por montaje.' })
  .refine((b) => new Set(b.scenes.map((s) => s.id)).size === b.scenes.length, { message: 'Hay escenas duplicadas.' });
export type StudioBoard = z.infer<typeof StudioBoard>;
export type StudioScene = z.infer<typeof StudioScene>;
export const StudioMotionPreviewInput = z.object({ projectId: StudioId, scene: StudioScene,
  format: z.enum(['9:16', '1:1', '16:9']), palette: z.enum(['light', 'dark']) });
export const StudioBoardSave = z.object({ projectId: StudioId, revision: z.number().int().min(-1), document: StudioBoard });
export const StudioRenderRequest = z.object({ projectId: StudioId, projectRevision: z.number().int().nonnegative(), boardRevision: z.number().int().nonnegative() });
export const StudioRenderReview = z.object({ id: StudioId, decision: z.enum(['approved', 'changes_requested']), comment: safeText(2000).min(3) });
export const StudioChatRequest = z.object({ id: StudioId, projectId: StudioId, revision: z.number().int().nonnegative(), prompt: safeText(2000).min(3), mode: z.enum(['editorial', 'ai']).default('editorial') });
export const StudioAssistantProposal = z.object({
  message: safeText(4000),
  script: safeText(8000).nullable(),
  cta: safeText(200).nullable(),
  checks: z.array(safeText(300)).max(8),
});
export type StudioAssistantProposal = z.infer<typeof StudioAssistantProposal>;
export const StudioChannelInput = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitch', 'x']),
  handle: z.string().trim().transform((v) => v.replace(/^@/, '').toLowerCase()).pipe(z.string().regex(/^[a-z0-9._-]{2,50}$/)),
});
export type StudioChannelInput = z.infer<typeof StudioChannelInput>;
export const StudioObservation = z.object({
  source: z.literal('youtube_data_api'),
  sourceUrl: z.url().refine((v) => new URL(v).hostname === 'www.youtube.com'),
  providerId: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/),
  title: safeText(160),
  followers: z.number().int().nonnegative().nullable(),
  lifetimeViews: z.number().int().nonnegative().nullable(),
  videos: z.number().int().nonnegative().nullable(),
  collectedAt: z.iso.datetime(),
});
export const StudioScheduleInput = z.object({
  projectId: StudioId,
  scheduledAt: z.iso.datetime(),
});
