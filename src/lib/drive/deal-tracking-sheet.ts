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
const SHEETS_SPREADSHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const TIMEOUT_MS = 10_000;
const TRACKING_TAB = 'Seguimiento';
const FIRST_CONTENT_ROW = 7;
const TEMPLATE_LAST_ROW = 60;

/** Caché propia: no se comparte con la del backup, que tiene otro scope. */
let cachedToken: { token: string; expiresAt: number } | null = null;

export type DealSheetConfig = {
  readonly templateId: string;
  readonly fallbackFolderId?: string;
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
    serviceAccountEmail ? null : 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    serviceAccountPrivateKey ? null : 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  ].filter((x): x is string => x !== null);

  if (faltan.length > 0 || !templateId || !serviceAccountEmail || !serviceAccountPrivateKey) {
    return { ok: false, reason: 'missing-config', detail: `faltan: ${faltan.join(', ')}` };
  }
  return {
    ok: true,
    config: {
      templateId,
      ...(folderId ? { fallbackFolderId: folderId } : {}),
      serviceAccountEmail,
      serviceAccountPrivateKey,
    },
  };
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
  | {
      ok: true;
      spreadsheetId: string;
      url: string;
      name: string;
      destination: 'creator' | 'fallback';
      shareStatus: 'not-requested' | 'shared' | 'failed';
      warnings: readonly string[];
    }
  | { ok: false; reason: 'missing-config' | 'no-access' | 'drive-error'; detail: string };

export type CreateDealSheetOptions = {
  /** ID explícito de la carpeta del creador. Tiene prioridad sobre el fallback global. */
  readonly folderId?: string | null;
  /** Email del creador. Si existe, recibe permiso writer sobre la hoja. */
  readonly shareWithEmail?: string | null;
  /** Datos reales que sustituyen los ejemplos de la plantilla copiada. */
  readonly deal?: {
    readonly campaignId: number;
    readonly talentId: number;
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly contractUrl?: string | null;
    readonly deliverables: readonly {
      readonly type: string;
      readonly targetCount: number;
      readonly notes?: string | null;
    }[];
  };
};

const CONTENT_TYPE_PRESENTATION: Record<string, { prefix: string; label: string }> = {
  stream_integration: { prefix: 'STR', label: 'Stream' },
  video_youtube: { prefix: 'VID', label: 'Vídeo' },
  short_reel_tiktok: { prefix: 'SHORT', label: 'Short' },
  story_instagram: { prefix: 'STORY', label: 'Story' },
  tweet_x: { prefix: 'X', label: 'Tweet' },
  post_instagram: { prefix: 'POST', label: 'Post' },
  pack_mensual: { prefix: 'PACK-M', label: 'Pack mensual' },
  pack_trimestral: { prefix: 'PACK-T', label: 'Pack trimestral' },
  preroll: { prefix: 'PRE', label: 'Preroll' },
  otro: { prefix: 'OTRO', label: 'Otro' },
};

/** Convierte los objetivos agregados del CRM en una fila editable por pieza. */
export function buildDealContentRows(
  deliverables: NonNullable<CreateDealSheetOptions['deal']>['deliverables'],
): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  for (const deliverable of deliverables) {
    const count = Math.max(0, Math.trunc(deliverable.targetCount));
    if (count === 0) continue;
    const presentation = CONTENT_TYPE_PRESENTATION[deliverable.type] ?? {
      prefix: 'OTRO',
      label: deliverable.type.replaceAll('_', ' '),
    };
    const digits = Math.max(2, String(count).length);
    for (let index = 1; index <= count; index++) {
      rows.push([
        `${presentation.prefix}-${String(index).padStart(digits, '0')}`,
        presentation.label,
        index,
        'Pendiente',
        '',
        '',
        '',
        'Pendiente',
        deliverable.notes?.trim() ?? '',
      ]);
    }
  }
  return rows;
}

async function checkedGoogleWrite(url: string, token: string, init: RequestInit): Promise<void> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`google-write-${res.status}`);
}

