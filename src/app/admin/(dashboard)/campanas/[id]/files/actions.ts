'use server';
// Manager NO puede borrar archivos (assertCanDelete).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { uploadFile, deleteFile } from '@/lib/storage';
import { createFile, deleteFileById } from '@/lib/queries/files';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { POLY_FILE_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

import { FILE_TYPES } from '@/lib/schemas/file';

const FileTypeEnum = z.enum(FILE_TYPES);

const UploadCampaignFileMeta = z.object({
  campaignId: IdSchema,
  type: FileTypeEnum.default('contract'),
  notes: z.string().max(2000).optional(),
});

const DeleteCampaignFileMeta = z.object({
  fileId: IdSchema,
  fileUrl: z.string().min(1).max(2048),
  campaignId: IdSchema,
});

export async function uploadCampaignFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const meta = parseFormData(formData, UploadCampaignFileMeta);
    if (!meta.ok) return { success: false, error: 'campaignId requerido' };
    const { campaignId, type, notes } = meta.data;

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) return { success: false, error: 'Archivo requerido' };

    const validation = await validateUploadedFile(fileEntry, {
      maxBytes: POLY_FILE_TYPES.maxBytes,
      allowedMimes: POLY_FILE_TYPES.mimes,
      allowedExts: POLY_FILE_TYPES.exts,
    });
    if (!validation.ok) {
      const reason = validation.reason;
      if (reason === 'too_large') return { success: false, error: 'Archivo demasiado grande (máx 25 MB)' };
      if (reason === 'empty_file') return { success: false, error: 'Archivo vacío' };
      return { success: false, error: 'Formato de archivo no permitido' };
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const result = await uploadFile({
      name: `campaigns/${campaignId}/${Date.now()}-${fileEntry.name}`,
      data: buffer,
      contentType: fileEntry.type || 'application/octet-stream',
    });

    await createFile({
      name: fileEntry.name,
      type,
      ...(fileEntry.type ? { mime: fileEntry.type } : {}),
      sizeBytes: fileEntry.size,
      url: result.url,
      path: result.pathname,
      relatedType: 'campaign',
      relatedId: campaignId,
      ...(notes ? { notes } : {}),
      uploadedByUserId: session.user.id,
    });

    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[uploadCampaignFileAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir archivo' };
  }
}

export async function deleteCampaignFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
    assertCanDelete(session.user.role);

    const meta = parseFormData(formData, DeleteCampaignFileMeta);
    if (!meta.ok) return { success: false, error: 'fileId y fileUrl requeridos' };
    const { fileId, fileUrl, campaignId } = meta.data;

    await deleteFile(fileUrl);
    await deleteFileById(fileId);

    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[deleteCampaignFileAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar archivo' };
  }
}
