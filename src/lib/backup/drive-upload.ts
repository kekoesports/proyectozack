/**
 * Sube archivos a Google Drive usando la API REST (multipart upload).
 * Requiere un access token de service account.
 */
import { getDriveAccessToken } from './drive-auth';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';

export type DriveFile = {
  readonly id:          string;
  readonly name:        string;
  readonly webViewLink: string;
  readonly createdTime: string;
  readonly size:        string;
};

// ── Subir archivo ─────────────────────────────────────────────────────

export async function uploadToDrive(
  fileName:    string,
  content:     string,
  mimeType:    string,
  folderId:    string,
): Promise<DriveFile> {
  const token    = await getDriveAccessToken();
  const boundary = `backup_${Date.now()}`;

  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink,createdTime,size`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error subiendo a Drive: ${res.status} — ${err}`);
  }

  return res.json() as Promise<DriveFile>;
}

// ── Listar archivos de la carpeta ─────────────────────────────────────

export async function listDriveBackups(folderId: string, maxResults = 20): Promise<readonly DriveFile[]> {
  const token = await getDriveAccessToken();

  const params = new URLSearchParams({
    q:        `'${folderId}' in parents and trashed=false`,
    fields:   'files(id,name,webViewLink,createdTime,size)',
    orderBy:  'createdTime desc',
    pageSize: String(maxResults),
  });

  const res = await fetch(`${DRIVE_FILES_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error listando Drive: ${res.status} — ${err}`);
  }

  const { files } = await res.json() as { files: DriveFile[] };
  return files ?? [];
}

// ── Obtener URL de descarga ───────────────────────────────────────────

export function getDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
