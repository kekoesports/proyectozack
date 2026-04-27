'use server';
// Server actions para upload/delete de archivos de campañas
// Requiere autenticación admin|manager|staff
// Manager NO puede borrar archivos (assertCanDelete)

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { uploadFile, deleteFile } from '@/lib/storage';
import { createFile, deleteFileById } from '@/lib/queries/files';

import type { FileType } from '@/lib/schemas/file';
import type { Role } from '@/lib/auth-guard';

// Upload: recibe FormData con 'file' (File), 'campaignId' (number), 'type' (FileType), 'notes' (string)
export async function uploadCampaignFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const file = formData.get('file') as File | null;
    const campaignId = Number(formData.get('campaignId'));
    const type = (formData.get('type') as FileType | null) ?? 'contract';
    const notes = formData.get('notes') as string | null;

    if (!file || !campaignId) return { success: false, error: 'Archivo y campaignId requeridos' };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile({
      name: `campaigns/${campaignId}/${Date.now()}-${file.name}`,
      data: buffer,
      contentType: file.type || 'application/octet-stream',
    });

    await createFile({
      name: file.name,
      type,
      ...(file.type ? { mime: file.type } : {}),
      sizeBytes: file.size,
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
    console.error('[uploadCampaignFileAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir archivo' };
  }
}

// Delete: recibe FormData con 'fileId' (number), 'fileUrl' (string), 'campaignId' (number)
export async function deleteCampaignFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
    assertCanDelete(session.user.role as Role);

    const fileId = Number(formData.get('fileId'));
    const fileUrl = formData.get('fileUrl') as string;
    const campaignId = Number(formData.get('campaignId'));

    if (!fileId || !fileUrl) return { success: false, error: 'fileId y fileUrl requeridos' };

    // Borrar de Vercel Blob
    await deleteFile(fileUrl);
    // Borrar de DB
    await deleteFileById(fileId);

    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error('[deleteCampaignFileAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar archivo' };
  }
}
