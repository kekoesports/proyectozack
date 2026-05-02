'use server';
// Manager NO puede borrar archivos (assertCanDelete).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { uploadFile, deleteFile } from '@/lib/storage';
import { createFile, deleteFileById } from '@/lib/queries/files';
import { db } from '@/lib/db';
import { talentMetricSnapshots, talentSocials } from '@/db/schema';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { POLY_FILE_TYPES, GEO_STATS_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

import { FILE_TYPES } from '@/lib/schemas/file';

type GeoEntry = { country: string; pct: number };

const FileTypeEnum = z.enum(FILE_TYPES);

const UploadFileMeta = z.object({
  talentId: IdSchema,
  platform: z.string().min(1).max(40).optional(),
  type: FileTypeEnum.default('geo_stats'),
  notes: z.string().max(2000).optional(),
});

const UploadGeoMeta = z.object({
  talentId: IdSchema,
  platform: z.string().min(1).max(40).optional(),
  notes: z.string().max(2000).optional(),
  topGeos: z.string().optional(),
});

const DeleteFileMeta = z.object({
  fileId: IdSchema,
  fileUrl: z.string().min(1).max(2048),
  talentId: IdSchema,
});

export async function uploadTalentFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const meta = parseFormData(formData, UploadFileMeta);
    if (!meta.ok) return { success: false, error: 'talentId requerido' };
    const { talentId, platform, type, notes } = meta.data;

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
      name: `talents/${talentId}/${Date.now()}-${fileEntry.name}`,
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
      relatedType: 'talent',
      relatedId: talentId,
      ...(platform ? { platform } : {}),
      ...(notes ? { notes } : {}),
      uploadedByUserId: session.user.id,
    });

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[uploadTalentFileAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir archivo' };
  }
}

export async function uploadGeoStatsAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const meta = parseFormData(formData, UploadGeoMeta);
    if (!meta.ok) return { success: false, error: 'talentId requerido' };
    const { talentId, platform, notes, topGeos: topGeosRaw } = meta.data;

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) return { success: false, error: 'Archivo requerido' };

    const validation = await validateUploadedFile(fileEntry, {
      maxBytes: GEO_STATS_TYPES.maxBytes,
      allowedMimes: GEO_STATS_TYPES.mimes,
      allowedExts: GEO_STATS_TYPES.exts,
    });
    if (!validation.ok) {
      const reason = validation.reason;
      if (reason === 'too_large') return { success: false, error: 'Archivo demasiado grande (máx 25 MB)' };
      if (reason === 'empty_file') return { success: false, error: 'Archivo vacío' };
      return { success: false, error: 'Formato no permitido (PDF/PNG/JPEG/CSV/XLSX)' };
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const result = await uploadFile({
      name: `talents/${talentId}/geo/${Date.now()}-${fileEntry.name}`,
      data: buffer,
      contentType: fileEntry.type || 'application/octet-stream',
    });

    await createFile({
      name: fileEntry.name,
      type: 'geo_stats',
      ...(fileEntry.type ? { mime: fileEntry.type } : {}),
      sizeBytes: fileEntry.size,
      url: result.url,
      path: result.pathname,
      relatedType: 'talent',
      relatedId: talentId,
      ...(platform ? { platform } : {}),
      ...(notes ? { notes } : {}),
      uploadedByUserId: session.user.id,
    });

    if (topGeosRaw && platform) {
      let topGeos: GeoEntry[];
      try {
        topGeos = JSON.parse(topGeosRaw) as GeoEntry[];
      } catch {
        return { success: false, error: 'topGeos JSON inválido' };
      }

      const today = new Date().toISOString().slice(0, 10);

      await db.transaction(async (tx) => {
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
    logRedacted('error', '[uploadGeoStatsAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al subir GEO stats' };
  }
}

export async function deleteTalentFileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
    assertCanDelete(session.user.role);

    const meta = parseFormData(formData, DeleteFileMeta);
    if (!meta.ok) return { success: false, error: 'fileId y fileUrl requeridos' };
    const { fileId, fileUrl, talentId } = meta.data;

    await deleteFile(fileUrl);
    await deleteFileById(fileId);

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[deleteTalentFileAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar archivo' };
  }
}
