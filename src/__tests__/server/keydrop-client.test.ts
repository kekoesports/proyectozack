/**
 * KeyDrop API client — verificaciones estructurales.
 *
 * NO ejecuta requests reales (no hay clave en el entorno de test). Verifica
 * contratos por inspección de código:
 *   - env var es server-only y opcional.
 *   - x-api-key va en header, NUNCA en URL.
 *   - jamás se loggea la key ni el header completo.
 *   - timeout implementado.
 *   - fallback silencioso si falta env.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[keydrop] env var declaración', () => {
  const src = read('src/lib/env.ts');
  it('KEYDROP_ZACKETIZOR_API_KEY vive en el bloque server', () => {
    expect(src).toMatch(/server:\s*\{[\s\S]*KEYDROP_ZACKETIZOR_API_KEY[\s\S]*\},/);
  });
  it('KEYDROP_ZACKETIZOR_API_KEY es opcional (no crashea sin ella)', () => {
    expect(src).toMatch(/KEYDROP_ZACKETIZOR_API_KEY:\s*z\.string\(\)\.min\(1\)\.optional\(\)/);
  });
  it('KEYDROP_ZACKETIZOR_API_KEY NO aparece en el bloque client', () => {
    const clientBlock = /client:\s*\{[\s\S]*?\},/.exec(src)?.[0] ?? '';
    expect(clientBlock).not.toMatch(/KEYDROP/);
  });
  it('runtimeEnv incluye la mapping', () => {
    expect(src).toMatch(/KEYDROP_ZACKETIZOR_API_KEY:\s*process\.env\.KEYDROP_ZACKETIZOR_API_KEY/);
  });
});

describe('[keydrop] client contratos de seguridad', () => {
  const src = read('src/lib/keydrop/client.ts');

  it('usa x-api-key header, JAMÁS en URL query', () => {
    expect(src).toMatch(/'x-api-key':\s*apiKey/);
    // No debe aparecer nada como ?api_key= o &key= en URLs
    expect(src).not.toMatch(/\?api_key=/);
    expect(src).not.toMatch(/&key=/);
    expect(src).not.toMatch(/\?key=/);
  });

  it('nunca loggea `apiKey` ni contenido de header', () => {
    // Ningún console.* debe recibir apiKey o el header completo
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*apiKey/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*x-api-key/i);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*Authorization/i);
  });

  it('implementa timeout con AbortController', () => {
    expect(src).toMatch(/AbortController/);
    expect(src).toMatch(/FETCH_TIMEOUT_MS|setTimeout\([^)]*,\s*\d{4,}/);
  });

  it('gate por env: sin key devuelve not_configured', () => {
    expect(src).toMatch(/if\s*\(!apiKey\)\s*return\s*\{\s*ok:\s*false,\s*error:\s*'not_configured'/);
  });

  it('cache Next revalidate configurado', () => {
    expect(src).toMatch(/next:\s*\{\s*revalidate:\s*REVALIDATE_SECONDS/);
    expect(src).toMatch(/REVALIDATE_SECONDS\s*=\s*60/);
  });

  it('usa BASE_URL fijo (no construido con env)', () => {
    expect(src).toMatch(/BASE_URL\s*=\s*'https:\/\/ws-2071\.socket-cs\.com\/v1\/giveaway-user'/);
  });

  it('errores clasificados sin leak de body', () => {
    // Los console.warn solo indican el tipo de error + path, nunca el body
    expect(src).toMatch(/console\.warn\(`\[keydrop\] fetch \$\{path\} shape_mismatch`\)/);
    expect(src).toMatch(/console\.warn\(`\[keydrop\] fetch \$\{path\} http_\$\{res\.status\}`\)/);
  });
});

describe('[keydrop] client shape', () => {
  const src = read('src/lib/keydrop/client.ts');

  it('exporta fetchKeydropList y fetchKeydropGiveaway', () => {
    expect(src).toMatch(/export async function fetchKeydropList/);
    expect(src).toMatch(/export async function fetchKeydropGiveaway\(id: string\)/);
  });
  it('exporta isKeydropConfigured para gate UI', () => {
    expect(src).toMatch(/export function isKeydropConfigured/);
  });
  it('encodeURIComponent aplicado al id del detail', () => {
    expect(src).toMatch(/encodeURIComponent\(id\)/);
  });
});

describe('[keydrop] no leak en UI/queries', () => {
  const uiFiles = [
    'src/features/giveaway-platform/components/KeydropGiveawaysSection.tsx',
    'src/lib/queries/keydropGiveaways.ts',
    'src/lib/keydrop/mappers.ts',
    'src/lib/keydrop/types.ts',
  ];
  for (const rel of uiFiles) {
    it(`${rel} no referencia KEYDROP_ZACKETIZOR_API_KEY ni env.KEYDROP`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/KEYDROP_ZACKETIZOR_API_KEY/);
      expect(src).not.toMatch(/env\.KEYDROP/);
      // Ningún tipo debe exponer un campo llamado `apiKey`, `token`, etc.
      expect(src).not.toMatch(/apiKey:\s*string/);
    });
  }
});
