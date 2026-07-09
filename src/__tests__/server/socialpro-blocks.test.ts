import {
  parseDealTitle,
  parseDealSpecs,
  detectSocialProBlocks,
  suggestDeliverableType,
} from '@/lib/parsers/socialpro-blocks';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Pestaña STAXX: dos bloques horizontales
const STAXX_GRID: string[][] = [
  ['STAXX - Deal #1 - 15 Prerolls', '', '', '', 'STAXX - Deal #2 - 60 Prerolls', '', ''],
  ['CONTENT', 'nº', 'LINK', '', 'CONTENT', 'nº', 'LINK'],
  ['Preroll 1', '1', 'https://twitch.tv/videos/1111111111', '', 'Preroll 1', '1', 'https://twitch.tv/videos/9999999999'],
  ['Preroll 2', '2', 'https://twitch.tv/videos/2222222222', '', 'Preroll 2', '2', 'https://twitch.tv/videos/8888888888'],
  ['Preroll 3', '3', 'https://twitch.tv/videos/3333333333', '', '', '', ''],
];

// Pestaña TARIFA: tres bloques (dos horizontales + uno vertical debajo)
const TARIFA_GRID: string[][] = [
  ['TARIFA - Deal #1 - 2 Prerolls', '', '', '', 'TARIFA - Deal #2 - 9 Prerolls', '', ''],
  ['CONTENT', 'nº', 'LINK', '', 'CONTENT', 'nº', 'LINK'],
  ['Preroll 1', '1', 'https://twitch.tv/videos/111', '', 'Preroll 1', '1', 'https://twitch.tv/videos/901'],
  ['Preroll 2', '2', 'https://twitch.tv/videos/222', '', 'Preroll 2', '2', 'https://twitch.tv/videos/902'],
  ['', '', '', '', '', '', ''],
  // Bloque 3 debajo, columna 0
  ['TARIFA - Deal #3 - 1 Video + 30 Prerolls', '', ''],
  ['CONTENT', 'nº', 'LINK'],
  ['Video 1', '1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['Preroll 1', '2', 'https://twitch.tv/videos/301'],
];

// ── parseDealTitle ─────────────────────────────────────────────────────────────

describe('parseDealTitle', () => {
  it('parses a simple prerolls title', () => {
    const result = parseDealTitle('STAXX - Deal #1 - 15 Prerolls');
    expect(result).toEqual({
      talentName: 'STAXX',
      dealLabel: 'Deal #1',
      specsStr: '15 Prerolls',
    });
  });

  it('parses a compound specs title', () => {
    const result = parseDealTitle('TARIFA - Deal #3 - 1 Video + 30 Prerolls');
    expect(result).toEqual({
      talentName: 'TARIFA',
      dealLabel: 'Deal #3',
      specsStr: '1 Video + 30 Prerolls',
    });
  });

  it('returns null for a non-matching string', () => {
    expect(parseDealTitle('no es un título')).toBeNull();
    expect(parseDealTitle('')).toBeNull();
    expect(parseDealTitle('STAXX')).toBeNull();
  });

  it('handles em-dash as separator', () => {
    const result = parseDealTitle('STAXX – Deal #1 – 15 Prerolls');
    expect(result).not.toBeNull();
    expect(result?.talentName).toBe('STAXX');
  });
});

// ── parseDealSpecs ─────────────────────────────────────────────────────────────

describe('parseDealSpecs', () => {
  it('parses a single spec', () => {
    const result = parseDealSpecs('15 Prerolls');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      count: 15,
      rawType: 'Prerolls',
      suggestedType: 'preroll',
    });
  });

  it('parses compound specs with "+"', () => {
    const result = parseDealSpecs('1 Video + 30 Prerolls');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ count: 1, rawType: 'Video', suggestedType: 'video_youtube' });
    expect(result[1]).toMatchObject({ count: 30, rawType: 'Prerolls', suggestedType: 'preroll' });
  });

  it('parses a 60 prerolls spec', () => {
    const result = parseDealSpecs('60 Prerolls');
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(60);
    expect(result[0]?.suggestedType).toBe('preroll');
  });
});

