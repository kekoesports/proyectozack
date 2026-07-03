'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { playerProfiles } from '@/db/schema';

/**
 * Ajustes de perfil que el propio usuario puede modificar. Todos los campos
 * son opcionales — mandamos solo lo que cambia. Steam trade URL se sanea
 * a `https://steamcommunity.com/tradeoffer/new/?partner=...&token=...`.
 */
const UpdateProfileSchema = z.object({
  isPrivate: z
    .union([z.enum(['true', 'false']), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  steamTradeUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === '' || /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[A-Za-z0-9_-]+$/.test(v),
      { message: 'URL de intercambio Steam inválida' },
    )
    .optional(),
  kickUsername: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]*$/, { message: 'Solo letras, números, "_", "." o "-"' })
    .optional(),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: 'unauthenticated' }
  | { ok: false; error: 'no_profile' };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'unauthenticated' };

  const parsed = UpdateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const patch: Partial<{
    isPrivate: boolean;
    steamTradeUrl: string | null;
    kickUsername: string | null;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (parsed.data.isPrivate !== undefined) patch.isPrivate = parsed.data.isPrivate;
  if (parsed.data.steamTradeUrl !== undefined) {
    patch.steamTradeUrl = parsed.data.steamTradeUrl === '' ? null : parsed.data.steamTradeUrl;
  }
  if (parsed.data.kickUsername !== undefined) {
    patch.kickUsername = parsed.data.kickUsername === '' ? null : parsed.data.kickUsername;
  }

  const existing = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, userId),
  });
  if (!existing) return { ok: false, error: 'no_profile' };

  await db.update(playerProfiles).set(patch).where(eq(playerProfiles.userId, userId));

  revalidatePath('/sorteos/plataforma/perfil');
  return { ok: true };
}
