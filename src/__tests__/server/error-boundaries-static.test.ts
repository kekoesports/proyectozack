/**
 * Tests estáticos para los error boundaries (P2-08).
 *
 * Garantiza:
 *   1. Los 3 archivos existen: app/error.tsx, app/global-error.tsx,
 *      app/admin/(dashboard)/error.tsx
 *   2. Son client components ('use client').
 *   3. NUNCA renderizan `error.message` ni `error.stack` (solo `error.digest`).
 *   4. Console.error solo loggea metadata segura (digest, name), no message/stack.
 *   5. Exportan un componente default que acepta { error, reset }.
 *   6. global-error.tsx incluye <html> y <body> (requisito Next.js).
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
const exists = (rel: string): boolean => fs.existsSync(path.join(PROJECT_ROOT, rel));

const FILES = [
  'src/app/error.tsx',
  'src/app/global-error.tsx',
  'src/app/admin/(dashboard)/error.tsx',
] as const;

describe('Error boundaries — los 3 archivos existen', () => {
  for (const f of FILES) {
    it(`${f} existe`, () => {
      expect(exists(f)).toBe(true);
    });
  }
});

describe('Error boundaries — son client components', () => {
  for (const f of FILES) {
    it(`${f} declara 'use client' al inicio`, () => {
      const src = read(f);
      expect(src).toMatch(/^['"]use client['"];/);
    });
  }
});

describe('Error boundaries — NUNCA renderizan error.message ni error.stack', () => {
  for (const f of FILES) {
    it(`${f} NO contiene {error.message} en JSX`, () => {
      const src = read(f);
      expect(src).not.toMatch(/\{\s*error\.message\s*\}/);
      expect(src).not.toMatch(/\{\s*error\?\.message\s*\}/);
    });

    it(`${f} NO contiene {error.stack} en JSX`, () => {
      const src = read(f);
      expect(src).not.toMatch(/\{\s*error\.stack\s*\}/);
      expect(src).not.toMatch(/\{\s*error\?\.stack\s*\}/);
    });

    it(`${f} expone error.digest (única forma segura de mostrar)`, () => {
      const src = read(f);
      expect(src).toMatch(/error\.digest/);
    });
  }
});

describe('Error boundaries — console.error solo loggea metadata segura', () => {
  for (const f of FILES) {
    it(`${f} no loggea error.message ni error.stack a console`, () => {
      const src = read(f);
      // console.error('...', error) sería peligroso porque imprime todo el objeto.
      // El patrón seguro es console.error('tag', { name: error.name, digest: error.digest })
      expect(src).not.toMatch(/console\.error\(\s*['"][^'"]*['"]\s*,\s*error\s*\)/);
      expect(src).not.toMatch(/console\.error\(\s*error\s*\)/);
      expect(src).not.toMatch(/console\.error\([^)]{0,100}error\.message/);
      expect(src).not.toMatch(/console\.error\([^)]{0,100}error\.stack/);
    });
  }
});

describe('Error boundaries — firma del componente', () => {
  for (const f of FILES) {
    it(`${f} default export es una function/componente con prop { error, reset }`, () => {
      const src = read(f);
      expect(src).toMatch(/export\s+default\s+function/);
      // Acepta tanto { error, reset } como destructuring tipado
      expect(src).toMatch(/error\s*[:,]/);
      expect(src).toMatch(/reset\s*[:)]/);
    });
  }
});

describe('global-error.tsx — requisitos especiales de Next.js', () => {
  const src = read('src/app/global-error.tsx');

  it('incluye <html> en el render (reemplaza el root layout)', () => {
    expect(src).toMatch(/<html\b/);
  });

  it('incluye <body> en el render', () => {
    expect(src).toMatch(/<body\b/);
  });

  it('lang="es" en el <html> tag', () => {
    expect(src).toMatch(/lang=['"]es['"]/);
  });
});
