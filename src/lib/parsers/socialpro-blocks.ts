// ── Types ─────────────────────────────────────────────────────────────────────

export type DealSpec = {
  count: number;
  rawType: string;
  suggestedType: string;
};

export type DetectedBlock = {
  title: string;
  talentName: string;
  dealLabel: string;
  specs: DealSpec[];
  startRow: number;
  startCol: number;
  headerRow: number;
  linkColIndex: number;
  contentColIndex: number;
  numberColIndex: number;
  endRow: number;
  links: Array<{ originalUrl: string; rowIndex: number }>;
};

export type TabDetectionResult = {
  tabName: string;
  blocks: DetectedBlock[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Pattern to detect a block title cell.
 * Format: "TALENT - Deal #N - <specs>"
 * Also handles em-dash (–) as separator.
 */
const BLOCK_TITLE_RE = /^(.+?)\s*[-–]\s*(Deal\s*#\d+)\s*[-–]\s*(.+)$/i;

/**
 * Fallback pattern for blocks where the talent name is omitted.
 * Format: "Deal #N - <specs>" — tab name is used as talent name.
 */
const BLOCK_TITLE_NO_TALENT_RE = /^(Deal\s*#\d+)\s*[-–]\s*(.+)$/i;

/** Maximum rows to look ahead for the header row after a title. */
const HEADER_LOOKAHEAD = 4;

/** Maximum cols to look ahead from the block's start column when finding header cells. */
const HEADER_COL_RANGE = 6;

// ── Public parsers ────────────────────────────────────────────────────────────

/**
 * Parses a block title string like "STAXX - Deal #1 - 15 Prerolls".
 * Returns null if the string doesn't match the expected format.
 */
export function parseDealTitle(
  title: string,
): { talentName: string; dealLabel: string; specsStr: string } | null {
  const match = BLOCK_TITLE_RE.exec(title.trim());
  if (!match) return null;
  return {
    talentName: match[1]?.trim() ?? '',
    dealLabel: match[2]?.trim() ?? '',
    specsStr: match[3]?.trim() ?? '',
  };
}

/**
 * Maps a raw deliverable type string to a canonical DELIVERABLE_TYPES enum value.
 */
export function suggestDeliverableType(rawType: string): string {
  const normalized = rawType.toLowerCase().trim();

  if (normalized === 'preroll' || normalized === 'prerolls') return 'stream_integration';
  if (normalized === 'stream' || normalized === 'streams') return 'stream_integration';
  if (
    normalized === 'video' ||
    normalized === 'vídeo' ||
    normalized === 'videos' ||
    normalized === 'vídeos'
  )
    return 'video_youtube';
  if (
    normalized === 'reel' ||
    normalized === 'reels' ||
    normalized === 'short' ||
    normalized === 'shorts' ||
    normalized === 'tiktok' ||
    normalized === 'tiktoks'
  )
    return 'short_reel_tiktok';
  if (normalized === 'story' || normalized === 'stories') return 'story_instagram';
  if (normalized === 'post' || normalized === 'posts') return 'post_instagram';
  if (normalized === 'tweet' || normalized === 'tweets' || normalized === 'x') return 'tweet_x';

  return 'otro';
}

/**
 * Parses a specs string like "15 Prerolls" or "1 Video + 30 Prerolls".
 * Returns an array of DealSpec objects.
 */
export function parseDealSpecs(specsStr: string): DealSpec[] {
  // Split on "+" to handle compound specs like "1 Video + 30 Prerolls"
  const parts = specsStr.split(/\s*\+\s*/);
  const results: DealSpec[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    // Expect format: "<number> <type>"
    const match = /^(\d+)\s+(.+)$/.exec(trimmed);
    if (!match) continue;

    const count = parseInt(match[1] ?? '0', 10);
    const rawType = match[2]?.trim() ?? '';
    if (!rawType || count <= 0) continue;

    results.push({
      count,
      rawType,
      suggestedType: suggestDeliverableType(rawType),
    });
  }

  return results;
}

// ── Block detection ───────────────────────────────────────────────────────────

/**
 * Finds the column index of a header keyword within a row, limited to a range.
 * Returns -1 if not found.
 */
function findHeaderCol(
  row: string[],
  keywords: string[],
  startCol: number,
  endCol: number,
): number {
  for (let c = startCol; c <= Math.min(endCol, row.length - 1); c++) {
    const cell = (row[c] ?? '').trim().toLowerCase();
    if (keywords.some((k) => cell === k)) return c;
  }
  return -1;
}

/**
 * Determines whether a row is completely empty within a column range.
 */
function isRowEmpty(row: string[] | undefined, startCol: number, endCol: number): boolean {
  if (!row) return true;
  for (let c = startCol; c <= Math.min(endCol, row.length - 1); c++) {
    if ((row[c] ?? '').trim() !== '') return false;
  }
  return true;
}

/**
 * Main parser. Scans every cell of a 2D grid looking for SocialPro-format
 * deal blocks and returns all detected blocks in reading order.
 *
 * A block title looks like: "TALENT - Deal #N - <specs>"
 * Immediately below the title (within HEADER_LOOKAHEAD rows) there must be a
 * header row containing at least a "LINK" column.
 */
export function detectSocialProBlocks(
  grid: string[][],
  tabName: string,
): TabDetectionResult {
  const blocks: DetectedBlock[] = [];
  // Track which (row, col) cells have already been claimed as title cells
  const claimedTitles = new Set<string>();

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').trim();
      if (!cell) continue;

      const titleKey = `${r}:${c}`;
      if (claimedTitles.has(titleKey)) continue;

      let parsed = parseDealTitle(cell);
      if (!parsed) {
        // Fallback: "Deal #N - specs" without talent name — use tab name instead
        const short = BLOCK_TITLE_NO_TALENT_RE.exec(cell.trim());
        if (!short) continue;
        parsed = {
          talentName: tabName,
          dealLabel: short[1]?.trim() ?? '',
          specsStr: short[2]?.trim() ?? '',
        };
      }

      // Found a title — search for the header row within HEADER_LOOKAHEAD rows
      let headerRow = -1;
      let linkColIndex = -1;
      let contentColIndex = -1;
      let numberColIndex = -1;

      const colRangeEnd = c + HEADER_COL_RANGE;

      for (let hr = r + 1; hr <= r + HEADER_LOOKAHEAD && hr < grid.length; hr++) {
        const hrow = grid[hr] ?? [];
        const linkIdx = findHeaderCol(hrow, ['link'], c, colRangeEnd);
        if (linkIdx >= 0) {
          headerRow = hr;
          linkColIndex = linkIdx;
          contentColIndex = findHeaderCol(
            hrow,
            ['content', 'contenido'],
            c,
            colRangeEnd,
          );
          numberColIndex = findHeaderCol(
            hrow,
            ['nº', 'numero', 'número', '#', 'no', 'num'],
            c,
            colRangeEnd,
          );
          break;
        }
      }

      // Skip title if no valid header row found
      if (headerRow < 0) continue;

      claimedTitles.add(titleKey);

      // Determine specs
      const specs = parseDealSpecs(parsed.specsStr);

      // Collect links from rows below the header until:
      // 1. Row is empty within the block column range, or
      // 2. Another block title is found, or
      // 3. End of grid
      const links: Array<{ originalUrl: string; rowIndex: number }> = [];
      let endRow = headerRow;

      for (let dr = headerRow + 1; dr < grid.length; dr++) {
        const drow = grid[dr] ?? [];

        // Check if this row starts another block title in this column
        const possibleTitle = (drow[c] ?? '').trim();
        if (possibleTitle && parseDealTitle(possibleTitle)) {
          // Another block starts — stop here
          break;
        }

        // Check emptiness across the block column range
        if (isRowEmpty(drow, c, colRangeEnd)) {
          break;
        }

        endRow = dr;

        // Extract link from the link column
        const rawUrl = (drow[linkColIndex] ?? '').trim();
        if (rawUrl) {
          links.push({ originalUrl: rawUrl, rowIndex: dr });
        }
      }

      blocks.push({
        title: cell,
        talentName: parsed.talentName,
        dealLabel: parsed.dealLabel,
        specs,
        startRow: r,
        startCol: c,
        headerRow,
        linkColIndex,
        contentColIndex: contentColIndex >= 0 ? contentColIndex : c,
        numberColIndex: numberColIndex >= 0 ? numberColIndex : c + 1,
        endRow,
        links,
      });
    }
  }

  return { tabName, blocks };
}
