'use server';

import { requirePermission } from '@/lib/permissions';
import { exportCrmData, serializeBackup, buildBackupFileName } from '@/lib/backup/export-data';
import { uploadToDrive, listDriveBackups } from '@/lib/backup/drive-upload';
import type { DriveFile } from '@/lib/backup/drive-upload';
import { getDriveConfig } from '@/lib/backup/getDriveConfig';

type BackupResult =
  | { success: true;  file: DriveFile; totalRows: number; tables: number }
  | { success: false; error: string };

// ── Crear backup manual ───────────────────────────────────────────────

export async function createManualBackupAction(): Promise<BackupResult> {
  await requirePermission('ajustes', 'write');

  const cfg = getDriveConfig();
  if (!cfg.ok) return { success: false, error: cfg.error };

  try {
    const data     = await exportCrmData();
    const json     = serializeBackup(data);
    const fileName = buildBackupFileName('manual');
    const file     = await uploadToDrive(fileName, json, 'application/json', cfg.config.folderId);

    return {
      success:   true,
      file,
      totalRows: data.meta.totalRows,
      tables:    data.meta.tables.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al crear el backup';
    console.error('[backup] Error en createManualBackupAction:', msg);
    return { success: false, error: msg };
  }
}

// ── Listar backups existentes ─────────────────────────────────────────

export async function listBackupsAction(): Promise<
  | { success: true;  files: readonly DriveFile[] }
  | { success: false; error: string }
> {
  await requirePermission('ajustes', 'write');

  const cfg = getDriveConfig();
  if (!cfg.ok) return { success: false, error: cfg.error };

  try {
    const files = await listDriveBackups(cfg.config.folderId, 30);
    return { success: true, files };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al listar backups';
    return { success: false, error: msg };
  }
}