// ── suggestDeliverableType ────────────────────────────────────────────────────

describe('suggestDeliverableType', () => {
  it('maps prerolls to preroll (post-PR2, antes stream_integration)', () => {
    expect(suggestDeliverableType('prerolls')).toBe('preroll');
    expect(suggestDeliverableType('Prerolls')).toBe('preroll');
    expect(suggestDeliverableType('preroll')).toBe('preroll');
  });

  it('maps video to video_youtube', () => {
    expect(suggestDeliverableType('video')).toBe('video_youtube');
    expect(suggestDeliverableType('Video')).toBe('video_youtube');
  });

  it('maps unknown types to otro', () => {
    expect(suggestDeliverableType('xyz')).toBe('otro');
    expect(suggestDeliverableType('unknown')).toBe('otro');
  });

  it('maps reel/short/tiktok to short_reel_tiktok', () => {
    expect(suggestDeliverableType('reel')).toBe('short_reel_tiktok');
    expect(suggestDeliverableType('short')).toBe('short_reel_tiktok');
    expect(suggestDeliverableType('tiktok')).toBe('short_reel_tiktok');
  });

  it('maps story to story_instagram', () => {
    expect(suggestDeliverableType('story')).toBe('story_instagram');
  });

  it('maps tweet/x to tweet_x', () => {
    expect(suggestDeliverableType('tweet')).toBe('tweet_x');
    expect(suggestDeliverableType('x')).toBe('tweet_x');
  });
});

// ── detectSocialProBlocks ─────────────────────────────────────────────────────

