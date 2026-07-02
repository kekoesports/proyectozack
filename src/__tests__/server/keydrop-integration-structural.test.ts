/**
 * Contratos estructurales de la integración KeyDrop en /sorteos/plataforma.
 *
 * Verifica que:
 *   - page.tsx solo llama KeyDrop cuando active.slug === 'zacketizor'.
 *   - No hay coin_transactions ni giveaway_entries desde el flujo KeyDrop.
 *   - cdnkd.com en remotePatterns de next.config.
 *   - Component no expone tokens.
 *   - Botón Ver sorteo abre en nueva pestaña (target=_blank + rel).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[keydrop-integration] page.tsx', () => {
  const src = read('src/app/sorteos/plataforma/page.tsx');

  it('importa la query y el component KeyDrop', () => {
    expect(src).toMatch(/import\s+\{\s*KeydropGiveawaysSection\s*\}/);
    expect(src).toMatch(/import\s+\{\s*getKeydropZacketizorGiveaways/);
  });

  it('solo llama getKeydropZacketizorGiveaways si active.slug === "zacketizor"', () => {
    expect(src).toMatch(/active\.slug\s*===\s*'zacketizor'\s*\?\s*getKeydropZacketizorGiveaways/);
  });

  it('el fallback devuelve status not_configured (no lanza)', () => {
    expect(src).toMatch(/status:\s*'not_configured'/);
  });

  it('renderiza <KeydropGiveawaysSection> pasando keydropSections y creatorDisplayName', () => {
    expect(src).toMatch(/<KeydropGiveawaysSection\s+sections=\{keydropSections\}\s+creatorDisplayName=\{active\.name\}/);
  });
});

describe('[keydrop-integration] no monedas / no tickets internos', () => {
  const filesToCheck = [
    'src/lib/keydrop/client.ts',
    'src/lib/keydrop/mappers.ts',
    'src/lib/keydrop/types.ts',
    'src/lib/queries/keydropGiveaways.ts',
    'src/features/giveaway-platform/components/KeydropGiveawaysSection.tsx',
  ];
  for (const rel of filesToCheck) {
    it(`${rel} no toca coin_transactions / giveaway_entries / mission_claims`, () => {
      const src = read(rel);
      // Filtro fuera de comentarios (JSDoc `*` líneas) para permitir
      // documentación que describe qué NO toca este módulo.
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

describe('[keydrop-integration] no importa DB desde módulos KeyDrop', () => {
  const filesToCheck = [
    'src/lib/keydrop/client.ts',
    'src/lib/keydrop/mappers.ts',
    'src/lib/keydrop/types.ts',
    'src/lib/queries/keydropGiveaways.ts',
  ];
  for (const rel of filesToCheck) {
    it(`${rel} no importa @/lib/db ni @/db/schema`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
      expect(src).not.toMatch(/from\s+['"]@\/db\/schema/);
    });
  }
});

describe('[keydrop-integration] next.config.ts', () => {
  const src = read('next.config.ts');
  it('cdnkd.com está en remotePatterns', () => {
    expect(src).toMatch(/hostname:\s*'cdnkd\.com'/);
  });
  it('wildcard *.cdnkd.com está en remotePatterns', () => {
    expect(src).toMatch(/hostname:\s*'\*\.cdnkd\.com'/);
  });
});

describe('[keydrop-integration] UI del component', () => {
  const src = read('src/features/giveaway-platform/components/KeydropGiveawaysSection.tsx');

  it('devuelve null si status !== "ok" (degradación silenciosa)', () => {
    expect(src).toMatch(/if\s*\(sections\.status\s*!==\s*'ok'\)\s*return\s*null/);
  });

  it('devuelve null si no hay sorteos', () => {
    expect(src).toMatch(/sections\.active\.length\s*===\s*0\s*&&\s*sections\.finished\.length\s*===\s*0[\s\S]{0,40}return\s*null/);
  });

  it('botón "Ver sorteo" abre en nueva pestaña con rel noopener noreferrer', () => {
    // <a target="_blank" rel="noopener noreferrer" ...
    expect(src).toMatch(/target="_blank"[\s\S]{0,80}rel="noopener noreferrer"/);
  });

  it('renderiza badge KeyDrop con /images/brands/keydrop.png', () => {
    expect(src).toMatch(/\/images\/brands\/keydrop\.png/);
  });

  it('finalizados en <details> collapsible', () => {
    expect(src).toMatch(/<details[\s\S]{0,120}<summary/);
  });
});

describe('[keydrop-integration] layout carga el CSS', () => {
  const src = read('src/app/sorteos/plataforma/layout.tsx');
  it('platform-keydrop.css se importa desde el layout', () => {
    expect(src).toMatch(/import\s+['"]\.\/platform-keydrop\.css['"]/);
  });
});
