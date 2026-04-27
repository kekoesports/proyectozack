'use server';
// Server actions para upload/delete de archivos de talentos
// Requiere autenticación admin|manager|staff
// Manager NO puede borrar archivos (assertCanDelete)

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { uploadFile, deleteFile } from '@/lib/storage';
import { createFile, deleteFileById } from '@/lib/queries/files';
import { db } from '@/lib/db';
import { talentMetricSnapshots, talentSocials } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

import type { FileType } from '@/lib/schemas/file';

type GeoEntry = { country: string; pct: number };

// Upload: recibe FormData con 'file' (File), 'talentId' (number), 'platform' (string), 'type' (FileType), 'notes' (string)
export async function uploadTalentFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const file = formData.get('file') as File | null;
    const talentId = Number(formData.get('talentId'));
    const platform = formData.get('platform') as string | null;
    const type = (formData.get('type') as FileType | null) ?? 'geo_stats';
    const notes = formData.get('notes') as string | null;

    if (!file || !talentId) return { success: false, error: 'Archivo y talentId requeridos' };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile({
      name: `talents/${talentId}/${Date.now()}-${file.name}`,
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
      relatedType: 'talent',
      relatedId: talentId,
      ...(platform ? { platform } : {}),
      ...(notes ? { notes } : {}),
      uploadedByUserId: session.user.id,
    });

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    console.error('[uploadTalentFileAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir archivo' };
  }
}

// GEO upload: sube archivo + opcionalmente crea snapshot + actualiza talentSocials.topGeos
// FormData: 'file', 'talentId', 'platform', 'notes', 'topGeos' (JSON string opcional)
export async function uploadGeoStatsAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const file = formData.get('file') as File | null;
    const talentId = Number(formData.get('talentId'));
    const platform = formData.get('platform') as string | null;
    const notes = formData.get('notes') as string | null;
    const topGeosRaw = formData.get('topGeos') as string | null;

    if (!file || !talentId) return { success: false, error: 'Archivo y talentId requeridos' };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile({
      name: `talents/${talentId}/geo/${Date.now()}-${file.name}`,
      data: buffer,
      contentType: file.type || 'application/octet-stream',
    });

    await createFile({
      name: file.name,
      type: 'geo_stats',
      ...(file.type ? { mime: file.type } : {}),
      sizeBytes: file.size,
      url: result.url,
      path: result.pathname,
      relatedType: 'talent',
      relatedId: talentId,
      ...(platform ? { platform } : {}),
      ...(notes ? { notes } : {}),
      uploadedByUserId: session.user.id,
    });

    // Doble actualización GEO: si se pasan topGeos + platform
    if (topGeosRaw && platform) {
      let topGeos: GeoEntry[];
      try {
        topGeos = JSON.parse(topGeosRaw) as GeoEntry[];
      } catch {
        return { success: false, error: 'topGeos JSON inválido' };
      }

      const today = new Date().toISOString().split('T')[0]!;

      await db.transaction(async (tx) => {
        // a) Insertar snapshot histórico
        await tx
          .insert(talentMetricSnapshots)
          .values({
            talentId,
            platform,
            metricType: 'geo_distribution',
            value: 0,
            snapshotDate: today,
            topGeos,
            notes: notes ?? undefined,
            updatedByUserId: session.user.id,
          })
          .onConflictDoNothing({
            target: [
              talentMetricSnapshots.talentId,
              talentMetricSnapshots.platform,
              talentMetricSnapshots.metricType,
              talentMetricSnapshots.snapshotDate,
            ],
          });

        // b) Actualizar talentSocials.topGeos para la plataforma
        await tx
          .update(talentSocials)
          .set({ topGeos })
          .where(
            and(
              eq(talentSocials.talentId, talentId),
              eq(talentSocials.platform, platform),
            ),
          );
      });
    }

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    console.error('[uploadGeoStatsAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir GEO stats' };
  }
}

// Delete: recibe FormData con 'fileId' (number), 'fileUrl' (string), 'talentId' (number)
export async function deleteTalentFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
    assertCanDelete(session.user.role as 'admin' | 'manager' | 'staff');

    const fileId = Number(formData.get('fileId'));
    const fileUrl = formData.get('fileUrl') as string;
    const talentId = Number(formData.get('talentId'));

    if (!fileId || !fileUrl) return { success: false, error: 'fileId y fileUrl requeridos' };

    // Borrar de Vercel Blob
    await deleteFile(fileUrl);
    // Borrar de DB
    await deleteFileById(fileId);

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    console.error('[deleteTalentFileAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar archivo' };
  }
}