describe('detectSocialProBlocks', () => {
  describe('STAXX tab', () => {
    const result = detectSocialProBlocks(STAXX_GRID, 'STAXX');

    it('detects exactly 2 blocks', () => {
      expect(result.blocks).toHaveLength(2);
    });

    it('assigns correct tabName', () => {
      expect(result.tabName).toBe('STAXX');
    });

    it('Deal #1 has 3 links', () => {
      const block1 = result.blocks.find((b) => b.dealLabel === 'Deal #1');
      expect(block1).toBeDefined();
      expect(block1?.links).toHaveLength(3);
    });

    it('Deal #2 has 2 links', () => {
      const block2 = result.blocks.find((b) => b.dealLabel === 'Deal #2');
      expect(block2).toBeDefined();
      expect(block2?.links).toHaveLength(2);
    });

    it('does not mix Deal #1 and Deal #2 links', () => {
      const block1 = result.blocks.find((b) => b.dealLabel === 'Deal #1');
      const block2 = result.blocks.find((b) => b.dealLabel === 'Deal #2');
      const urls1 = block1?.links.map((l) => l.originalUrl) ?? [];
      const urls2 = block2?.links.map((l) => l.originalUrl) ?? [];
      // Deal #1 URLs should all start with /1111 /2222 /3333
      expect(urls1.every((u) => !u.includes('9999') && !u.includes('8888'))).toBe(true);
      // Deal #2 URLs should have 9999 and 8888
      expect(urls2.some((u) => u.includes('9999'))).toBe(true);
      expect(urls2.some((u) => u.includes('8888'))).toBe(true);
    });
  });

  describe('TARIFA tab', () => {
    const result = detectSocialProBlocks(TARIFA_GRID, 'TARIFA');

    it('detects exactly 3 blocks', () => {
      expect(result.blocks).toHaveLength(3);
    });

    it('Deal #1 has 2 links', () => {
      const block = result.blocks.find((b) => b.dealLabel === 'Deal #1');
      expect(block?.links).toHaveLength(2);
    });

    it('Deal #2 has 2 links', () => {
      const block = result.blocks.find((b) => b.dealLabel === 'Deal #2');
      expect(block?.links).toHaveLength(2);
    });

    it('Deal #3 (compound) is detected with 2 links and 2 specs', () => {
      const block = result.blocks.find((b) => b.dealLabel === 'Deal #3');
      expect(block).toBeDefined();
      expect(block?.specs).toHaveLength(2);
      expect(block?.links).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns empty blocks for a grid with no titles', () => {
      const grid = [
        ['CONTENT', 'nº', 'LINK'],
        ['Preroll 1', '1', 'https://twitch.tv/videos/1'],
      ];
      const result = detectSocialProBlocks(grid, 'empty');
      expect(result.blocks).toHaveLength(0);
    });

    it('block with 0 links returns links: [] without error', () => {
      const grid = [
        ['NOLINKS - Deal #1 - 5 Prerolls', '', ''],
        ['CONTENT', 'nº', 'LINK'],
        // no data rows
      ];
      const result = detectSocialProBlocks(grid, 'test');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]?.links).toHaveLength(0);
    });

    it('extracts valid Twitch and YouTube URLs', () => {
      const staxx = detectSocialProBlocks(STAXX_GRID, 'STAXX');
      const urls = staxx.blocks.flatMap((b) => b.links.map((l) => l.originalUrl));
      expect(urls.some((u) => u.includes('twitch.tv'))).toBe(true);

      const tarifa = detectSocialProBlocks(TARIFA_GRID, 'TARIFA');
      const tarifaUrls = tarifa.blocks.flatMap((b) => b.links.map((l) => l.originalUrl));
      expect(tarifaUrls.some((u) => u.includes('youtube.com'))).toBe(true);
    });

    it('does not include empty cells as links', () => {
      const result = detectSocialProBlocks(STAXX_GRID, 'STAXX');
      const allLinks = result.blocks.flatMap((b) => b.links.map((l) => l.originalUrl));
      expect(allLinks.every((u) => u.trim() !== '')).toBe(true);
    });
  });

  // ── claimedTitles dedup — same cell never processed twice ─────────────────
  describe('claimedTitles dedup', () => {
    it('calling detectSocialProBlocks twice on the same grid yields independent results (no shared state)', () => {
      const result1 = detectSocialProBlocks(STAXX_GRID, 'STAXX');
      const result2 = detectSocialProBlocks(STAXX_GRID, 'STAXX');
      expect(result1.blocks).toHaveLength(2);
      expect(result2.blocks).toHaveLength(2);
      expect(result1.blocks[0]?.links).toHaveLength(3);
      expect(result2.blocks[0]?.links).toHaveLength(3);
    });

    it('a duplicate title row at a different position is treated as a separate block, not merged', () => {
      // Row 0: valid block. Row 4: same title text again at same column → new block (different row key).
      // The first block stops at the empty row (row 3), so both can be detected independently.
      const grid: string[][] = [
        ['BRAND - Deal #1 - 2 Prerolls', '', ''],
        ['CONTENT', 'nº', 'LINK'],
        ['Preroll 1', '1', 'https://twitch.tv/videos/111'],
        ['', '', ''],                                           // empty row — ends block 1
        ['BRAND - Deal #1 - 2 Prerolls', '', ''],              // same title, new row → new block
        ['CONTENT', 'nº', 'LINK'],
        ['Preroll 2', '1', 'https://twitch.tv/videos/222'],
      ];
      const result = detectSocialProBlocks(grid, 'test');
      // Two separate blocks because they are at different (row, col) keys
      expect(result.blocks).toHaveLength(2);
      // No URL should appear in more than one block
      const allLinks = result.blocks.flatMap((b) => b.links.map((l) => l.originalUrl));
      const uniqueLinks = new Set(allLinks);
      expect(uniqueLinks.size).toBe(allLinks.length);
    });

    it('a title cell that was already claimed is not re-entered by a second scan pass', () => {
      // Single block — verify claimedTitles is working by ensuring only 1 block is detected
      // even though the same row/col would match the title regex on every pass
      const grid: string[][] = [
        ['ONLY - Deal #1 - 5 Prerolls', '', ''],
        ['CONTENT', 'nº', 'LINK'],
        ['Preroll 1', '1', 'https://twitch.tv/videos/1'],
        ['Preroll 2', '2', 'https://twitch.tv/videos/2'],
        ['Preroll 3', '3', 'https://twitch.tv/videos/3'],
      ];
      const result = detectSocialProBlocks(grid, 'test');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]?.links).toHaveLength(3);
    });
  });
});
