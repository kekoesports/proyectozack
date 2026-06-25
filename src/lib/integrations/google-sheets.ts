import { env } from '@/lib/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetTab = {
  sheetId: string;
  title: string;
  index: number;
};

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Extracts the spreadsheetId from a Google Sheets URL.
 * Handles the common `/spreadsheets/d/{id}/...` pattern.
 * Returns null if the URL doesn't match.
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  return match?.[1] ?? null;
}

/**
 * Returns true if the URL is a valid Google Sheets URL.
 */
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

async function handleSheetsResponse(response: Response): Promise<unknown> {
  if (response.ok) {
    return response.json() as Promise<unknown>;
  }

  if (response.status === 403) {
    throw new Error(
      'Google Sheet no accesible. Verifica que está compartido con "cualquiera con el enlace".',
    );
  }
  if (response.status === 404) {
    throw new Error('Google Sheet no encontrado. Revisa el ID o la URL.');
  }
  throw new Error(`Error leyendo Google Sheet (HTTP ${response.status})`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Lists all tabs in a Google Sheets spreadsheet.
 * Requires the sheet to be publicly accessible (anyone with link can view).
 */
export async function listSheetTabs(spreadsheetId: string): Promise<SheetTab[]> {
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
}

/**
 * Reads a full sheet tab as a 2D string array (rows × cols).
 * Empty values from the API are preserved as empty strings.
 */
export async function readSheetGrid(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[][]> {
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
}

/**
 * Fetches spreadsheet metadata: title and all tabs.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<{ title: string; tabs: SheetTab[] }> {
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
}
