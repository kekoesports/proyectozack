/**
 * Parser + helpers de PR2 — tratos sheet link tracking.
 *
 * Cubre:
 *   - `suggestDeliverableType('preroll') === 'preroll'` (post migración 0110).
 *   - `extractSpreadsheetId` acepta 6 formatos comunes de Google Sheets.
 *   - `extractSheetGid` acepta gid en query o hash.
 *   - `normalizeUrl` deduplica case, params tracking, trailing slash.
 *   - `aggregateBlocksByType` cuenta URLs únicas por deliverableType.
 *   - `normalizeTrackingSheetInput` acepta vacío como null.
 */

// Mock env para evitar cargar Better Auth
jest.mock('@/lib/env', () => ({
  env: new Proxy({}, { get: (_t, key: string) => process.env[key] }),
}));

// server-only marker no debe romper el test — mockeamos como no-op.
jest.mock('server-only', () => ({}));

// db mock — el módulo campaign-sheet-sync importa db en top-level pero
// estos tests solo tocan helpers puros (extractSheetGid, normalizeUrl,
// aggregateBlocksByType, normalizeTrackingSheetInput). El mock evita cargar Neon.
jest.mock('@/lib/db', () => ({ db: {} }));

import { suggestDeliverableType } from '@/lib/parsers/socialpro-blocks';
import { extractSpreadsheetId } from '@/lib/integrations/google-sheets';
import {
  extractSheetGid,
  normalizeUrl,
  aggregateBlocksByType,
  normalizeTrackingSheetInput,
} from '@/lib/queries/campaign-sheet-sync';

describe('suggestDeliverableType — mapping post-0110', () => {
  it('preroll → preroll (nuevo, antes stream_integration)', () => {
    expect(suggestDeliverableType('preroll')).toBe('preroll');
    expect(suggestDeliverableType('prerolls')).toBe('preroll');
    expect(suggestDeliverableType('PREROLL')).toBe('preroll');
  });

  it('stream / streams → stream_integration (sin cambios)', () => {
    expect(suggestDeliverableType('stream')).toBe('stream_integration');
    expect(suggestDeliverableType('streams')).toBe('stream_integration');
  });

  it('video → video_youtube', () => {
    expect(suggestDeliverableType('video')).toBe('video_youtube');
    expect(suggestDeliverableType('vídeo')).toBe('video_youtube');
    expect(suggestDeliverableType('videos')).toBe('video_youtube');
  });

  it('short/reel/tiktok → short_reel_tiktok', () => {
    expect(suggestDeliverableType('short')).toBe('short_reel_tiktok');
    expect(suggestDeliverableType('reels')).toBe('short_reel_tiktok');
    expect(suggestDeliverableType('tiktok')).toBe('short_reel_tiktok');
  });

  it('story → story_instagram', () => {
    expect(suggestDeliverableType('story')).toBe('story_instagram');
    expect(suggestDeliverableType('stories')).toBe('story_instagram');
  });

  it('desconocido → otro', () => {
    expect(suggestDeliverableType('xyz')).toBe('otro');
    expect(suggestDeliverableType('')).toBe('otro');
  });
});

describe('extractSpreadsheetId — 6 formatos comunes', () => {
  it('URL /edit#gid=', () => {
    expect(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1abc-XYZ_123/edit#gid=0'),
    ).toBe('1abc-XYZ_123');
  });

  it('URL /edit?gid=', () => {
    expect(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1abc-XYZ_123/edit?gid=555'),
    ).toBe('1abc-XYZ_123');
  });

  it('URL /edit?usp=sharing', () => {
    expect(
      extractSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/1abc-XYZ_123/edit?usp=sharing',
      ),
    ).toBe('1abc-XYZ_123');
  });

  it('URL sin trailing slash', () => {
    expect(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1abc-XYZ_123'),
    ).toBe('1abc-XYZ_123');
  });

  it('URL con view mode', () => {
    expect(
      extractSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/1abc-XYZ_123/edit?rm=minimal#gid=1857713850',
      ),
    ).toBe('1abc-XYZ_123');
  });

  it('URL de la plantilla real "Jolu - KD"', () => {
    expect(
      extractSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/1TAT7kpcFBhb-MfED-P5QQ72Z7EyndCRMKNKAZ-Bd07k/edit?gid=1857713850#gid=1857713850',
      ),
    ).toBe('1TAT7kpcFBhb-MfED-P5QQ72Z7EyndCRMKNKAZ-Bd07k');
  });

  it('URL no válida → null', () => {
    expect(extractSpreadsheetId('https://example.com')).toBeNull();
    expect(extractSpreadsheetId('not a url')).toBeNull();
  });
});

describe('extractSheetGid', () => {
  it('extrae gid desde #gid=', () => {
    expect(
      extractSheetGid('https://docs.google.com/spreadsheets/d/1abc/edit#gid=1857713850'),
    ).toBe('1857713850');
  });

  it('extrae gid desde ?gid=', () => {
    expect(
      extractSheetGid('https://docs.google.com/spreadsheets/d/1abc/edit?gid=555'),
    ).toBe('555');
  });

  it('prefiere #gid= sobre ?gid= cuando ambos existen', () => {
    expect(
      extractSheetGid('https://docs.google.com/spreadsheets/d/1abc/edit?gid=111#gid=222'),
    ).toBe('222');
  });

  it('URL sin gid → null', () => {
    expect(extractSheetGid('https://docs.google.com/spreadsheets/d/1abc')).toBeNull();
  });
});

