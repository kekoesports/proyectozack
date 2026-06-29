import { connectTrackerSheetSchema } from '@/lib/schemas/deal-tracker';
import { extractSpreadsheetId } from '@/lib/integrations/google-sheets';

// ── Schema validation ─────────────────────────────────────────────────────────

describe('connectTrackerSheetSchema', () => {
  const VALID_URL = 'https://docs.google.com/spreadsheets/d/1DYUJa1HAFDvMx1s7KOKrCrWdJGpaS6RA1RAmKWqhChs/edit#gid=0';

  test('valid Google Sheet URL + trackerId → passes', () => {
    const result = connectTrackerSheetSchema.safeParse({ trackerId: '42', googleSheetUrl: VALID_URL });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackerId).toBe(42);
      expect(result.data.googleSheetUrl).toBe(VALID_URL);
    }
  });

  test('non-Sheets URL rejected', () => {
    const result = connectTrackerSheetSchema.safeParse({
      trackerId: '42',
      googleSheetUrl: 'https://drive.google.com/file/d/abc123/view',
    });
    expect(result.success).toBe(false);
  });

  test('trackingParseMode defaults to horizontal_triplets', () => {
    const result = connectTrackerSheetSchema.safeParse({ trackerId: '42', googleSheetUrl: VALID_URL });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackingParseMode).toBe('horizontal_triplets');
    }
  });

  test('trackerId=0 rejected (must be positive)', () => {
    const result = connectTrackerSheetSchema.safeParse({ trackerId: '0', googleSheetUrl: VALID_URL });
    expect(result.success).toBe(false);
  });
});

// ── GID extraction ────────────────────────────────────────────────────────────

describe('GID extraction from Sheet URL', () => {
  const extractGid = (url: string): string => {
    const m = /[?&#]gid=(\d+)/.exec(url);
    return m?.[1] ?? '0';
  };

  test('extracts gid from URL fragment (#gid=0)', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0';
    expect(extractGid(url)).toBe('0');
  });

  test('extracts gid from query param (?gid=1234567)', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc/edit?gid=1234567&usp=sharing';
    expect(extractGid(url)).toBe('1234567');
  });

  test('defaults to 0 when no gid in URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc/edit';
    expect(extractGid(url)).toBe('0');
  });

  test('extractSpreadsheetId works for real KEYDROP Sheet URL', () => {
    const url =
      'https://docs.google.com/spreadsheets/d/1DYUJa1HAFDvMx1s7KOKrCrWdJGpaS6RA1RAmKWqhChs/edit#gid=0';
    expect(extractSpreadsheetId(url)).toBe('1DYUJa1HAFDvMx1s7KOKrCrWdJGpaS6RA1RAmKWqhChs');
  });
});
