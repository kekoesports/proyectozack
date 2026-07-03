/**
 * Contratos de la infra común de sorteos externos (PR-2a).
 *
 * Verifica:
 *   - Registry PROVIDERS bien formado (cada entry con todos los campos).
 *   - Cada logoAsset apunta a un archivo real en /public/images/brands/.
 *   - CREATOR_PROVIDER_BINDINGS coherente con PROVIDERS y con env.ts.
 *   - Slugs de bindings coinciden con PLATFORM_CREATOR_SLUGS.
 *   - Sin duplicados; sin providers desconocidos.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getProvider, listProviders } from '@/lib/external-giveaways/providers';
import {
  getCreatorBinding,
  isExternalCreator,
  listBoundCreatorSlugs,
} from '@/lib/external-giveaways/creator-bindings';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

const ROOT = path.resolve(__dirname, '..', '..', '..');

describe('[external-giveaways] PROVIDERS registry', () => {
  const keys = listProviders();

  it('incluye keydrop', () => {
    expect(keys).toContain('keydrop');
  });

  it('sin duplicados', () => {
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(keys)('provider "%s" tiene todos los campos requeridos', (key) => {
    const cfg = getProvider(key);
    expect(cfg).not.toBeNull();
    if (!cfg) return;
    expect(cfg.key).toBe(key);
    expect(typeof cfg.displayName).toBe('string');
    expect(cfg.displayName.length).toBeGreaterThan(0);
    expect(cfg.logoAsset).toMatch(/^\/images\/brands\/.+\.(png|jpg|webp|svg)$/);
    expect(cfg.listingUrl).toMatch(/^https:\/\//);
    expect(cfg.accentColor).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(cfg.revalidateSeconds).toBeGreaterThan(0);
    expect(typeof cfg.fetchForCreator).toBe('function');
  });

  it.each(keys)('provider "%s" tiene logoAsset que existe en /public', (key) => {
    const cfg = getProvider(key);
    if (!cfg) throw new Error('unreachable');
    const abs = path.join(ROOT, 'public', cfg.logoAsset.replace(/^\//, ''));
    expect(fs.existsSync(abs)).toBe(true);
  });

  it('getProvider retorna null para claves desconocidas', () => {
    expect(getProvider('nonexistent')).toBeNull();
    expect(getProvider('')).toBeNull();
  });
});

describe('[external-giveaways] CREATOR_PROVIDER_BINDINGS', () => {
  it('incluye zacketizor → keydrop', () => {
    const binding = getCreatorBinding('zacketizor');
    expect(binding).not.toBeNull();
    expect(binding?.provider).toBe('keydrop');
    expect(binding?.envKey).toBe('KEYDROP_ZACKETIZOR_API_KEY');
  });

  it('slugs con binding están en PLATFORM_CREATOR_SLUGS', () => {
    const slugs = listBoundCreatorSlugs();
    for (const slug of slugs) {
      expect([...PLATFORM_CREATOR_SLUGS]).toContain(slug);
    }
  });

  it('cada binding apunta a un provider existente en PROVIDERS', () => {
    const slugs = listBoundCreatorSlugs();
    for (const slug of slugs) {
      const b = getCreatorBinding(slug);
      expect(b).not.toBeNull();
      if (!b) continue;
      expect(getProvider(b.provider)).not.toBeNull();
    }
  });

  it('isExternalCreator true para bound, false para no bound', () => {
    expect(isExternalCreator('zacketizor')).toBe(true);
    expect(isExternalCreator('naow')).toBe(false);
    expect(isExternalCreator('huasopeek')).toBe(false);
    expect(isExternalCreator('todocs2')).toBe(false);
    expect(isExternalCreator('imantado')).toBe(false);
    expect(isExternalCreator('jolu')).toBe(false);
    expect(isExternalCreator('unknown-slug')).toBe(false);
  });
});

describe('[external-giveaways] envKey coincide con env.ts server block', () => {
  const envSrc = fs.readFileSync(path.join(ROOT, 'src/lib/env.ts'), 'utf-8');
  const slugs = listBoundCreatorSlugs();

  it.each(slugs)('binding "%s" tiene envKey declarada en env.ts', (slug) => {
    const b = getCreatorBinding(slug);
    if (!b) throw new Error('unreachable');
    // La env key debe aparecer declarada dentro del bloque server
    const serverBlock = /server:\s*\{[\s\S]*?\},/.exec(envSrc)?.[0] ?? '';
    expect(serverBlock).toContain(b.envKey);
  });

  it('ninguna envKey de binding vive en el bloque client de env.ts', () => {
    const clientBlock = /client:\s*\{[\s\S]*?\},/.exec(envSrc)?.[0] ?? '';
    for (const slug of slugs) {
      const b = getCreatorBinding(slug);
      if (!b) continue;
      expect(clientBlock).not.toContain(b.envKey);
    }
  });
});
