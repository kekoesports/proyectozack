import 'server-only';

import { createSign } from 'crypto';

import { env } from '@/lib/env';

export { buildDealSheetName } from '@/lib/drive/deal-sheet-name';
import { buildDealSheetName } from '@/lib/drive/deal-sheet-name';

/**
 * Genera la hoja de seguimiento de un trato copiando la plantilla canónica.
 *
 * **Por qué no reutiliza `src/lib/backup/drive-auth.ts`:** aquel pide el scope
 * `drive.file`, que solo alcanza ficheros creados por la propia app o abiertos
 * por el usuario con el Google Picker. Una cuenta de servicio no usa Picker, así
 * que una plantilla que le han *compartido* le resulta invisible con ese scope y
 * `files.copy` devolvería 404. Copiar exige `https://www.googleapis.com/auth/drive`.
 *
 * Se deja el backup con su scope restringido y se pide el amplio solo aquí: si
 * se cambiara `SCOPE` en el módulo compartido, el backup nocturno pasaría a
 * correr con permisos que no necesita y nadie se enteraría hasta que fallara.
 *
 * La cuenta de servicio no tiene Drive propio: solo ve lo que se le comparte
 * explícitamente, así que el scope amplio no le abre nada que no le hayan dado.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const TIMEOUT_MS = 10_000;

/** Caché propia: no se comparte con la del backup, que tiene otro scope. */
let cachedToken: { token: string; expiresAt: number } | null = null;

export type DealSheetConfig = {
  readonly templateId: string;
  readonly folderId: string;
  readonly serviceAccountEmail: string;
  readonly serviceAccountPrivateKey: string;
};

export type DealSheetConfigResult =
  | { ok: true; config: DealSheetConfig }
  | { ok: false; reason: 'missing-config'; detail: string };

/**
 * Config completa o nada. Se devuelve un resultado en vez de lanzar porque la
 * ausencia de configuración es un estado normal —en local no está puesta— y no
 * debe tumbar la creación de un trato.
 */
export function getDealSheetConfig(): DealSheetConfigResult {
  const templateId = env.GOOGLE_DRIVE_DEAL_TEMPLATE_ID;
  const folderId = env.GOOGLE_DRIVE_TRACKING_FOLDER_ID;
  const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const faltan = [
    templateId ? null : 'GOOGLE_DRIVE_DEAL_TEMPLATE_ID',
    folderId ? null : 'GOOGLE_DRIVE_TRACKING_FOLDER_ID',
    serviceAccountEmail ? null : 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    serviceAccountPrivateKey ? null : 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  ].filter((x): x is string => x !== null);

  if (faltan.length > 0 || !templateId || !folderId || !serviceAccountEmail || !serviceAccountPrivateKey) {
    return { ok: false, reason: 'missing-config', detail: `faltan: ${faltan.join(', ')}` };
  }
  return { ok: true, config: { templateId, folderId, serviceAccountEmail, serviceAccountPrivateKey } };
}

function buildJwt(email: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const pem = privateKey.replace(/\\n/g, '\n');
  return `${header}.${payload}.${sign.sign(pem).toString('base64url')}`;
}

async function getWriteAccessToken(config: DealSheetConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const jwt = buildJwt(config.serviceAccountEmail, config.serviceAccountPrivateKey);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // El cuerpo puede traer detalles de la credencial: no se registra.
    throw new Error(`google-oauth-${res.status}`);
  }
  const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}


export type CreateDealSheetResult =
  | { ok: true; spreadsheetId: string; url: string; name: string }
  | { ok: false; reason: 'missing-config' | 'no-access' | 'drive-error'; detail: string };

/**
 * Copia la plantilla canónica a la carpeta de seguimiento.
 *
 * No lanza: devuelve un resultado. Quien llama decide, y en este proyecto la
 * decisión siempre es "seguir adelante sin hoja", porque el trato ya existe y
 * el digest lo marcará como `missing_sheet`.
 */
export async function createDealTrackingSheet(
  brandName: string,
  talentName: string,
): Promise<CreateDealSheetResult> {
  const cfg = getDealSheetConfig();
  if (!cfg.ok) return { ok: false, reason: 'missing-config', detail: cfg.detail };

  const name = buildDealSheetName(brandName, talentName);
  try {
    const token = await getWriteAccessToken(cfg.config);
    const res = await fetch(
      `${DRIVE_FILES}/${encodeURIComponent(cfg.config.templateId)}/copy?fields=id,name`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parents: [cfg.config.folderId] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      // 403 y 404 son el mismo síntoma de fondo: la cuenta de servicio no tiene
      // acceso. Con 404 Drive oculta la existencia del fichero a quien no puede
      // verlo, así que "no encontrado" suele significar "no compartido".
      if (res.status === 403 || res.status === 404) {
        return {
          ok: false,
          reason: 'no-access',
          detail: `${res.status}: la cuenta de servicio no puede leer la plantilla o escribir en la carpeta`,
        };
      }
      return { ok: false, reason: 'drive-error', detail: `drive-${res.status}` };
    }

    const { id } = await res.json() as { id?: string };
    if (!id) return { ok: false, reason: 'drive-error', detail: 'respuesta sin id' };

    return {
      ok: true,
      spreadsheetId: id,
      url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      name,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error desconocido';
    return { ok: false, reason: 'drive-error', detail };
  }
}
