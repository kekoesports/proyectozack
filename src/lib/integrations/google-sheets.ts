import { createSign } from 'crypto';

import { env } from '@/lib/env';
import { SheetsGrid, SheetsMetadata, SheetsOAuthToken, SheetsRetryAfterHeader, type SheetCellData } from '@/lib/schemas/google-sheets';
import {
  assertSheetsBudget,
  SHEETS_READ_BUDGET_MS,
  sheetsAdmission,
  SheetsApiError,
  SheetsDeadlineError,
  type SheetsReadOptions,
  withRetry,
} from '@/lib/integrations/google-sheets-policy';

export { SheetsApiError, SheetsDeadlineError, withRetry } from '@/lib/integrations/google-sheets-policy';
export type { SheetsReadOptions } from '@/lib/integrations/google-sheets-policy';
export type { SheetCellData } from '@/lib/schemas/google-sheets';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetTab = {
  sheetId: string;
  title: string;
  index: number;
};

/** Prefer the actual Google Sheets link target over its visible label. */
export function sheetCellText(cell: SheetCellData | undefined): string {
  if (!cell) return '';
  const richLink = cell.textFormatRuns
    ?.map((run) => run.format?.link?.uri)
    .find((uri): uri is string => Boolean(uri && /^https?:\/\//i.test(uri)));
  if (cell.hyperlink && /^https?:\/\//i.test(cell.hyperlink)) return cell.hyperlink;
  if (richLink) return richLink;
  if (cell.formattedValue !== undefined) return cell.formattedValue;
  if (cell.effectiveValue?.stringValue !== undefined) return cell.effectiveValue.stringValue;
  if (cell.effectiveValue?.numberValue !== undefined) return String(cell.effectiveValue.numberValue);
  if (cell.effectiveValue?.boolValue !== undefined) return String(cell.effectiveValue.boolValue);
  return '';
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function extractSpreadsheetId(url: string): string | null {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  return match?.[1] ?? null;
}

export function validateGoogleSheetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'docs.google.com' &&
      parsed.pathname.startsWith('/spreadsheets/d/')
    );
  } catch {
    return false;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Corte de cada llamada HTTP a Google. Sin esto un cuelgue de Sheets consume la
 * invocación entera y la sincronización muere sin registrar el error en ninguna
 * campaña. Mismo patrón que safeImageFetch, discord/fetch-user-guild-ids y steam/profile.
 */
const SHEETS_FETCH_TIMEOUT_MS = 10_000;

// Rich CellData includes hyperlink metadata and can be slower on templates
// with formatting copied down hundreds of empty rows.
const SHEETS_GRID_FETCH_TIMEOUT_MS = 30_000;

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_READ_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let cachedServiceAccountToken: { token: string; expiresAt: number } | null = null;

function getApiKey(): string | null {
  return env.GOOGLE_SHEETS_API_KEY?.trim() || null;
}

function getServiceAccountConfig(): { email: string; privateKey: string } | null {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  return email && privateKey ? { email, privateKey } : null;
}

function buildServiceAccountJwt(email: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: GOOGLE_SHEETS_READ_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey.replace(/\\n/g, '\n')).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

async function getServiceAccountToken(config: { email: string; privateKey: string }, deadlineAt: number): Promise<string> {
  if (cachedServiceAccountToken && cachedServiceAccountToken.expiresAt > Date.now() + 60_000) {
    return cachedServiceAccountToken.token;
  }

  assertSheetsBudget(deadlineAt, SHEETS_FETCH_TIMEOUT_MS);
  const jwt = buildServiceAccountJwt(config.email, config.privateKey);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(SHEETS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    // El cuerpo de OAuth puede contener detalles de la credencial: no se lee ni registra.
    throw new Error(`google-sheets-oauth-${response.status}`);
  }

  const parsed = SheetsOAuthToken.safeParse(await response.json());
  if (!parsed.success) throw new Error('google-sheets-oauth-respuesta-invalida');
  const json = parsed.data;
  cachedServiceAccountToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

function appendApiKey(url: string, key: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

/**
 * La cuenta de servicio es la vía preferente: permite leer hojas privadas que
 * se le hayan compartido. Si esa hoja no es visible para la cuenta, se conserva
 * el acceso histórico por API key para trackers públicos.
 */
async function fetchSheetsJson(url: string, timeoutMs: number, deadlineAt: number): Promise<unknown> {
  const serviceAccount = getServiceAccountConfig();
  const apiKey = getApiKey();

  if (!serviceAccount && !apiKey) {
    throw new Error(
      'Falta configurar GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY o GOOGLE_SHEETS_API_KEY.',
    );
  }

  if (serviceAccount) {
    let oauthResponse: Response | null = null;
    try {
      const token = await getServiceAccountToken(serviceAccount, deadlineAt);
      oauthResponse = await fetchSheetsHttp(url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      }, timeoutMs, deadlineAt);
    } catch (error) {
      if (!apiKey || error instanceof SheetsDeadlineError) throw error;
      // OAuth no disponible: una hoja pública todavía puede leerse con API key.
    }
    if (oauthResponse?.ok) return oauthResponse.json() as Promise<unknown>;
    if (oauthResponse && (!apiKey || ![401, 403, 404].includes(oauthResponse.status))) {
      // Solo los fallos de visibilidad/autenticación justifican probar la ruta
      // pública. 429 y 5xx deben conservar su semántica de retry/error.
      return handleSheetsResponse(oauthResponse);
    }
  }

  if (!apiKey) {
    throw new Error('Google Sheet no accesible con la cuenta de servicio configurada.');
  }
  const response = await fetchSheetsHttp(appendApiKey(url, apiKey), {
    cache: 'no-store',
  }, timeoutMs, deadlineAt);
  return handleSheetsResponse(response);
}

async function fetchSheetsHttp(
  url: string, init: RequestInit, timeoutMs: number, deadlineAt: number,
): Promise<Response> {
  const response = await sheetsAdmission.run(
    () => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
    timeoutMs,
    deadlineAt,
  );
  // Includes the final failed attempt: queued consumers must also cool down.
  if (response.status === 429) sheetsAdmission.cooldown(parseRetryAfter(response.headers.get('retry-after')));
  assertSheetsBudget(deadlineAt);
  return response;
}

function parseRetryAfter(headerValue: string | null): number | null {
  const parsed = SheetsRetryAfterHeader.safeParse(headerValue);
  if (!parsed.success) return null;
  const n = Number(parsed.data);
  if (Number.isFinite(n) && n >= 0) return n;
  if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(parsed.data)) return null;
  const date = Date.parse(parsed.data);
  return Number.isFinite(date) ? Math.max(0, (date - Date.now()) / 1000) : null;
}

async function handleSheetsResponse(response: Response): Promise<unknown> {
  if (response.ok) {
    return response.json() as Promise<unknown>;
  }

  if (response.status === 403) {
    throw new SheetsApiError(
      'Google Sheets ha rechazado la lectura (HTTP 403). El motivo concreto requiere revisión.',
      403,
    );
  }
  if (response.status === 404) {
    throw new SheetsApiError('Google Sheet no encontrado. Revisa el ID o la URL.', 404);
  }
  if (response.status === 429) {
    const ra = parseRetryAfter(response.headers.get('retry-after'));
    throw new SheetsApiError(`Rate limit (HTTP 429)`, 429, ra);
  }
  throw new SheetsApiError(`Error leyendo Google Sheet (HTTP ${response.status})`, response.status);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listSheetTabs(spreadsheetId: string, options: SheetsReadOptions = {}): Promise<SheetTab[]> {
  const deadlineAt = options.deadlineAt ?? Date.now() + SHEETS_READ_BUDGET_MS;
  return withRetry(async () => {
    const fields = encodeURIComponent('sheets.properties(sheetId,title,index)');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;

    const data = await fetchSheetsJson(url, SHEETS_FETCH_TIMEOUT_MS, deadlineAt);
    const parsed = SheetsMetadata.safeParse(data);
    if (!parsed.success) throw new Error('Respuesta de Google Sheets no válida.');
    assertSheetsBudget(deadlineAt);
    const json = parsed.data;

    return (json.sheets ?? []).map((sheet) => ({
      sheetId: String(sheet.properties?.sheetId ?? ''),
      title: sheet.properties?.title ?? '',
      index: sheet.properties?.index ?? 0,
    }));
  }, { deadlineAt, timeoutMs: SHEETS_FETCH_TIMEOUT_MS });
}

/**
 * Reads the operational area of a sheet tab as a 2D string array (rows × cols).
 * Empty values from the API are preserved as empty strings.
 */
export async function readSheetGrid(
  spreadsheetId: string,
  sheetTitle: string,
  options: SheetsReadOptions = {},
): Promise<string[][]> {
  const deadlineAt = options.deadlineAt ?? Date.now() + SHEETS_READ_BUDGET_MS;
  return withRetry(async () => {
    const range = encodeURIComponent(`'${sheetTitle.replace(/'/g, "''")}'!A1:ZZ500`);
    const fields = encodeURIComponent(
      'sheets(data(startRow,startColumn,rowData(values(formattedValue,effectiveValue,hyperlink,textFormatRuns(format(link(uri)))))))',
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?ranges=${range}&includeGridData=true&fields=${fields}`;
    const data = await fetchSheetsJson(url, SHEETS_GRID_FETCH_TIMEOUT_MS, deadlineAt);
    const parsed = SheetsGrid.safeParse(data);
    if (!parsed.success) throw new Error('Respuesta de Google Sheets no válida.');
    assertSheetsBudget(deadlineAt);
    const json = parsed.data;
    const segments = json.sheets?.flatMap((sheet) => sheet.data ?? []) ?? [];
    let maxRows = 0;
    let maxCols = 0;
    for (const segment of segments) {
      const startRow = segment.startRow ?? 0;
      const startColumn = segment.startColumn ?? 0;
      maxRows = Math.max(maxRows, startRow + (segment.rowData?.length ?? 0));
      for (const row of segment.rowData ?? []) {
        maxCols = Math.max(maxCols, startColumn + (row.values?.length ?? 0));
      }
    }
    const grid = Array.from({ length: maxRows }, () => Array<string>(maxCols).fill(''));
    for (const segment of segments) {
      const startRow = segment.startRow ?? 0;
      const startColumn = segment.startColumn ?? 0;
      for (let rowOffset = 0; rowOffset < (segment.rowData?.length ?? 0); rowOffset++) {
        const row = segment.rowData?.[rowOffset];
        for (let colOffset = 0; colOffset < (row?.values?.length ?? 0); colOffset++) {
          const targetRow = grid[startRow + rowOffset];
          if (targetRow) targetRow[startColumn + colOffset] = sheetCellText(row?.values?.[colOffset]);
        }
      }
    }
    return grid;
  }, { deadlineAt, timeoutMs: SHEETS_GRID_FETCH_TIMEOUT_MS });
}

/**
 * Fetches spreadsheet metadata: title and all tabs.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  options: SheetsReadOptions = {},
): Promise<{ title: string; tabs: SheetTab[] }> {
  const deadlineAt = options.deadlineAt ?? Date.now() + SHEETS_READ_BUDGET_MS;
  return withRetry(async () => {
    const fields = encodeURIComponent(
      'properties.title,sheets.properties(sheetId,title,index)',
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;

    const data = await fetchSheetsJson(url, SHEETS_FETCH_TIMEOUT_MS, deadlineAt);
    const parsed = SheetsMetadata.safeParse(data);
    if (!parsed.success) throw new Error('Respuesta de Google Sheets no válida.');
    assertSheetsBudget(deadlineAt);
    const json = parsed.data;

    const title = json.properties?.title ?? '';
    const tabs: SheetTab[] = (json.sheets ?? []).map((sheet) => ({
      sheetId: String(sheet.properties?.sheetId ?? ''),
      title: sheet.properties?.title ?? '',
      index: sheet.properties?.index ?? 0,
    }));

    return { title, tabs };
  }, { deadlineAt, timeoutMs: SHEETS_FETCH_TIMEOUT_MS });
}
