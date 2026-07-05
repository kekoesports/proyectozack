/**
 * Guardrail de copy sensible — Fase 0 legal.
 *
 * Impide que términos de casino/apuestas ("wagering", "deposit", "bonus",
 * "apuesta", "multiplica", "jackpot", "case battle", "upgrader")
 * aparezcan en la UI de SocialPro Giveaways fuera de una allowlist
 * documentada. Ver `docs/legal/sensitive-copy-allowlist.md`.
 *
 * Alcance de análisis:
 *   - src/app/sorteos/**
 *   - src/features/giveaway-platform/**
 *
 * Excepciones (rutas NO analizadas — ver el documento de allowlist):
 *   - `__tests__/**` (verifican precisamente el gating).
 *   - Componentes BrandCard con variant `full` — copy que solo se
 *     renderiza en países donde el flag lo permite. Se marca con el
 *     comentario `// @allow-sensitive-copy: <razón>` en la línea o
 *     bloque próximo.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

const SENSITIVE_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bwagering\b/i,            label: 'wagering' },
  { pattern: /\bwager\b/i,               label: 'wager' },
  { pattern: /\bjackpot\b/i,             label: 'jackpot' },
  { pattern: /\bcase\s+battle\b/i,       label: 'case battle' },
  { pattern: /\bcase_battle\b/i,         label: 'case_battle' },
  { pattern: /\bupgrader\b/i,            label: 'upgrader' },
  { pattern: /\bgambling\b/i,            label: 'gambling' },
  { pattern: /\bgamble\b/i,              label: 'gamble' },
  { pattern: /\bcoin\s+flip\b/i,         label: 'coin flip' },
  { pattern: /\bmultiplica\b/i,          label: 'multiplica (verbo)' },
  { pattern: /\bmultiplicador\b/i,       label: 'multiplicador' },
  // "bonus", "deposit" y "apuesta" son sensibles pero muy comunes —
  // se validan de forma más conservadora en `sensitive-copy-strict.test.ts`
  // (fuera de este guardrail) y por análisis manual del reviewer.
];

/**
 * Marker que permite excepciones puntuales por línea/bloque:
 *   // @allow-sensitive-copy: partner CTA renderizada solo si flag ON
 *
 * Si una línea contiene copy sensible pero está precedida (en las 3
 * líneas previas) por este marker, la ocurrencia NO falla el test.
 */
const ALLOW_MARKER = /@allow-sensitive-copy:/;

/**
 * Componentes BrandCard*.tsx: contienen la variante `full` con copy
 * sensible por diseño. La ruta se excluye del análisis global — el
 * gating se cubre por tests dedicados
 * (`brand-cards-restricted-variant.test.ts`).
 */
const EXCLUDED_PATHS: readonly string[] = [
  'src/features/giveaway-platform/components/BrandCardKeyDrop.tsx',
  'src/features/giveaway-platform/components/BrandCardSkinsMonkey.tsx',
  'src/features/giveaway-platform/components/BrandCardCsgoskins.tsx',
  'src/features/giveaway-platform/components/BrandCardSkinClub.tsx',
];

const SCAN_ROOTS: readonly string[] = [
  'src/app/sorteos',
  'src/features/giveaway-platform',
];

function walk(dir: string, files: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(p, files);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(entry.name)) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
    const relative = path.relative(ROOT, p).replace(/\\/g, '/');
    if (EXCLUDED_PATHS.includes(relative)) continue;
    files.push(p);
  }
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    walk(abs, files);
  }
  return files;
}

function hasNearbyAllowMarker(lines: readonly string[], lineIndex: number): boolean {
  for (let i = Math.max(0, lineIndex - 3); i <= lineIndex; i += 1) {
    if (ALLOW_MARKER.test(lines[i] ?? '')) return true;
  }
  return false;
}

describe('sensitive-copy-allowlist — Fase 0 legal', () => {
  const files = collectFiles();

  it('detecta al menos 1 archivo en el scope de análisis', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(SENSITIVE_TERMS)('ningún término "$label" fuera de allowlist', ({ pattern, label }) => {
    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        if (!pattern.test(line)) continue;
        if (hasNearbyAllowMarker(lines, i)) continue;
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        violations.push(`${rel}:${i + 1}  →  ${line.trim().slice(0, 120)}`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Copy sensible "${label}" detectado sin marker "// @allow-sensitive-copy: <razón>":\n  ` +
        violations.join('\n  ') +
        `\n\nSi la ocurrencia es intencional, añade el marker en la línea anterior o ` +
        `revisa docs/legal/sensitive-copy-allowlist.md.`,
      );
    }
  });
});
