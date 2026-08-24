/**
 * Puebla el índice portable desde el JSON de `inventory-vercel-blob.ts`.
 *
 * No mueve ni borra objetos. Sin `--apply` solo valida y muestra el resumen.
 *
 *   npx tsx scripts/backfill-entity-asset-index.ts inventario.json
 *   npx tsx scripts/backfill-entity-asset-index.ts inventario.json --apply
 */
import { readFile } from 'node:fs/promises';

import { closeDbPool } from '@/lib/db';
import {
  registerEntityAsset,
  type EntityAssetKind,
} from '@/lib/queries/entityAssets';

type InventoryObject = {
  readonly pathname: string;
  readonly uploadedAt: string;
};

type Inventory = {
  readonly stores: Record<string, readonly InventoryObject[]>;
};

type Candidate = {
  readonly kind: EntityAssetKind;
  readonly entityId: number;
  readonly storageKey: string;
  readonly contentType: string;
  readonly createdAt: Date;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

const LEGACY_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly kind: EntityAssetKind;
}> = [
  { pattern: /^talents\/(\d+)-\d+\.([a-z0-9]+)$/i, kind: 'talent_photo' },
  { pattern: /^team\/(\d+)-\d+\.([a-z0-9]+)$/i, kind: 'team_photo' },
  { pattern: /^brands\/(\d+)-\d+\.([a-z0-9]+)$/i, kind: 'brand_logo' },
];

export function candidateFromInventory(object: InventoryObject): Candidate | null {
  for (const { pattern, kind } of LEGACY_PATTERNS) {
    const match = pattern.exec(object.pathname);
    if (!match) continue;
    const entityId = Number(match[1]);
    const extension = match[2]?.toLowerCase() ?? '';
    const contentType = MIME_BY_EXTENSION[extension];
    const createdAt = new Date(object.uploadedAt);
    if (!Number.isInteger(entityId) || entityId <= 0 || !contentType || isNaN(createdAt.getTime())) {
      return null;
    }
    return {
      kind,
      entityId,
      storageKey: object.pathname,
      contentType,
      createdAt,
    };
  }
  return null;
}

async function main(): Promise<void> {
  const inventoryPath = process.argv.find((arg) => !arg.startsWith('--') && arg.endsWith('.json'));
  if (!inventoryPath) throw new Error('indica la ruta del inventario JSON');
  const apply = process.argv.includes('--apply');
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8')) as Inventory;

  const candidates = Object.values(inventory.stores)
    .flat()
    .map(candidateFromInventory)
    .filter((candidate): candidate is Candidate => candidate !== null);
  const unique = [...new Map(candidates.map((candidate) => [candidate.storageKey, candidate])).values()];

  if (apply) {
    for (const candidate of unique) await registerEntityAsset(candidate);
  }

  const byKind = Object.fromEntries(
    (['talent_photo', 'team_photo', 'brand_logo'] as const).map((kind) => [
      kind,
      unique.filter((candidate) => candidate.kind === kind).length,
    ]),
  );
  console.error(apply ? 'Índice aplicado.' : 'Dry run: no se ha escrito en la base de datos.');
  process.stdout.write(JSON.stringify({ total: unique.length, byKind, applied: apply }, null, 2));
}

if (process.argv[1]?.includes('backfill-entity-asset-index')) {
  main()
    .catch((error) => {
      console.error('FALLO:', error instanceof Error ? error.message : 'error');
      process.exitCode = 1;
    })
    .finally(() => closeDbPool());
}
