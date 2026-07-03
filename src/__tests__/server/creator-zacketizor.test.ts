/**
 * PR-1c-0: ZACKETIZOR está registrado consistentemente en la plataforma.
 *
 * Verifica los 3 puntos de acoplamiento:
 *   - PLATFORM_CREATOR_SLUGS incluye 'zacketizor' (server whitelist).
 *   - PLATFORM_CREATOR_VISUALS['zacketizor'] existe con code='ZACKCSGO'.
 *   - Sin fugas del código promocional real en fuentes no relacionadas.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PLATFORM_CREATOR_SLUGS,
} from '@/lib/giveaway-platform/constants';
import {
  PLATFORM_CREATOR_VISUALS,
  getCreatorVisual,
} from '@/features/giveaway-platform/constants/creators';

const ROOT = path.resolve(__dirname, '..', '..', '..');

describe('[creator-zacketizor] server whitelist', () => {
  it('PLATFORM_CREATOR_SLUGS incluye zacketizor', () => {
    expect([...PLATFORM_CREATOR_SLUGS]).toContain('zacketizor');
  });

  it('roster actual (2026-07-03): 6 slugs sin martinez, con todocs2/imantado/jolu', () => {
    expect([...PLATFORM_CREATOR_SLUGS].sort()).toEqual(
      ['huasopeek', 'imantado', 'jolu', 'naow', 'todocs2', 'zacketizor'],
    );
    // martinez fue retirado.
    expect([...PLATFORM_CREATOR_SLUGS]).not.toContain('martinez');
    const asSet = new Set(PLATFORM_CREATOR_SLUGS);
    expect(asSet.size).toBe(PLATFORM_CREATOR_SLUGS.length);
  });
});

describe('[creator-zacketizor] visual config', () => {
  it('PLATFORM_CREATOR_VISUALS tiene entrada zacketizor', () => {
    expect(PLATFORM_CREATOR_VISUALS.zacketizor).toBeDefined();
  });

  it('display name / code / sub esperados', () => {
    const v = PLATFORM_CREATOR_VISUALS.zacketizor;
    expect(v?.code).toBe('ZACKCSGO');
    expect(v?.sub).toMatch(/CS/i);
    expect(typeof v?.emoji).toBe('string');
    expect(typeof v?.color).toBe('string');
    expect(v?.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('getCreatorVisual(zacketizor) devuelve la config real, no fallback', () => {
    const v = getCreatorVisual('zacketizor');
    expect(v.code).toBe('ZACKCSGO');
    // El fallback usaría code = slug.toUpperCase() = 'ZACKETIZOR'.
    expect(v.code).not.toBe('ZACKETIZOR');
  });

  it('cada slug del whitelist tiene entrada en VISUALS', () => {
    for (const slug of PLATFORM_CREATOR_SLUGS) {
      expect(PLATFORM_CREATOR_VISUALS[slug]).toBeDefined();
    }
  });
});

describe('[creator-zacketizor] no leaks de promocode fuera de creators.ts', () => {
  // El código promocional real ZACKCSGO no debe aparecer:
  //   - hardcoded en archivos de UI (page.tsx, componentes)
  //   - hardcoded en tests distintos a este
  //   - hardcoded en docs públicos
  // Sí debe aparecer en creators.ts (fuente autoritativa) y en este test.
  const forbidden = [
    'src/app/sorteos/plataforma/page.tsx',
    'src/features/giveaway-platform/components/PlatformNav.tsx',
    'src/features/giveaway-platform/components/PlatformHero.tsx',
    'src/features/giveaway-platform/components/BrandBonusesSection.tsx',
    'README.md',
    'CLAUDE.md',
  ];
  for (const rel of forbidden) {
    it(`${rel} no menciona ZACKCSGO`, () => {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return; // ok si el archivo no existe
      const src = fs.readFileSync(abs, 'utf-8');
      expect(src).not.toMatch(/ZACKCSGO/);
    });
  }
});
