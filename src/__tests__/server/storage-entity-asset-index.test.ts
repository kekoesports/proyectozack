import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

describe('índice portable de fotos y logos', () => {
  it.each([
    ['src/app/api/talent-photo/[id]/route.ts', 'talent_photo'],
    ['src/app/api/team-photo/[id]/route.ts', 'team_photo'],
    ['src/app/api/brand-logo/[id]/route.ts', 'brand_logo'],
  ])('%s usa el índice y no lista Vercel Blob directamente', (path, kind) => {
    const source = read(path);
    expect(source).toContain('streamEntityAsset');
    expect(source).toContain(`kind: '${kind}'`);
    expect(source).not.toContain("from '@vercel/blob'");
  });

  it.each([
    ['src/app/admin/(dashboard)/talents/fotos/actions.ts', 'talent_photo'],
    ['src/app/admin/(dashboard)/equipo/fotos/actions.ts', 'team_photo'],
    ['src/app/admin/(dashboard)/brands/logo-action.ts', 'brand_logo'],
  ])('%s escribe mediante el proveedor portable y registra la clave', (path, kind) => {
    const source = read(path);
    expect(source).toContain('uploadFile');
    expect(source).toContain('registerEntityAsset');
    expect(source).toContain(`kind: '${kind}'`);
    expect(source).not.toContain("from '@vercel/blob'");
  });

  it('incluye migración, restricción única y backfill reversible', () => {
    const migration = read('drizzle/0133_entity_asset_index.sql');
    const backfill = read('scripts/backfill-entity-asset-index.ts');
    expect(migration).toContain('entity_assets_storage_key_uq');
    expect(backfill).toContain("process.argv.includes('--apply')");
    expect(backfill).toContain('Dry run');
    expect(backfill).not.toMatch(/\bdelete\b|\bdel\(/i);
  });
});