async function populateCopiedSheet(args: {
  readonly spreadsheetId: string;
  readonly token: string;
  readonly brandName: string;
  readonly talentName: string;
  readonly deal: NonNullable<CreateDealSheetOptions['deal']>;
}): Promise<void> {
  const rows = buildDealContentRows(args.deal.deliverables);
  const lastRow = Math.max(TEMPLATE_LAST_ROW, FIRST_CONTENT_ROW + rows.length - 1);
  const extraRows = Math.max(0, lastRow - TEMPLATE_LAST_ROW);
  const base = `${SHEETS_SPREADSHEETS}/${encodeURIComponent(args.spreadsheetId)}`;

  if (extraRows > 0) {
    // La fila 60 contiene el formato y las validaciones de la tabla. Se replica
    // antes de vaciar valores para que los deals grandes mantengan los menús.
    await checkedGoogleWrite(`${base}:batchUpdate`, args.token, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          { appendDimension: { sheetId: 0, dimension: 'ROWS', length: extraRows } },
          {
            copyPaste: {
              source: {
                sheetId: 0,
                startRowIndex: TEMPLATE_LAST_ROW - 1,
                endRowIndex: TEMPLATE_LAST_ROW,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              destination: {
                sheetId: 0,
                startRowIndex: TEMPLATE_LAST_ROW,
                endRowIndex: lastRow,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              pasteType: 'PASTE_NORMAL',
              pasteOrientation: 'NORMAL',
            },
          },
        ],
      }),
    });
  }

  const contentRange = `'${TRACKING_TAB}'!A${FIRST_CONTENT_ROW}:I${lastRow}`;
  await checkedGoogleWrite(
    `${base}/values/${encodeURIComponent(contentRange)}:clear`,
    args.token,
    { method: 'POST', body: '{}' },
  );

  const data: Array<{ range: string; values: Array<Array<string | number>> }> = [
    { range: `'${TRACKING_TAB}'!B2`, values: [[args.talentName]] },
    { range: `'${TRACKING_TAB}'!E2`, values: [[args.brandName]] },
    { range: `'${TRACKING_TAB}'!H2`, values: [[args.deal.campaignId]] },
    { range: `'${TRACKING_TAB}'!B3`, values: [[args.deal.startDate ?? '']] },
    { range: `'${TRACKING_TAB}'!E3`, values: [[args.deal.endDate ?? '']] },
    { range: `'${TRACKING_TAB}'!H3`, values: [[args.deal.contractUrl ?? '']] },
    {
      range: `'${TRACKING_TAB}'!B4`,
      values: [[`=IFERROR(SUMPRODUCT(REGEXMATCH(LOWER(D7:D${lastRow});"^(entregado|aprobado)$")*REGEXMATCH(LOWER(F7:F${lastRow});"^https?://"))/COUNTA(A7:A${lastRow});0)`]],
    },
    {
      range: `'${TRACKING_TAB}'!D4`,
      values: [[`=SUMPRODUCT(REGEXMATCH(LOWER(D7:D${lastRow});"^(entregado|aprobado)$")*REGEXMATCH(LOWER(F7:F${lastRow});"^https?://"))`]],
    },
    { range: `'${TRACKING_TAB}'!F4`, values: [[`=COUNTA(A7:A${lastRow})`]] },
    {
      range: `'${TRACKING_TAB}'!H4`,
      values: [['=IF(B4>=100%;"DEAL COMPLETADO";IF(B4>=80%;"80% · preparar factura";IF(B4>=70%;"70% · revisar facturación";"En curso")))']],
    },
  ];
  if (rows.length > 0) {
    data.push({
      range: `'${TRACKING_TAB}'!A${FIRST_CONTENT_ROW}:I${FIRST_CONTENT_ROW + rows.length - 1}`,
      values: rows,
    });
  }

  await checkedGoogleWrite(`${base}/values:batchUpdate`, args.token, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
  });
}

