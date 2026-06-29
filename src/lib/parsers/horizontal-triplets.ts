// Parses Google Sheets grids where each row contains horizontal triplets:
// (label | number | url) repeated N times across the row.
// Used for KEYDROP-style sheets with columns like:
//   Dedicated video | nº | LINK | Preroll | nº | LINK | Stream | nº | LINK

export type DeliverableSubtype = 'dedicated_video' | 'preroll' | 'stream';

export type TripletLink = {
  readonly originalUrl: string;
  readonly rowIndex: number;
  readonly subtype: DeliverableSubtype | null;
};

function labelToSubtype(label: string): DeliverableSubtype | null {
  const n = label.toLowerCase().trim();
  // "dedicated video 1", "Dedicated Video", "Video dedicado"
  if (n.includes('dedicated') || n.startsWith('video') || n.startsWith('vídeo')) {
    return 'dedicated_video';
  }
  // "Preroll 1", "prerolls"
  if (n.startsWith('preroll')) return 'preroll';
  // "Stream 1", "Livestream 2", "streams"
  if (n.startsWith('stream') || n.startsWith('livestream')) return 'stream';
  return null;
}

function looksLikeUrl(cell: string): boolean {
  return cell.startsWith('http://') || cell.startsWith('https://') || cell.startsWith('www.');
}

function looksLikeQuantity(cell: string): boolean {
  return /^\d+$/.test(cell.trim());
}

function isHeaderCell(cell: string): boolean {
  const n = cell.toLowerCase().trim();
  return n === 'link' || n === 'nº' || n === '#' || n === 'num' || n === 'número' || n === 'numero';
}

/**
 * Scans a 2D grid row-by-row for horizontal triplets (label | number | url).
 * A triplet is valid when:
 *   - cell[c]   is a non-empty string that is not a URL and not a header keyword
 *   - cell[c+1] looks like an integer quantity
 *   - cell[c+2] looks like a URL (http/https/www)
 * When a triplet is found the scanner jumps c+=3; otherwise c+=1.
 * Header rows (containing "link", "nº", etc.) are skipped.
 */
export function parseHorizontalTriplets(grid: string[][]): TripletLink[] {
  const links: TripletLink[] = [];

  for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row) continue;

    let col = 0;
    while (col <= row.length - 3) {
      const labelCell  = (row[col]     ?? '').trim();
      const numberCell = (row[col + 1] ?? '').trim();
      const urlCell    = (row[col + 2] ?? '').trim();

      if (
        labelCell &&
        !isHeaderCell(labelCell) &&
        !looksLikeUrl(labelCell) &&
        looksLikeQuantity(numberCell) &&
        looksLikeUrl(urlCell)
      ) {
        links.push({
          originalUrl: urlCell,
          rowIndex: rowIdx,
          subtype: labelToSubtype(labelCell),
        });
        col += 3;
      } else {
        col += 1;
      }
    }
  }

  return links;
}
