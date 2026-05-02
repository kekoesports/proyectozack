'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { db } from '@/lib/db';
import { teamMembers } from '@/db/schema';
import { requireRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { logRedacted } from '@/lib/log';

const PhotoMeta = z.object({
  id: z.coerce.number().int().positive(),
});

const PHOTO_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const PHOTO_EXTS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadTeamPhotoAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole('admin', '/admin/login');

  const meta = parseFormData(formData, PhotoMeta);
  if (!meta.ok) return { error: 'Datos incompletos' };
  const { id } = meta.data;

  const fileEntry = formData.get('photo');
  if (!(fileEntry instanceof File)) return { error: 'Datos incompletos' };

  const validation = await validateUploadedFile(fileEntry, {
    maxBytes: PHOTO_MAX_BYTES,
    allowedMimes: PHOTO_MIMES,
    allowedExts: PHOTO_EXTS,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') return { error: 'La imagen no puede superar 5 MB' };
    if (validation.reason === 'empty_file') return { error: 'Datos incompletos' };
    return { error: 'Solo se permiten imágenes válidas (PNG, JPEG, WebP)' };
  }

  const lastDot = fileEntry.name.lastIndexOf('.');
  const ext = lastDot >= 0 ? fileEntry.name.slice(lastDot + 1).toLowerCase() : 'jpg';

  try {
    const blob = await put(`team/${id}-${Date.now()}.${ext}`, fileEntry, { access: 'public' });
    await db.update(teamMembers).set({ photoUrl: blob.url }).where(eq(teamMembers.id, id));
  } catch (err) {
    logRedacted('error', '[admin] Team photo upload error:', err);
    return { error: 'No se pudo subir la imagen' };
  }

  revalidatePath('/admin/equipo/fotos');
  revalidatePath('/nosotros');
  revalidatePath('/');
  return {};
}
