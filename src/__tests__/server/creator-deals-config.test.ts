/**
 * Config declarativa de deals por creador + rendering adaptativo.
 *
 * Regla dura del proyecto: nunca inventar partnerships. Un creador solo
 * puede mostrar cards de partners si tiene deal REAL confirmado en
 * `CREATOR_DEALS`. Los otros ven placeholder honesto.
 *
 * Estado real 2026-07-06:
 *   zacketizor → keydrop + csgoskins   ✅
 *   imantado   → keydrop                ✅
 *   naow       → keydrop                ✅
 *   huasopeek / todocs2 / jolu → sin deals
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CREATOR_DEALS,
  getCreatorDeals,
  hasAnyDeal,
} from '@/features/giveaway-platform/constants/creator-deals';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[creator-deals-config] roster y datos', () => {
  it('CREATOR_DEALS cubre exactamente los slugs de PLATFORM_CREATOR_SLUGS', () => {
    const dealKeys = Object.keys(CREATOR_DEALS).sort();
    const rosterKeys = [...PLATFORM_CREATOR_SLUGS].sort();
    expect(dealKeys).toEqual(rosterKeys);
  });

  it('zacketizor tiene exactamente keydrop + csgoskins (nada de skinsmonkey ni skinclub)', () => {
    expect([...CREATOR_DEALS.zacketizor].sort()).toEqual(['csgoskins', 'keydrop']);
  });

  it('imantado tiene exactamente keydrop (afiliado IMANTADO)', () => {
    expect([...CREATOR_DEALS.imantado].sort()).toEqual(['keydrop']);
  });

  it('naow tiene exactamente keydrop (afiliado NAOW)', () => {
    expect([...CREATOR_DEALS.naow].sort()).toEqual(['keydrop']);
  });

  it('huasopeek / todocs2 / jolu → sin deals confirmados ([])', () => {
    expect(CREATOR_DEALS.huasopeek).toEqual([]);
    expect(CREATOR_DEALS.todocs2).toEqual([]);
    expect(CREATOR_DEALS.jolu).toEqual([]);
  });

  it('martinez retirado — no aparece ni en el roster ni en la config', () => {
    expect([...PLATFORM_CREATOR_SLUGS]).not.toContain('martinez');
    expect((CREATOR_DEALS as Record<string, unknown>).martinez).toBeUndefined();
  });
});

describe('[creator-deals-config] helpers', () => {
  it('getCreatorDeals devuelve la lista o array vacío defensivo', () => {
    expect(getCreatorDeals('zacketizor').length).toBe(2);
    expect(getCreatorDeals('imantado').length).toBe(1);
    expect(getCreatorDeals('naow').length).toBe(1);
    expect(getCreatorDeals('huasopeek')).toEqual([]);
    expect(getCreatorDeals('nonexistent-slug')).toEqual([]);
  });

  it('hasAnyDeal true solo para creadores con al menos un partner', () => {
    expect(hasAnyDeal('zacketizor')).toBe(true);
    expect(hasAnyDeal('imantado')).toBe(true);
    expect(hasAnyDeal('naow')).toBe(true);
    for (const slug of ['huasopeek', 'todocs2', 'jolu']) {
      expect(hasAnyDeal(slug)).toBe(false);
    }
  });
});

describe('[creator-deals-config] BrandBonusesSection adaptativa', () => {
  const src = read('src/features/giveaway-platform/components/BrandBonusesSection.tsx');

  it('recibe creatorSlug además del creatorCode', () => {
    expect(src).toMatch(/interface Props\s*\{[\s\S]{0,200}creatorSlug:\s*string/);
    expect(src).toMatch(/interface Props\s*\{[\s\S]{0,200}creatorCode:\s*string/);
  });

  it('llama a getCreatorDeals para calcular las cards a renderizar', () => {
    expect(src).toMatch(/const\s+deals\s*=\s*getCreatorDeals\(creatorSlug\)/);
  });

  it('renderiza placeholder honesto cuando deals.length === 0', () => {
    expect(src).toMatch(/if\s*\(deals\.length\s*===\s*0\)/);
    expect(src).toMatch(/gp-bonuses-empty/);
    expect(src).toMatch(/Deals de partners próximamente/);
  });

  it('KeyDrop se renderiza aparte arriba solo si está en deals', () => {
    expect(src).toMatch(/const\s+hasKeyDrop\s*=\s*deals\.includes\('keydrop'\)/);
    expect(src).toMatch(/hasKeyDrop\s*\?\s*<BrandCardKeyDrop/);
  });

  it('resto de deals van en un grid adaptativo (.gp-grid-1 si 1, .gp-grid-2 si 2+)', () => {
    expect(src).toMatch(/otherDeals\.length\s*===\s*1\s*\?\s*'gp-grid-1'\s*:\s*'gp-grid-2'/);
  });

  it('nunca renderiza cards que no estén en la config del creador', () => {
    // El switch cubre las 4 BrandKey pero solo se llama con las que están
    // en `otherDeals`. Verificamos que no hay hard-coded fallbacks a
    // SkinsMonkey/Skin.Club fuera del switch.
    expect(src).not.toMatch(/<BrandCardSkinsMonkey\s+code=[^\}]/); // no fuera del map
    expect(src).not.toMatch(/<BrandCardSkinClub\s+code=[^\}]/);
  });
});

describe('[creator-deals-config] wiring en PlatformCreatorLanding', () => {
  const src = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');

  it('pasa creatorSlug además del creatorCode al BrandBonusesSection', () => {
    expect(src).toMatch(/<BrandBonusesSection\s+creatorSlug=\{active\.slug\}\s+creatorCode=\{activeVisual\.code\}/);
  });
});

describe('[creator-deals-config] CSS del placeholder + grids adaptativos', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-cards.css');

  it('.gp-grid-1 es una columna full-width', () => {
    expect(css).toMatch(/\.gp-grid-1\s*\{[\s\S]{0,200}grid-template-columns:\s*1fr\s*[;}]/);
  });

  it('.gp-grid-2 colapsa a 1 columna en <=720px (mobile)', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]{0,300}\.gp-grid-2\s*\{[\s\S]{0,120}1fr/);
  });

  it('placeholder honesto con dashed border', () => {
    expect(css).toMatch(/\.gp-bonuses-empty-inner\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
    expect(css).toMatch(/\.gp-bonuses-empty-body\s+b\s*\{[\s\S]{0,200}color:\s*var\(--gold\)/);
  });
});
