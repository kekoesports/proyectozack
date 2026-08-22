import { createSign } from 'crypto';

import { env } from '@/lib/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetTab = {
  sheetId: string;
  title: string;
  index: number;
};

export type SheetCellData = {
  readonly formattedValue?: string;
  readonly effectiveValue?: {
    readonly stringValue?: string;
    readonly numberValue?: number;
    readonly boolValue?: boolean;
  };
  readonly hyperlink?: string;
  readonly textFormatRuns?: ReadonlyArray<{
    readonly format?: { readonly link?: { readonly uri?: string } };
  }>;
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

/**
 * Error tipado para respuestas no-OK de la API de Google Sheets.
 * `status` se preserva para que `withRetry` pueda decidir si reintentar.
 *   - 429: rate limit → retry con backoff (Retry-After si existe)
 *   - 403/404: no se reintenta (acceso o ID malo)
 *   - 5xx: tampoco se reintenta por ahora (suelen ser fallos transitorios reales,
 *     pero el usuario aprobó solo manejar 429 explícitamente)
 */
export class SheetsApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
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

/** Tope al Retry-After de Google. Ver la nota de withRetry. */
const MAX_RETRY_AFTER_MS = 10_000;

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

async function getServiceAccountToken(config: { email: string; privateKey: string }): Promise<string> {
  if (cachedServiceAccountToken && cachedServiceAccountToken.expiresAt > Date.now() + 60_000) {
    return cachedServiceAccountToken.token;
  }

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

  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('google-sheets-oauth-sin-token');
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
async function fetchSheetsJson(url: string, timeoutMs: number): Promise<unknown> {
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
      const token = await getServiceAccountToken(serviceAccount);
      oauthResponse = await fetch(url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (!apiKey) throw error;
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
  const response = await fetch(appendApiKey(url, apiKey), {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  return handleSheetsResponse(response);
}

function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const n = Number(headerValue);
  if (Number.isFinite(n) && n >= 0) return n;
  // HTTP-date format no se usa en Google API normalmente; ignoramos.
  return null;
}

async function handleSheetsResponse(response: Response): Promise<unknown> {
  if (response.ok) {
    return response.json() as Promise<unknown>;
  }

  if (response.status === 403) {
    throw new SheetsApiError(
      'Google Sheet no accesible. Compártelo con la cuenta de servicio o con "cualquiera con el enlace".',
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

/**
 * Wrapper de retry para llamadas a la API de Google Sheets.
 *
 *   - Solo reintenta en 429.
 *   - 3 intentos máximo (1 + 2 retries adicionales tras el 429).
 *   - Espera = max(Retry-After del header, base × 2^attempt) + jitter ±20%.
 *   - 403/404/5xx no se reintentan — se propagan directamente.
 *
 * El backoff base es 1s → secuencia típica sin Retry-After: 1.0s, 2.0s, 4.0s (±20%).
 * Si Google manda Retry-After, gana ese valor, acotado a MAX_RETRY_AFTER_MS: un
 * `Retry-After: 60` dormiría ~120s dentro de una sola campaña y se llevaría por
 * delante el presupuesto de toda la sincronización.
 *
 * @internal Exportado solo para tests unitarios.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>; // inyectable para tests
  } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let attempt = 0;
  // safe: el bucle siempre o retorna o lanza
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof SheetsApiError) || err.status !== 429) {
        throw err;
      }
      attempt++;
      if (attempt >= maxAttempts) {
        throw err;
      }
      const exponential = baseDelayMs * Math.pow(2, attempt - 1);
      const headerWait = Math.min((err.retryAfterSeconds ?? 0) * 1000, MAX_RETRY_AFTER_MS);
      const baseWait = Math.max(exponential, headerWait);
      // Jitter ±20%
      const jitter = baseWait * (Math.random() * 0.4 - 0.2);
      const waitMs = Math.max(0, Math.round(baseWait + jitter));
      await sleep(waitMs);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listSheetTabs(spreadsheetId: string): Promise<SheetTab[]> {
  return withRetry(async () => {
    const fields = encodeURIComponent('sheets.properties(sheetId,title,index)');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;

    const data = await fetchSheetsJson(url, SHEETS_FETCH_TIMEOUT_MS);

    // safe: validated from Sheets API response
    const json = data as {
      sheets?: Array<{
        properties?: {
          sheetId?: number;
          title?: string;
          index?: number;
        };
      }>;
    };

    return (json.sheets ?? []).map((sheet) => ({
      sheetId: String(sheet.properties?.sheetId ?? ''),
      title: sheet.properties?.title ?? '',
      index: sheet.properties?.index ?? 0,
    }));
  });
}

/**
 * Reads the operational area of a sheet tab as a 2D string array (rows × cols).
 * Empty values from the API are preserved as empty strings.
 */
export async function readSheetGrid(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[][]> {
  return withRetry(async () => {
    const range = encodeURIComponent(`'${sheetTitle.replace(/'/g, "''")}'!A1:ZZ500`);
    const fields = encodeURIComponent(
      'sheets(data(startRow,startColumn,rowData(values(formattedValue,effectiveValue,hyperlink,textFormatRuns(format(link(uri)))))))',
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?ranges=${range}&includeGridData=true&fields=${fields}`;
    const data = await fetchSheetsJson(url, SHEETS_GRID_FETCH_TIMEOUT_MS);

    const json = data as {
      sheets?: Array<{
        data?: Array<{
          startRow?: number;
          startColumn?: number;
          rowData?: Array<{ values?: SheetCellData[] }>;
        }>;
      }>;
    };
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
  });
}

/**
 * Fetches spreadsheet metadata: title and all tabs.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<{ title: string; tabs: SheetTab[] }> {
  return withRetry(async () => {
    const fields = encodeURIComponent(
      'properties.title,sheets.properties(sheetId,title,index)',
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;

    const data = await fetchSheetsJson(url, SHEETS_FETCH_TIMEOUT_MS);

    // safe: validated from Sheets API response
    const json = data as {
      properties?: { title?: string };
      sheets?: Array<{
        properties?: {
          sheetId?: number;
          title?: string;
          index?: number;
        };
      }>;
    };

    const title = json.properties?.title ?? '';
    const tabs: SheetTab[] = (json.sheets ?? []).map((sheet) => ({
      sheetId: String(sheet.properties?.sheetId ?? ''),
      title: sheet.properties?.title ?? '',
      index: sheet.properties?.index ?? 0,
    }));

    return { title, tabs };
  });
}