async function trashFailedCopy(spreadsheetId: string, token: string): Promise<void> {
  try {
    await checkedGoogleWrite(
      `${DRIVE_FILES}/${encodeURIComponent(spreadsheetId)}?supportsAllDrives=true&fields=id`,
      token,
      { method: 'PATCH', body: JSON.stringify({ trashed: true }) },
    );
  } catch {
    // Limpieza best-effort: el error original de Sheets es el que importa.
  }
}

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
  options: CreateDealSheetOptions = {},
): Promise<CreateDealSheetResult> {
  const cfg = getDealSheetConfig();
  if (!cfg.ok) return { ok: false, reason: 'missing-config', detail: cfg.detail };

  const creatorFolderId = options.folderId?.trim() || null;
  const fallbackFolderId = cfg.config.fallbackFolderId?.trim() || null;
  if (!creatorFolderId && !fallbackFolderId) {
    return {
      ok: false,
      reason: 'missing-config',
      detail: 'falta GOOGLE_DRIVE_TRACKING_FOLDER_ID o carpeta Drive del creador',
    };
  }

  const name = buildDealSheetName(brandName, talentName);
  try {
    const token = await getWriteAccessToken(cfg.config);
    const destinations: Array<{ id: string; kind: 'creator' | 'fallback' }> = [];
    if (creatorFolderId) destinations.push({ id: creatorFolderId, kind: 'creator' });
    if (fallbackFolderId && fallbackFolderId !== creatorFolderId) {
      destinations.push({ id: fallbackFolderId, kind: 'fallback' });
    }

    let res: Response | null = null;
    let destination: 'creator' | 'fallback' = creatorFolderId ? 'creator' : 'fallback';
    let usedFallbackAfterAccessFailure = false;
    for (const candidate of destinations) {
      res = await fetch(
        `${DRIVE_FILES}/${encodeURIComponent(cfg.config.templateId)}/copy?supportsAllDrives=true&fields=id%2Cname`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            parents: [candidate.id],
            ...(options.deal ? {
              appProperties: {
                socialproCampaignId: String(options.deal.campaignId),
                socialproTalentId: String(options.deal.talentId),
              },
            } : {}),
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      destination = candidate.kind;
      if (res.ok) break;

      // Una carpeta personal puede estar compartida con la cuenta de servicio
      // y aun así rechazar la copia: las cuentas de servicio no tienen cuota de
      // Drive propia. En ese caso se reintenta en la unidad compartida
      // corporativa, donde los archivos pertenecen al Shared Drive.
      const canTryFallback = candidate.kind === 'creator'
        && (res.status === 403 || res.status === 404)
        && destinations.some((item) => item.kind === 'fallback');
      if (canTryFallback) {
        usedFallbackAfterAccessFailure = true;
        continue;
      }
      break;
    }

    if (!res?.ok) {
      // 403 y 404 son el mismo síntoma de fondo: la cuenta de servicio no tiene
      // acceso. Con 404 Drive oculta la existencia del fichero a quien no puede
      // verlo, así que "no encontrado" suele significar "no compartido".
      if (res?.status === 403 || res?.status === 404) {
        return {
          ok: false,
          reason: 'no-access',
          detail: `${res.status}: la cuenta de servicio no puede leer la plantilla o escribir en la carpeta`,
        };
      }
      return { ok: false, reason: 'drive-error', detail: `drive-${res?.status ?? 'unknown'}` };
    }

    const { id } = await res.json() as { id?: string };
    if (!id) return { ok: false, reason: 'drive-error', detail: 'respuesta sin id' };

    if (options.deal) {
      try {
        await populateCopiedSheet({
          spreadsheetId: id,
          token,
          brandName,
          talentName,
          deal: options.deal,
        });
      } catch (err) {
        await trashFailedCopy(id, token);
        return {
          ok: false,
          reason: 'drive-error',
          detail: err instanceof Error ? err.message : 'no se pudo rellenar la hoja',
        };
      }
    }

    let shareStatus: 'not-requested' | 'shared' | 'failed' = 'not-requested';
    const warnings: string[] = [];
    if (usedFallbackAfterAccessFailure) {
      warnings.push('la carpeta personal no admite copias automáticas; se usó la carpeta corporativa');
    }
    const shareWithEmail = options.shareWithEmail?.trim() || null;
    if (shareWithEmail) {
      // Compartir es best-effort. La copia ya existe: convertir un fallo de
      // permisos en error global provocaría un reintento y una hoja huérfana.
      try {
        const permission = await fetch(
          `${DRIVE_FILES}/${encodeURIComponent(id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true&fields=id`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: shareWithEmail }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          },
        );
        if (permission.ok) {
          shareStatus = 'shared';
        } else {
          shareStatus = 'failed';
          warnings.push(`no se pudo compartir la hoja (drive-${permission.status})`);
        }
      } catch {
        shareStatus = 'failed';
        warnings.push('no se pudo compartir la hoja (error de red)');
      }
    }

    return {
      ok: true,
      spreadsheetId: id,
      url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      name,
      destination,
      shareStatus,
      warnings,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error desconocido';
    return { ok: false, reason: 'drive-error', detail };
  }
}
