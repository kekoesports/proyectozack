'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { createGiveaway, updateGiveaway, deleteGiveaway } from '@/lib/queries/giveaways';
import { createGiveawaySchema, updateGiveawaySchema } from '@/lib/schemas/giveaway';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function createGiveawayAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

  const raw = {
    talentId: Number(formData.get('talentId')),
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || undefined,
    imageUrl: (formData.get('imageUrl') as string) || undefined,
    brandName: formData.get('brandName') as string,
    brandLogo: (formData.get('brandLogo') as string) || undefined,
    value: (formData.get('value') as string) || undefined,
    redirectUrl: formData.get('redirectUrl') as string,
    startsAt: formData.get('startsAt') as string,
    endsAt: formData.get('endsAt') as string,
    sortOrder: Number(formData.get('sortOrder') || 0),
  };

  const parsed = createGiveawaySchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[createGiveawayAction] validation failed:', parsed.error.issues[0]?.message ?? 'Datos inválidos');
    return;
  }

  await createGiveaway({
    ...parsed.data,
    description: parsed.data.description ?? null,
    imageUrl: parsed.data.imageUrl ?? null,
    brandLogo: parsed.data.brandLogo ?? null,
    value: parsed.data.value ?? null,
  });

  const talent = await db.select({ slug: talents.slug }).from(talents).where(eq(talents.id, parsed.data.talentId)).then((r) => r[0]);
  if (talent) revalidatePath(`/creadores/${talent.slug}`);
  revalidatePath('/admin/giveaways');
}

export async function updateGiveawayAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const id = Number(formData.get('id'));
  if (!id) return;

  const raw: Record<string, unknown> = {};
  for (const [key, val] of formData.entries()) {
    if (key === 'id' || key === 'talentSlug' || !val) continue;
    raw[key] = key === 'talentId' || key === 'sortOrder' ? Number(val) : val;
  }

  const parsed = updateGiveawaySchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[updateGiveawayAction] validation failed:', parsed.error.issues[0]?.message ?? 'Datos inválidos');
    return;
  }

  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Parameters<typeof updateGiveaway>[1];
  await updateGiveaway(id, updateData);

  const talentSlug = formData.get('talentSlug') as string;
  if (talentSlug) revalidatePath(`/creadores/${talentSlug}`);
  revalidatePath('/admin/giveaways');
}

export async function deleteGiveawayAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const id = Number(formData.get('id'));
  const talentSlug = formData.get('talentSlug') as string;
  if (!id) return;
  await deleteGiveaway(id);
  if (talentSlug) revalidatePath(`/creadores/${talentSlug}`);
  revalidatePath('/admin/giveaways');
}
