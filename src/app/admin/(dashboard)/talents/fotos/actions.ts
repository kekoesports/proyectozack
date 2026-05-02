'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { requireRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { PHOTO_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';

const PhotoMeta = z.object({
  id: z.coerce.number().int().positive(),
});

export async function uploadTalentPhotoAction(
  formData: FormData,
): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  await requireRole('admin', '/admin/login');

  const meta = parseFormData(formData, PhotoMeta);
  if (!meta.ok) return { success: false, error: 'ID inválido' };
  const { id } = meta.data;

  const fileEntry = formData.get('photo');
  if (!(fileEntry instanceof File)) return { success: false, error: 'Archivo requerido' };

  const validation = await validateUploadedFile(fileEntry, {
    maxBytes: PHOTO_TYPES.maxBytes,
    allowedMimes: PHOTO_TYPES.mimes,
    allowedExts: PHOTO_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') {
      return { success: false, error: 'La imagen no puede superar 5 MB' };
    }
    if (validation.reason === 'empty_file') return { success: false, error: 'Archivo vacío' };
    return { success: false, error: 'Formato no permitido (jpg/png/webp/gif)' };
  }

  try {
    const lastDot = fileEntry.name.lastIndexOf('.');
    const ext = lastDot >= 0 ? fileEntry.name.slice(lastDot + 1).toLowerCase() : 'jpg';
    const blob = await put(`talents/${id}-${Date.now()}.${ext}`, fileEntry, {
      access: 'public',
      contentType: fileEntry.type,
    });

    await db.update(talents).set({ photoUrl: blob.url }).where(eq(talents.id, id));

    revalidatePath('/admin/talents');
    revalidatePath('/admin/talents/fotos');
    revalidatePath('/giveaways');
    revalidatePath('/talentos');
    revalidatePath('/');

    return { success: true, photoUrl: blob.url };
  } catch (err) {
    logRedacted('error', '[admin] uploadTalentPhoto error:', err);
    return { success: false, error: 'Error al subir la foto' };
  }
}

export async function clearTalentPhotoAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin', '/admin/login');

  const meta = parseFormData(formData, PhotoMeta);
  if (!meta.ok) return { success: false, error: 'ID inválido' };
  const { id } = meta.data;

  try {
    await db.update(talents).set({ photoUrl: null }).where(eq(talents.id, id));
    revalidatePath('/admin/talents');
    revalidatePath('/admin/talents/fotos');
    revalidatePath('/giveaways');
    revalidatePath('/talentos');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] clearTalentPhoto error:', err);
    return { success: false, error: 'Error al borrar la foto' };
  }
}
