import { z } from 'zod';

export const StudioId = z.uuid();
export const StudioTalentId = z.union([z.number(), z.string().regex(/^[1-9]\d*$/)])
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
export const StudioRangeHeader = z
  .string()
  .max(128)
  .regex(/^bytes=(\d*)-(\d*)$/);
export const StudioDownloadQuery = z.object({
  download: z.literal('1').optional(),
});
export const StudioProjectInput = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Escribe un título de al menos 3 caracteres.')
    .max(160),
  template: z.enum(['presentation', 'educational', 'campaign']),
  platform: z.enum(['tiktok', 'instagram', 'youtube']),
  brief: z.string().trim().min(10, 'Explica qué quieres contar.').max(4000),
  script: z.string().trim().max(8000),
  cta: z.string().trim().max(200),
});
export type StudioProjectInput = z.infer<typeof StudioProjectInput>;
export const StudioUpdate = StudioProjectInput.extend({
  id: StudioId,
  revision: z.number().int().nonnegative(),
});
export const StudioTransition = z.object({
  id: StudioId,
  revision: z.number().int().nonnegative(),
});
export const StudioReview = StudioTransition.extend({
  decision: z.enum(['approved', 'changes_requested']),
  comment: z.string().trim().min(3).max(2000),
});
export const StudioInvitation = z.object({
  talentId: z.coerce.number().int().positive(),
  email: z.email().trim().toLowerCase(),
});
export const StudioToken = z.string().regex(/^[a-f0-9]{64}$/);
export const StudioLogin = z.object({
  email: z.email(),
  // Signing in must accept valid older SocialPro credentials; enforce the new
  // minimum only when creating a password, as Better Auth does server-side.
  password: z.string().min(1, 'Introduce tu contraseña.').max(128),
  name: z.string().trim().max(100),
});
export type StudioLogin = z.infer<typeof StudioLogin>;
export const StudioSignup = StudioLogin.extend({
  password: z.string().min(12, 'Usa al menos 12 caracteres.').max(128),
  name: z.string().trim().min(1, 'Indica tu nombre.').max(100),
});
export const StudioAuthResponse = z.object({
  twoFactorRedirect: z.boolean().optional(),
});
export const StudioOrigin = z.string().url();
export const StudioAssetInput = z.object({
  projectId: StudioId.nullable(),
  name: z.string().trim().min(1).max(160),
  rightsConfirmed: z.literal(true),
});
