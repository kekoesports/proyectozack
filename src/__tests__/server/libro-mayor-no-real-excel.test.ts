/**
 * Guardián: el Libro Mayor real de la gestoría NUNCA debe estar en el repo.
 *
 * Comprueba dos cosas:
 *   1. No hay ficheros trackeados en git con nombre de LM real.
 *   2. .gitignore incluye los patrones de refuerzo.
 *   3. .scratch/ sigue gitignored.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..', '..', '..');

describe('libro-mayor — el Excel real NUNCA está en el repo', () => {
  it('git ls-files no contiene ningún archivo LM real (excluyendo fixtures sintéticos)', () => {
    let output = '';
    try {
      output = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' });
    } catch {
      // fuera de git (CI sin git) — skip
      return;
    }
    // Filtrar líneas de fixtures sintéticos legítimos antes de comprobar.
    const trackedFiles = output.split('\n').filter((line) => !line.includes('__fixtures__/'));
    const lower = trackedFiles.join('\n').toLowerCase();
    expect(lower).not.toMatch(/libro[_ -]mayor.*\.(xlsx|ods|xls)/);
    expect(lower).not.toMatch(/libro-mayor-20\d\d.*\.(xlsx|ods)/);
    expect(lower).not.toMatch(/-elevatex-.*\.(xlsx|ods)/);
  });

  it('.gitignore incluye patrones de refuerzo', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toMatch(/LIBRO MAYOR/i);
    expect(gitignore).toMatch(/libro-mayor-20/);
    expect(gitignore).toMatch(/\.scratch\//);
  });

  it('el fixture sintético NO se parece al LM real (nombres TEST_)', () => {
    const fixtureJson = fs.readFileSync(
      path.join(ROOT, 'src/features/libro-mayor/__fixtures__/sample-ledger.json'),
      'utf-8'
    );
    const parsed = JSON.parse(fixtureJson) as {
      readonly metadata: { readonly empresa: string };
      readonly accounts: ReadonlyArray<{ readonly name: string }>;
    };
    expect(parsed.metadata.empresa).toBe('TEST COMPANY SL');
    for (const acc of parsed.accounts) {
      expect(acc.name.startsWith('TEST_')).toBe(true);
    }
  });
});
