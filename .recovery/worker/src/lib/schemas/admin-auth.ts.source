import { z } from 'zod';

export const AuthActionResponse = z.object({
  twoFactorRedirect: z.boolean().optional(),
  message: z.string().optional(), error: z.string().optional(), code: z.string().optional(),
});
export const AuthSessionResponse = z.object({ user: z.object({ role: z.string().nullable().optional() }).optional() });
export const TwoFactorSetupResponse = z.object({
  totpURI: z.string().startsWith('otpauth://totp/'),
  backupCodes: z.array(z.string().min(1)).min(1),
});
export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponse>;
