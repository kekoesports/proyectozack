import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

/**
 * La ruta de evidencias desde Google Sheets marcaba TODA fila con una URL http(s)
 * como `status: 'valid'` y la sumaba al progreso, mientras que la ruta de import
 * manual (classifyImportRows en deal-trackers.ts) sí descarta lo que el
 * normalizador no reconoce.
 *
 * Consecuencia: cualquier enlace pegado en la hoja —el propio Google Sheet, un
 * Drive, un acortador— empujaba el trato hacia el 100%, disparaba los avisos
 * 70/80/100 y ponía el digest en `prepare_invoice`.
 *
 * Estos tests fijan el criterio que ahora comparten ambas rutas: sólo cuenta lo
 * que el normalizador reconoce como contenido de una plataforma.
 */

describe('validez de evidencia desde Sheets', () => {
  it('reconoce como válidas las URLs de plataformas de contenido', () => {
    const casos = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.twitch.tv/videos/123456789',
      'https://www.tiktok.com/@creador/video/7200000000000000000',
      'https://www.instagram.com/p/CxYzAbCdEfG/',
    ];
    for (const url of casos) {
      const r = normalizeContentUrl(url);
      expect(r.isValid).toBe(true);
      expect(r.platform).not.toBe('other');
    }
  });

  it('NO valida enlaces que no son contenido publicado', () => {
    // Exactamente lo que un creador pega por error en su hoja de seguimiento.
    const casos = [
      'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0',
      'https://drive.google.com/file/d/abc123/view',
      'https://example.com/cualquier-cosa',
      'https://bit.ly/3xYzAbC',
    ];
    for (const url of casos) {
      expect(normalizeContentUrl(url).isValid).toBe(false);
    }
  });

  it('el status que se persiste se deriva de isValid, no del hecho de ser http(s)', () => {
    // Réplica de la expresión de campaign-sheet-evidence.ts tras el fix.
    const statusDe = (url: string): 'valid' | 'invalid' =>
      normalizeContentUrl(url).isValid ? 'valid' : 'invalid';

    expect(statusDe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('valid');
    expect(statusDe('https://docs.google.com/spreadsheets/d/abc/edit')).toBe('invalid');
  });

  it('una hoja con solo enlaces no-contenido no aporta progreso', () => {
    const filas = [
      'https://docs.google.com/spreadsheets/d/abc/edit',
      'https://drive.google.com/file/d/xyz/view',
      'https://bit.ly/3abc',
    ];
    const efectivas = filas.filter((u) => normalizeContentUrl(u).isValid).length;
    expect(efectivas).toBe(0);
  });

  it('cuenta solo las piezas reales en una hoja mixta', () => {
    const filas = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // cuenta
      'https://docs.google.com/spreadsheets/d/abc/edit', // no
      'https://www.twitch.tv/videos/123456789', // cuenta
      'https://example.com/nota', // no
    ];
    const efectivas = filas.filter((u) => normalizeContentUrl(u).isValid).length;
    expect(efectivas).toBe(2);
  });
});
