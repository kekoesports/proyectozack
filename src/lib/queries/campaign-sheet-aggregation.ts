import { suggestDeliverableType, type DetectedBlock } from '@/lib/parsers/socialpro-blocks';
import { canonicalEvidenceUrl } from '@/lib/utils/url-normalizer';

export type SheetEvidence = {
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly rowIndex: number;
};

/** Single normalizer: Sheets, import, n8n and forms share `normalizeContentUrl`. */
export function normalizeUrl(raw: string): string | null {
  return canonicalEvidenceUrl(raw);
}

/** Agrupa evidencias HTTP(S) únicas; una URL solo puede contar una vez por trato. */
export function aggregateBlocksByType(blocks: readonly DetectedBlock[]): {
  countsByType: Map<string, number>;
  evidenceByType: Map<string, SheetEvidence[]>;
  totalBlocks: number;
} {
  const evidenceByType = new Map<string, SheetEvidence[]>();
  const seenEvidence = new Set<string>();
  const seenTypes = new Set<string>();

  for (const block of blocks) {
    for (const spec of block.specs) seenTypes.add(spec.suggestedType);
    const primarySpec = block.specs[0];
    if (!primarySpec) continue;
    const type = primarySpec.suggestedType;
    const bucket = evidenceByType.get(type) ?? [];
    for (const link of block.links) {
      const normalizedUrl = normalizeUrl(link.originalUrl);
      if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl) || seenEvidence.has(normalizedUrl)) {
        continue;
      }
      seenEvidence.add(normalizedUrl);
      bucket.push({ originalUrl: link.originalUrl, normalizedUrl, rowIndex: link.rowIndex });
    }
    evidenceByType.set(type, bucket);
  }

  const countsByType = new Map<string, number>();
  for (const type of seenTypes) {
    countsByType.set(type, evidenceByType.get(type)?.length ?? 0);
  }
  return { countsByType, evidenceByType, totalBlocks: blocks.length };
}

const CANONICAL_KNOWN_STATUSES = new Set([
  'pendiente',
  'en curso',
  'entregado',
  'aprobado',
  'rechazado',
]);

function normalizeCanonicalCell(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalHeaderIndexes(row: readonly string[]): {
  id: number;
  type: number;
  status: number;
  evidence: number;
} | null {
  const normalized = row.map(normalizeCanonicalCell);
  const id = normalized.indexOf('id');
  const type = normalized.indexOf('tipo de contenido');
  const status = normalized.indexOf('estado');
  const evidence = normalized.findIndex((cell) => cell === 'enlace / evidencia');
  if (id < 0 || type < 0 || status < 0 || evidence < 0) return null;
  return { id, type, status, evidence };
}

export type CanonicalDealTableAggregation = {
  readonly matched: boolean;
  readonly countsByType: Map<string, number>;
  readonly evidenceByType: Map<string, SheetEvidence[]>;
  readonly totalRows: number;
  readonly completedRows: number;
  readonly invalidRows: number;
};

/**
 * Lee `DealDeliverables`. Una pieza cuenta por enlace HTTP(S), incluso si el
 * creador olvidó cambiar Pendiente a Entregado. Rechazado nunca cuenta.
 */
export function aggregateCanonicalDealTable(
  grid: readonly (readonly string[])[],
): CanonicalDealTableAggregation {
  let headerRow = -1;
  let indexes: ReturnType<typeof canonicalHeaderIndexes> = null;
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
    const found = canonicalHeaderIndexes(grid[rowIndex] ?? []);
    if (!found) continue;
    headerRow = rowIndex;
    indexes = found;
    break;
  }

  if (headerRow < 0 || !indexes) {
    return {
      matched: false,
      countsByType: new Map(),
      evidenceByType: new Map(),
      totalRows: 0,
      completedRows: 0,
      invalidRows: 0,
    };
  }

  const evidenceByType = new Map<string, SheetEvidence[]>();
  const seenEvidence = new Set<string>();
  let totalRows = 0;
  let invalidRows = 0;

  for (let rowIndex = headerRow + 1; rowIndex < grid.length; rowIndex++) {
    const row = grid[rowIndex] ?? [];
    const id = (row[indexes.id] ?? '').trim();
    const rawType = (row[indexes.type] ?? '').trim();
    const rawStatus = (row[indexes.status] ?? '').trim();
    const originalUrl = (row[indexes.evidence] ?? '').trim();
    if (!id && !rawType && !rawStatus && !originalUrl) continue;
    if (!id || !rawType) {
      invalidRows++;
      continue;
    }

    totalRows++;
    const type = suggestDeliverableType(rawType);
    const evidence = evidenceByType.get(type) ?? [];
    evidenceByType.set(type, evidence);
    const status = normalizeCanonicalCell(rawStatus);
    if (!CANONICAL_KNOWN_STATUSES.has(status)) {
      invalidRows++;
      continue;
    }
    if (status === 'rechazado') continue;

    const normalizedUrl = normalizeUrl(originalUrl);
    if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
      if (originalUrl) invalidRows++;
      continue;
    }
    if (seenEvidence.has(normalizedUrl)) continue;
    seenEvidence.add(normalizedUrl);
    evidence.push({ originalUrl, normalizedUrl, rowIndex });
  }

  const countsByType = new Map<string, number>();
  let completedRows = 0;
  for (const [type, evidence] of evidenceByType.entries()) {
    countsByType.set(type, evidence.length);
    completedRows += evidence.length;
  }
  return { matched: true, countsByType, evidenceByType, totalRows, completedRows, invalidRows };
}
