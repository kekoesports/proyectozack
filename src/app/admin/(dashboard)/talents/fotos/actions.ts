'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { requireRole } from '@/lib/auth-guard';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadTalentPhotoAction(
  formData: FormData,
): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  await requireRole('admin', '/admin/login');

  const id = Number(formData.get('id'));
  const file = formData.get('photo') as File | null;

  if (!id) return { success: false, error: 'ID inválido' };
  if (!file || file.size === 0) return { success: false, error: 'Archivo vacío' };
  if (!ACCEPTED_TYPES.has(file.type)) return { success: false, error: 'Formato no permitido (jpg/png/webp/gif)' };
  if (file.size > MAX_BYTES) return { success: false, error: 'La imagen no puede superar 5 MB' };

  try {
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const blob = await put(`talents/${id}-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    });

    await db.update(talents).set({ photoUrl: blob.url }).where(eq(talents.id, id));

    revalidatePath('/admin/talents');
    revalidatePath('/admin/talents/fotos');
    revalidatePath('/giveaways');
    revalidatePath('/talentos');
    revalidatePath('/');

    return { success: true, photoUrl: blob.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] uploadTalentPhoto error:', msg);
    return { success: false, error: 'Error al subir la foto' };
  }
}

export async function clearTalentPhotoAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin', '/admin/login');

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID inválido' };

  try {
    await db.update(talents).set({ photoUrl: null }).where(eq(talents.id, id));
    revalidatePath('/admin/talents');
    revalidatePath('/admin/talents/fotos');
    revalidatePath('/giveaways');
    revalidatePath('/talentos');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] clearTalentPhoto error:', msg);
    return { success: false, error: 'Error al borrar la foto' };
  }
}
