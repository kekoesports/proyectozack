import { classifyImportRows } from '@/lib/queries/deal-trackers';
import type { ParsedLinkRow } from '@/lib/schemas/deal-tracker';

const yt = (id: string, extra = ''): ParsedLinkRow => ({
  originalUrl: `https://www.youtube.com/watch?v=${id}${extra}`,
  sourceRowIndex: 1,
});

const ytShort = (id: string): ParsedLinkRow => ({
  originalUrl: `https://youtu.be/${id}?si=abc`,
  sourceRowIndex: 2,
});

describe('classifyImportRows', () => {
  // ── First pass ───────────────────────────────────────────────────────────────

  test('all new valid URLs → all valid, counts correct', () => {
    const rows: ParsedLinkRow[] = [
      yt('AAA11111111'),
      yt('BBB22222222'),
      { originalUrl: 'https://twitch.tv/videos/9876543210', sourceRowIndex: 3 },
    ];
    const { classified, inserted, duplicatesSkipped, invalidSkipped } = classifyImportRows(new Set(), rows);

    expect(inserted).toBe(3);
    expect(duplicatesSkipped).toBe(0);
    expect(invalidSkipped).toBe(0);
    expect(classified).toHaveLength(3);
    expect(classified.every((r) => r.status === 'valid')).toBe(true);
  });

  // ── Re-import (dedup) ─────────────────────────────────────────────────────────

  test('re-importing same URLs → zero new inserts, all duplicate', () => {
    const rows: ParsedLinkRow[] = [yt('AAA11111111'), yt('BBB22222222')];

    const first = classifyImportRows(new Set(), rows);
    const existingAfterFirst = new Set(first.classified.map((r) => r.normalizedUrl));

    const second = classifyImportRows(existingAfterFirst, rows);

    expect(second.inserted).toBe(0);
    expect(second.duplicatesSkipped).toBe(2);
    expect(second.invalidSkipped).toBe(0);
    expect(second.classified).toHaveLength(2);
    expect(second.classified.every((r) => r.status === 'duplicate')).toBe(true);
  });

  // ── YouTube dedup invariant ───────────────────────────────────────────────────

  test('youtu.be/ID and youtube.com/watch?v=ID → same normalizedUrl → second is duplicate', () => {
    const watchUrl: ParsedLinkRow = yt('dQw4w9WgXcQ', '&utm_source=share');
    const shortUrl: ParsedLinkRow = ytShort('dQw4w9WgXcQ');

    const { classified, inserted, duplicatesSkipped } = classifyImportRows(new Set(), [watchUrl, shortUrl]);

    expect(inserted).toBe(1);
    expect(duplicatesSkipped).toBe(1);
    expect(classified[0]?.status).toBe('valid');
    expect(classified[1]?.status).toBe('duplicate');
    expect(classified[0]?.normalizedUrl).toBe(classified[1]?.normalizedUrl);
  });

  // ── Mix new + pre-existing ────────────────────────────────────────────────────

  test('pre-existing URL in set → duplicate; fresh URL → valid', () => {
    const existingNormalized = 'https://youtube.com/watch?v=EXISTING1111';
    const rows: ParsedLinkRow[] = [
      { originalUrl: 'https://www.youtube.com/watch?v=EXISTING1111&si=xyz', sourceRowIndex: 1 },
      { originalUrl: 'https://www.youtube.com/watch?v=NEWVIDEO1111', sourceRowIndex: 2 },
    ];

    const { classified, inserted, duplicatesSkipped } = classifyImportRows(
      new Set([existingNormalized]),
      rows,
    );

    expect(inserted).toBe(1);
    expect(duplicatesSkipped).toBe(1);
    expect(classified.find((r) => r.originalUrl.includes('EXISTING'))?.status).toBe('duplicate');
    expect(classified.find((r) => r.originalUrl.includes('NEWVIDEO'))?.status).toBe('valid');
  });

  // ── Invalid URLs ──────────────────────────────────────────────────────────────

  test('invalid URLs → not in classified, invalidSkipped incremented', () => {
    const rows: ParsedLinkRow[] = [
      { originalUrl: 'not-a-url', sourceRowIndex: 1 },
      { originalUrl: '', sourceRowIndex: 2 },
      { originalUrl: 'https://example.com/random-site', sourceRowIndex: 3 },
    ];

    const { classified, inserted, duplicatesSkipped, invalidSkipped } = classifyImportRows(new Set(), rows);

    expect(invalidSkipped).toBe(3);
    expect(inserted).toBe(0);
    expect(duplicatesSkipped).toBe(0);
    expect(classified).toHaveLength(0);
  });

  // ── Empty input ───────────────────────────────────────────────────────────────

  test('empty rows array → all zeros, empty classified', () => {
    const { classified, inserted, duplicatesSkipped, invalidSkipped } = classifyImportRows(new Set(), []);

    expect(inserted).toBe(0);
    expect(duplicatesSkipped).toBe(0);
    expect(invalidSkipped).toBe(0);
    expect(classified).toHaveLength(0);
  });

  // ── Platform assignment ───────────────────────────────────────────────────────

  test('platform is assigned correctly per domain', () => {
    const rows: ParsedLinkRow[] = [
      { originalUrl: 'https://www.youtube.com/watch?v=AAA11111111', sourceRowIndex: 1 },
      { originalUrl: 'https://twitch.tv/videos/1234567890', sourceRowIndex: 2 },
      { originalUrl: 'https://kick.com/streamer/clips/clip_123', sourceRowIndex: 3 },
      { originalUrl: 'https://www.instagram.com/reel/ABC123/', sourceRowIndex: 4 },
      { originalUrl: 'https://www.tiktok.com/@user/video/1234567890123', sourceRowIndex: 5 },
    ];

    const { classified } = classifyImportRows(new Set(), rows);

    expect(classified[0]?.platform).toBe('youtube');
    expect(classified[1]?.platform).toBe('twitch');
    expect(classified[2]?.platform).toBe('kick');
    expect(classified[3]?.platform).toBe('instagram');
    expect(classified[4]?.platform).toBe('tiktok');
  });

  // ── Within-batch dedup ────────────────────────────────────────────────────────

  test('duplicate within the same batch (no pre-existing) → first is valid, rest are duplicate', () => {
    // dQw4w9WgXcQ is exactly 11 chars — required for the YouTube regex to canonicalize all forms
    const rows: ParsedLinkRow[] = [
      yt('dQw4w9WgXcQ', '&feature=share'),
      ytShort('dQw4w9WgXcQ'),
      { originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123', sourceRowIndex: 3 },
    ];

    const { classified, inserted, duplicatesSkipped } = classifyImportRows(new Set(), rows);

    expect(inserted).toBe(1);
    expect(duplicatesSkipped).toBe(2);
    expect(classified[0]?.status).toBe('valid');
    expect(classified[1]?.status).toBe('duplicate');
    expect(classified[2]?.status).toBe('duplicate');
  });

  // ── Metadata passthrough ──────────────────────────────────────────────────────

  test('contentDate and notes pass through to classified row', () => {
    const row: ParsedLinkRow = {
      originalUrl: 'https://www.youtube.com/watch?v=AAA11111111',
      contentDate: '2026-06-15',
      notes: 'Integración patrocinada',
      sourceRowIndex: 1,
    };

    const { classified } = classifyImportRows(new Set(), [row]);

    expect(classified[0]?.contentDate).toBe('2026-06-15');
    expect(classified[0]?.notes).toBe('Integración patrocinada');
    expect(classified[0]?.sourceRowIndex).toBe(1);
  });

  // ── Enrichment contract ────────────────────────────────────────────────────────

  test('duplicate row preserves deliverableSubtype (enables DB enrichment)', () => {
    // Simulates a row that already exists in DB but had no subtype.
    // The re-import now provides a subtype → classified preserves it so
    // importTrackerItems can UPDATE the existing row.
    const existingNorm = 'https://youtube.com/watch?v=AAA11111111';
    const row: ParsedLinkRow = {
      originalUrl: 'https://www.youtube.com/watch?v=AAA11111111',
      sourceRowIndex: 1,
      deliverableSubtype: 'dedicated_video',
    };

    const { classified, duplicatesSkipped } = classifyImportRows(new Set([existingNorm]), [row]);

    expect(duplicatesSkipped).toBe(1);
    expect(classified[0]?.status).toBe('duplicate');
    expect(classified[0]?.deliverableSubtype).toBe('dedicated_video');
  });

  test('valid rows have status=valid; importTrackerItems must NOT insert duplicate rows', () => {
    // Contract: only rows with status=valid should be inserted.
    // This test confirms classifyImportRows correctly separates new from existing.
    const rows: ParsedLinkRow[] = [
      { originalUrl: 'https://www.youtube.com/watch?v=NEWVIDEO1111', sourceRowIndex: 1, deliverableSubtype: 'dedicated_video' },
      { originalUrl: 'https://twitch.tv/videos/1234567890', sourceRowIndex: 2, deliverableSubtype: 'stream' },
    ];
    const existingNorm = 'https://youtube.com/watch?v=NEWVIDEO1111';

    const { classified, inserted, duplicatesSkipped } = classifyImportRows(new Set([existingNorm]), rows);

    expect(inserted).toBe(1);
    expect(duplicatesSkipped).toBe(1);
    const validRows = classified.filter((r) => r.status === 'valid');
    const dupRows   = classified.filter((r) => r.status === 'duplicate');
    expect(validRows).toHaveLength(1);
    expect(dupRows).toHaveLength(1);
    // Only valid rows should be inserted — duplicates preserved for enrichment only
    expect(validRows[0]?.originalUrl).toContain('twitch.tv');
    expect(dupRows[0]?.deliverableSubtype).toBe('dedicated_video');
  });
});
