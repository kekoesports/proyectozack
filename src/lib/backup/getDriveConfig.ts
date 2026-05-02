import { env } from '@/lib/env';

export type DriveConfig = {
  readonly folderId: string;
  readonly serviceAccountEmail: string;
  readonly serviceAccountPrivateKey: string;
};

export type DriveConfigResult =
  | { ok: true;  config: DriveConfig }
  | { ok: false; error: string };

/**
 * Valida la configuración de Google Drive en una sola llamada.
 * Política: folderId + email + private key son todas requeridas para cualquier
 * operación (upload, list, auth) — los callsites de Drive en este proyecto
 * siempre necesitan las tres.
 */
export function getDriveConfig(): DriveConfigResult {
  const folderId = env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    return { ok: false, error: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID no está configurado en las variables de entorno.' };
  }

  const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    return {
      ok: false,
      error: 'Credenciales de Google Drive no configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).',
    };
  }

  return { ok: true, config: { folderId, serviceAccountEmail, serviceAccountPrivateKey } };
}
