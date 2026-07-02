/**
 * Contratos de integración de la sección de sorteos externos en page.tsx.
 * Post-refactor PR-2a: verificamos que ya NO hay hardcode de slug ni de
 * provider en el server component principal.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[external-giveaways] page.tsx uses generic binding, no hardcoded slug', () => {
  const src = read('src/app/sorteos/plataforma/page.tsx');

  it('importa isExternalCreator y getExternalGiveawaysForCreator', () => {
    expect(src).toMatch(/import\s+\{\s*isExternalCreator\s*\}/);
    expect(src).toMatch(/import\s+\{\s*getExternalGiveawaysForCreator\s*\}/);
  });

  it('define isExternal = isExternalCreator(active.slug)', () => {
    expect(src).toMatch(/const\s+isExternal\s*=\s*isExternalCreator\(active\.slug\)/);
  });

  it('NO usa comparación literal active.slug === "zacketizor"', () => {
    expect(src).not.toMatch(/active\.slug\s*===\s*'zacketizor'/);
    expect(src).not.toMatch(/active\.slug\s*===\s*"zacketizor"/);
  });

  it('para creadores externos NO carga sorteos internos del CRM', () => {
    expect(src).toMatch(/const\s+giveawaysData\s*=\s*isExternal[\s\S]{0,80}\[\][\s\S]{0,120}getGiveawaysWithEntryData/);
  });

  it('para creadores externos oculta la <section id="sorteos"> interna', () => {
    expect(src).toMatch(/isExternal\s*\?\s*null\s*:\s*\(\s*<section\s+id="sorteos"/);
  });

  it('llama getExternalGiveawaysForCreator(active.slug) solo si isExternal', () => {
    expect(src).toMatch(/isExternal[\s\S]{0,80}getExternalGiveawaysForCreator\(active\.slug\)/);
  });

  it('renderiza <ExternalGiveawaysSection> con sections + creatorDisplayName', () => {
    expect(src).toMatch(/<ExternalGiveawaysSection\s+sections=\{externalSections\}\s+creatorDisplayName=\{active\.name\}/);
  });
});

describe('[external-giveaways] no monedas / no tickets internos', () => {
  const filesToCheck = [
    'src/lib/external-giveaways/types.ts',
    'src/lib/external-giveaways/providers.ts',
    'src/lib/external-giveaways/creator-bindings.ts',
    'src/lib/external-giveaways/client-factory.ts',
    'src/lib/external-giveaways/providers/keydrop/zod-schemas.ts',
    'src/lib/external-giveaways/providers/keydrop/fetch.ts',
    'src/lib/external-giveaways/providers/keydrop/mapper.ts',
    'src/lib/queries/externalGiveaways.ts',
    'src/features/giveaway-platform/components/ExternalGiveawaysSection.tsx',
    'src/features/giveaway-platform/components/ExternalGiveawayCard.tsx',
  ];
  for (const rel of filesToCheck) {
    it(`${rel} no referencia coin_transactions / giveaway_entries / mission_claims`, () => {
      const src = read(rel);
      // Filtro fuera de líneas de comentarios JSDoc para permitir docs
      const codeOnly = src
        .split('\n')
        .filter((l) => !/^\s*\*/.test(l) && !/^\s*\/\/\s/.test(l))
        .join('\n');
      expect(codeOnly).not.toMatch(/coinTransactions/);
      expect(codeOnly).not.toMatch(/coin_transactions/);
      expect(codeOnly).not.toMatch(/giveawayEntries/);
      expect(codeOnly).not.toMatch(/giveaway_entries/);
      expect(codeOnly).not.toMatch(/missionClaims/);
      expect(codeOnly).not.toMatch(/mission_claims/);
    });
  }
});

describe('[external-giveaways] no importa DB desde módulos external', () => {
  const filesToCheck = [
    'src/lib/external-giveaways/types.ts',
    'src/lib/external-giveaways/providers.ts',
    'src/lib/external-giveaways/creator-bindings.ts',
    'src/lib/external-giveaways/client-factory.ts',
    'src/lib/external-giveaways/providers/keydrop/zod-schemas.ts',
    'src/lib/external-giveaways/providers/keydrop/fetch.ts',
    'src/lib/external-giveaways/providers/keydrop/mapper.ts',
    'src/lib/queries/externalGiveaways.ts',
  ];
  for (const rel of filesToCheck) {
    it(`${rel} no importa @/lib/db ni @/db/schema`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
      expect(src).not.toMatch(/from\s+['"]@\/db\/schema/);
    });
  }
});

describe('[external-giveaways] UI del ExternalGiveawaysSection + Card', () => {
  const sectionSrc = read('src/features/giveaway-platform/components/ExternalGiveawaysSection.tsx');
  const cardSrc = read('src/features/giveaway-platform/components/ExternalGiveawayCard.tsx');

  it('Section devuelve null si status !== "ok"', () => {
    expect(sectionSrc).toMatch(/if\s*\(sections\.status\s*!==\s*'ok'\)\s*return\s*null/);
  });

  it('Section devuelve null si no hay providerKey', () => {
    expect(sectionSrc).toMatch(/if\s*\(!sections\.providerKey\)\s*return\s*null/);
  });

  it('Section devuelve null si no hay sorteos', () => {
    expect(sectionSrc).toMatch(/sections\.active\.length\s*===\s*0\s*&&\s*sections\.finished\.length\s*===\s*0[\s\S]{0,40}return\s*null/);
  });

  it('Section resuelve badge/CTA/displayName vía getProvider (dinámico, no hardcoded)', () => {
    expect(sectionSrc).toMatch(/getProvider\(sections\.providerKey\)/);
    expect(sectionSrc).toMatch(/provider\.displayName/);
    expect(sectionSrc).toMatch(/provider\.logoAsset/);
  });

  it('Card abre en nueva pestaña con rel noopener noreferrer', () => {
    expect(cardSrc).toMatch(/target="_blank"[\s\S]{0,80}rel="noopener noreferrer"/);
  });

  it('Card NO tiene ninguna clase .gp-keydrop-* residual', () => {
    expect(cardSrc).not.toMatch(/gp-keydrop-/);
    expect(sectionSrc).not.toMatch(/gp-keydrop-/);
  });
});

describe('[external-giveaways] layout carga el CSS renombrado', () => {
  const src = read('src/app/sorteos/plataforma/layout.tsx');
  it('platform-external-giveaways.css se importa desde el layout', () => {
    expect(src).toMatch(/import\s+['"]\.\/platform-external-giveaways\.css['"]/);
  });
  it('platform-keydrop.css ya NO se importa', () => {
    expect(src).not.toMatch(/platform-keydrop\.css/);
  });
});

describe('[external-giveaways] next.config.ts', () => {
  const src = read('next.config.ts');
  it('cdnkd.com sigue en remotePatterns (KeyDrop CDN)', () => {
    expect(src).toMatch(/hostname:\s*'cdnkd\.com'/);
  });
});