describe('normalizeUrl', () => {
  it('elimina params tracking', () => {
    const raw = 'https://twitch.tv/vod/1?utm_source=x&t=123&fbclid=xxx';
    const norm = normalizeUrl(raw);
    expect(norm).toBe('https://twitch.tv/vod/1');
  });

  it('elimina trailing slash', () => {
    expect(normalizeUrl('https://twitch.tv/vod/1/')).toBe('https://twitch.tv/vod/1');
  });

  it('lowercase host', () => {
    expect(normalizeUrl('https://TWITCH.TV/vod/1')).toBe('https://twitch.tv/vod/1');
  });

  it('mismo VOD en 2 formatos dedupea', () => {
    const a = normalizeUrl('https://twitch.tv/vod/1?utm_source=x');
    const b = normalizeUrl('https://twitch.tv/vod/1/');
    expect(a).toBe(b);
  });

  it('cadena vacía → null', () => {
    expect(normalizeUrl('   ')).toBeNull();
  });
});

describe('aggregateBlocksByType — agrupa por deliverableType con dedupe URL', () => {
  it('agrupa por primary spec', () => {
    const blocks = [
      {
        title: 'JOLU - Deal #1 - 3 Prerolls',
        talentName: 'JOLU',
        dealLabel: 'Deal #1',
        specs: [{ count: 3, rawType: 'Prerolls', suggestedType: 'preroll' }],
        startRow: 0, startCol: 0, headerRow: 1,
        linkColIndex: 0, contentColIndex: 1, numberColIndex: 2,
        endRow: 5,
        links: [
          { originalUrl: 'https://twitch.tv/a', rowIndex: 2 },
          { originalUrl: 'https://twitch.tv/b', rowIndex: 3 },
          { originalUrl: 'https://twitch.tv/c', rowIndex: 4 },
        ],
      },
    ];
    const { countsByType } = aggregateBlocksByType(blocks);
    expect(countsByType.get('preroll')).toBe(3);
  });

  it('dedupea URLs iguales dentro del mismo tipo', () => {
    const blocks = [
      {
        title: 'JOLU - Deal #1 - 5 Prerolls',
        talentName: 'JOLU',
        dealLabel: 'Deal #1',
        specs: [{ count: 5, rawType: 'Prerolls', suggestedType: 'preroll' }],
        startRow: 0, startCol: 0, headerRow: 1,
        linkColIndex: 0, contentColIndex: 1, numberColIndex: 2,
        endRow: 5,
        links: [
          { originalUrl: 'https://twitch.tv/vod/1?utm_source=a', rowIndex: 2 },
          { originalUrl: 'https://twitch.tv/vod/1/',      rowIndex: 3 },
          { originalUrl: 'https://twitch.tv/vod/2',       rowIndex: 4 },
        ],
      },
    ];
    const { countsByType } = aggregateBlocksByType(blocks);
    expect(countsByType.get('preroll')).toBe(2); // /1 dedupe con /1/
  });

  it('suma múltiples bloques del mismo tipo', () => {
    const mkBlock = (type: string, links: string[]) => ({
      title: 'x', talentName: 't', dealLabel: 'd',
      specs: [{ count: 1, rawType: type, suggestedType: type }],
      startRow: 0, startCol: 0, headerRow: 1,
      linkColIndex: 0, contentColIndex: 1, numberColIndex: 2, endRow: 5,
      links: links.map((u, i) => ({ originalUrl: u, rowIndex: i })),
    });
    const blocks = [
      mkBlock('preroll', ['https://twitch.tv/a', 'https://twitch.tv/b']),
      mkBlock('preroll', ['https://twitch.tv/c']),
    ];
    const { countsByType } = aggregateBlocksByType(blocks);
    expect(countsByType.get('preroll')).toBe(3);
  });
});

describe('normalizeTrackingSheetInput', () => {
  it('cadena vacía → todo null', () => {
    expect(normalizeTrackingSheetInput('')).toEqual({
      trackingSheetUrl: null,
      trackingSheetSpreadsheetId: null,
      trackingSheetGid: null,
    });
  });

  it('URL válida sin gid', () => {
    const r = normalizeTrackingSheetInput(
      'https://docs.google.com/spreadsheets/d/1abc/edit',
    );
    expect(r.trackingSheetUrl).toBe('https://docs.google.com/spreadsheets/d/1abc/edit');
    expect(r.trackingSheetSpreadsheetId).toBe('1abc');
    expect(r.trackingSheetGid).toBeNull();
  });

  it('URL válida con gid', () => {
    const r = normalizeTrackingSheetInput(
      'https://docs.google.com/spreadsheets/d/1abc/edit#gid=555',
    );
    expect(r.trackingSheetSpreadsheetId).toBe('1abc');
    expect(r.trackingSheetGid).toBe('555');
  });

  it('URL con espacios se trimma', () => {
    const r = normalizeTrackingSheetInput(
      '   https://docs.google.com/spreadsheets/d/1abc/edit   ',
    );
    expect(r.trackingSheetSpreadsheetId).toBe('1abc');
  });
});
