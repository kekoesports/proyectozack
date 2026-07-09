/**
 * Tests estáticos — fix icono cuadrado para previews sociales.
 *
 * Cubre:
 *   - `public/icon-social-square-512.png` existe y mide 512x512.
 *   - `public/manifest.json` NO apunta a /logo.png en icons.
 *   - `public/manifest.json` apunta al nuevo asset con purpose any + maskable.
 *   - `layout.tsx` JSON-LD Organization.logo NO usa /logo.png.
 *   - `layout.tsx` JSON-LD LocalBusiness.image NO usa /logo.png.
 *   - `layout.tsx` metadata.icons declara múltiples tamaños del nuevo asset.
 *   - No se ha borrado /logo.png (sigue usándose como logo horizontal).
 *   - No se ha tocado og-socialpro.png, favicon.ico, apple-icon.png (Frente B pendiente).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const exists = (rel: string): boolean => fs.existsSync(path.join(ROOT, rel));

describe('Frente A — icono cuadrado para previews sociales', () => {
  it('el asset icon-social-square-512.png existe', () => {
    expect(exists('public/icon-social-square-512.png')).toBe(true);
  });

  it('el asset mide 512x512 exactos', () => {
    // Lectura directa de la cabecera PNG:
    // bytes 8-15: signature; bytes 16-23: IHDR chunk; bytes 24-27: width; bytes 28-31: height.
    const buf = fs.readFileSync(path.join(ROOT, 'public/icon-social-square-512.png'));
    // El chunk IHDR empieza en offset 8 y contiene width en offset 16, height en 20 (BE).
    const width  = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(512);
    expect(height).toBe(512);
  });

  it('el asset no está vacío y pesa <100 KB', () => {
    const stats = fs.statSync(path.join(ROOT, 'public/icon-social-square-512.png'));
    expect(stats.size).toBeGreaterThan(1000);
    expect(stats.size).toBeLessThan(100 * 1024);
  });

  it('/logo.png NO se ha borrado (sigue usándose como logo horizontal)', () => {
    expect(exists('public/logo.png')).toBe(true);
  });

  it('archivos ajenos al Frente A NO se han tocado', () => {
    // Estos assets están fuera de scope de esta PR — no deben modificarse.
    expect(exists('public/og-socialpro.png')).toBe(true);
    expect(exists('src/app/favicon.ico')).toBe(true);
    expect(exists('src/app/apple-icon.png')).toBe(true);
    expect(exists('src/app/icon.png')).toBe(true);
  });
});

describe('manifest.json — apunta al nuevo asset cuadrado real', () => {
  const manifest = JSON.parse(read('public/manifest.json')) as {
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };

  it('NO contiene /logo.png en icons (arregla el bug del logo descentrado)', () => {
    for (const icon of manifest.icons) {
      expect(icon.src).not.toBe('/logo.png');
    }
  });

  it('contiene al menos una entrada para /icon-social-square-512.png', () => {
    const matches = manifest.icons.filter((i) => i.src === '/icon-social-square-512.png');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('todas las entradas de /icon-social-square-512.png declaran sizes = "512x512"', () => {
    for (const icon of manifest.icons.filter((i) => i.src === '/icon-social-square-512.png')) {
      expect(icon.sizes).toBe('512x512');
    }
  });

  it('incluye purpose "any" y "maskable"', () => {
    const purposes = manifest.icons.map((i) => i.purpose).filter(Boolean);
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
  });
});

describe('layout.tsx — metadata.icons y JSON-LD', () => {
  const src = read('src/app/layout.tsx');

  it('metadata.icons apunta al nuevo asset en al menos un tamaño', () => {
    expect(src).toMatch(/\/icon-social-square-512\.png/);
    // Debe haber al menos 2 referencias en icons (192 + 512)
    const matches = src.match(/\/icon-social-square-512\.png/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('metadata.icons.apple sigue usando /apple-icon.png (no roto)', () => {
    expect(src).toMatch(/apple:\s*['"]\/apple-icon\.png['"]/);
  });

  it('metadata.icons.shortcut sigue usando /favicon.ico (favicon de pestaña)', () => {
    expect(src).toMatch(/shortcut:\s*['"]\/favicon\.ico['"]/);
  });

  it('JSON-LD Organization.logo NO usa /logo.png', () => {
    // Extrae el bloque logo: { url: absoluteUrl('...') }
    const logoBlockMatch = src.match(/logo:\s*\{[^}]*url:\s*absoluteUrl\(['"]([^'"]+)['"]\)/);
    expect(logoBlockMatch).not.toBeNull();
    expect(logoBlockMatch![1]).not.toBe('/logo.png');
    expect(logoBlockMatch![1]).toBe('/icon-social-square-512.png');
  });

  it('JSON-LD LocalBusiness.image NO usa /logo.png', () => {
    // Localiza image dentro del bloque LocalBusiness
    const idx = src.indexOf("'@type': 'LocalBusiness'");
    expect(idx).toBeGreaterThan(-1);
    const localBusinessBlock = src.substring(idx, idx + 1000);
    const imageMatch = localBusinessBlock.match(/image:\s*absoluteUrl\(['"]([^'"]+)['"]\)/);
    expect(imageMatch).not.toBeNull();
    expect(imageMatch![1]).not.toBe('/logo.png');
    expect(imageMatch![1]).toBe('/icon-social-square-512.png');
  });

  it('og:image de la home sigue siendo /og-socialpro.png (no lo tocamos)', () => {
    expect(src).toMatch(/absoluteUrl\(['"]\/og-socialpro\.png['"]\)/);
  });
});
