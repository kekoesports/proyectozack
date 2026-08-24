'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { teamMembers } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { PHOTO_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';
import { uploadFile } from '@/lib/storage';
import { registerEntityAsset } from '@/lib/queries/entityAssets';

const PhotoMeta = z.object({ id: IdSchema });

export async function uploadTeamPhotoAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requirePermission('equipo', 'delete');

  const meta = parseFormData(formData, PhotoMeta);
  if (!meta.ok) return { error: 'Datos incompletos' };
  const { id } = meta.data;

  const fileEntry = formData.get('photo');
  if (!(fileEntry instanceof File)) return { error: 'Datos incompletos' };

  const validation = await validateUploadedFile(fileEntry, {
    maxBytes: PHOTO_TYPES.maxBytes,
    allowedMimes: PHOTO_TYPES.mimes,
    allowedExts: PHOTO_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') return { error: 'La imagen no puede superar 5 MB' };
    if (validation.reason === 'empty_file') return { error: 'Datos incompletos' };
    return { error: 'Solo se permiten imágenes válidas (PNG, JPEG, WebP, GIF)' };
  }

  try {
    const uploaded = await uploadFile({
      filename: fileEntry.name,
      data: Buffer.from(await fileEntry.arrayBuffer()),
      contentType: fileEntry.type,
      visibility: 'private',
      prefix: 'team',
    });
    await registerEntityAsset({
      kind: 'team_photo',
      entityId: id,
      storageKey: uploaded.storageKey,
      contentType: uploaded.contentType,
    });
    const proxyPhotoUrl = `/api/team-photo/${id}`;
    await db.update(teamMembers).set({ photoUrl: proxyPhotoUrl }).where(eq(teamMembers.id, id));
  } catch (err) {
    logRedacted('error', '[admin] Team photo upload error:', err);
    return { error: 'No se pudo subir la imagen' };
  }

  revalidatePath('/admin/equipo/fotos');
  revalidatePath('/nosotros');
  revalidatePath('/');
  return {};
}
