'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { createCode, deleteCode } from '@/lib/queries/creatorCodes';

export async function createCodeAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

  const talentId = Number(formData.get('talentId'));
  const code = formData.get('code') as string;
  const brandName = formData.get('brandName') as string;
  const brandLogo = (formData.get('brandLogo') as string) || null;
  const redirectUrl = formData.get('redirectUrl') as string;
  const description = (formData.get('description') as string) || null;
  const badge = (formData.get('badge') as string) || null;
  const isFeatured = formData.get('isFeatured') === 'on';
  const category = (formData.get('category') as string) || null;
  const ctaText = (formData.get('ctaText') as string) || null;

  if (!talentId || !code || !brandName || !redirectUrl) return;

  await createCode({ talentId, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText });
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
}

export async function deleteCodeAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const id = Number(formData.get('id'));
  if (!id) return;
  await deleteCode(id);
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
}
