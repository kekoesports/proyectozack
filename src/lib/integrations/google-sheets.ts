import { env } from '@/lib/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetTab = {
  sheetId: string;
  title: string;
  index: number;
};

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

function getApiKey(): string {
  const key = env.GOOGLE_SHEETS_API_KEY;
  if (!key) {
    throw new Error('Falta configurar GOOGLE_SHEETS_API_KEY en las variables de entorno.');
  }
  return key;
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
      'Google Sheet no accesible. Verifica que está compartido con "cualquiera con el enlace".',
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
 * Si Google manda Retry-After, gana ese valor.
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
      const headerWait = (err.retryAfterSeconds ?? 0) * 1000;
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
    const key = getApiKey();
    const fields = encodeURIComponent('sheets.properties(sheetId,title,index)');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?key=${key}&fields=${fields}`;

    const response = await fetch(url, { cache: 'no-store' });
    const data = await handleSheetsResponse(response);

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
 * Reads a full sheet tab as a 2D string array (rows × cols).
 * Empty values from the API are preserved as empty strings.
 */
export async function readSheetGrid(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[][]> {
  return withRetry(async () => {
    const key = getApiKey();
    const range = encodeURIComponent(sheetTitle);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?key=${key}`;

    const response = await fetch(url, { cache: 'no-store' });
    const data = await handleSheetsResponse(response);

    // safe: validated from Sheets API response — `values` may be absent on empty tabs
    const json = data as { values?: unknown[][] };
    const rawRows = json.values ?? [];

    // Ensure every cell is a string; pad rows to equal width
    const maxCols = rawRows.reduce((m, row) => Math.max(m, row.length), 0);
    return rawRows.map((row) => {
      const padded: string[] = Array(maxCols).fill('') as string[];
      for (let c = 0; c < row.length; c++) {
        padded[c] = row[c] == null ? '' : String(row[c]);
      }
      return padded;
    });
  });
}

/**
 * Fetches spreadsheet metadata: title and all tabs.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<{ title: string; tabs: SheetTab[] }> {
  return withRetry(async () => {
    const key = getApiKey();
    const fields = encodeURIComponent(
      'properties.title,sheets.properties(sheetId,title,index)',
    );
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?key=${key}&fields=${fields}`;

    const response = await fetch(url, { cache: 'no-store' });
    const data = await handleSheetsResponse(response);

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
