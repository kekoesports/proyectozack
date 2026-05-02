'use server';

import { requireRole } from '@/lib/auth-guard';
import { exportCrmData, serializeBackup, buildBackupFileName } from '@/lib/backup/export-data';
import { uploadToDrive, listDriveBackups } from '@/lib/backup/drive-upload';
import type { DriveFile } from '@/lib/backup/drive-upload';
import { env } from '@/lib/env';

type BackupResult =
  | { success: true;  file: DriveFile; totalRows: number; tables: number }
  | { success: false; error: string };

// ── Crear backup manual ───────────────────────────────────────────────

export async function createManualBackupAction(): Promise<BackupResult> {
  await requireRole('admin', '/admin/login');

  const folderId = env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    return { success: false, error: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID no está configurado en las variables de entorno.' };
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return { success: false, error: 'Credenciales de Google Drive no configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).' };
  }

  try {
    const data     = await exportCrmData();
    const json     = serializeBackup(data);
    const fileName = buildBackupFileName('manual');
    const file     = await uploadToDrive(fileName, json, 'application/json', folderId);

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
  await requireRole('admin', '/admin/login');

  const folderId = env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    return { success: false, error: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID no configurado.' };
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return { success: false, error: 'Credenciales de Google Drive no configuradas.' };
  }

  try {
    const files = await listDriveBackups(folderId, 30);
    return { success: true, files };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al listar backups';
    return { success: false, error: msg };
  }
}
