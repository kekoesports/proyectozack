'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole, IS_DEV } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { talents, statsShares, user } from '@/db/schema';

const geoEntrySchema = z.object({
  country: z.string().min(1).max(60),
  pct: z.number().min(0).max(100),
});

const updateGeoSchema = z.object({
  talentId: z.number().int().positive(),
  topGeos: z.array(geoEntrySchema).max(3).nullable(),
  audienceLanguage: z.string().max(20).nullable(),
});

export async function updateTalentGeoData(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

  let topGeosParsed: unknown = null;
  try {
    topGeosParsed = JSON.parse((formData.get('topGeos') as string) || 'null');
  } catch {
    console.error('updateTalentGeoData: invalid topGeos JSON');
    return;
  }

  const raw = {
    talentId: Number(formData.get('talentId')),
    topGeos: topGeosParsed,
    audienceLanguage: (formData.get('audienceLanguage') as string) || null,
  };

  const parsed = updateGeoSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('updateTalentGeoData validation failed:', parsed.error.issues);
    return;
  }

  await db
    .update(talents)
    .set({
      topGeos: parsed.data.topGeos,
      audienceLanguage: parsed.data.audienceLanguage || null,
    })
    .where(eq(talents.id, parsed.data.talentId));

  revalidatePath('/admin/stats');
}

export async function createStatsShareLink(): Promise<{ id: number; token: string } | null> {
  const session = await requireRole('admin', '/admin/login');

  const token = randomBytes(16).toString('base64url');

  if (IS_DEV && session.user.id === 'dev') {
    const now = new Date();
    await db
      .insert(user)
      .values({
        id: 'dev',
        name: session.user.name,
        email: session.user.email,
        emailVerified: true,
        role: session.user.role,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: user.id });
  }

  const [row] = await db
    .insert(statsShares)
    .values({ token, createdBy: session.user.id })
    .returning({ id: statsShares.id });

  revalidatePath('/admin/stats');
  return row ? { id: row.id, token } : null;
}

export async function revokeStatsShareLink(id: number): Promise<void> {
  await requireRole('admin', '/admin/login');

  await db
    .update(statsShares)
    .set({ revokedAt: new Date() })
    .where(eq(statsShares.id, id));

  revalidatePath('/admin/stats');
}
