/**
 * Contratos de seguridad del provider KeyDrop tras el refactor PR-2a.
 *
 * Los invariantes de fetch (x-api-key en header, no en URL; no logs de key;
 * cache Next per-region; timeout) ahora viven en el client-factory genérico.
 * Aquí verificamos que:
 *   - client-factory respeta las reglas de seguridad universales.
 *   - fetch.ts de KeyDrop pasa apiKey solo por config, jamás en URL.
 *   - ningún archivo del provider loggea la key.
 *   - env.ts declara KEYDROP_ZACKETIZOR_API_KEY y KEYDROP_IMANTADO_API_KEY
 *     como server-only + optional.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[keydrop-provider] env var declaración', () => {
  const src = read('src/lib/env.ts');
  const KEYS = ['KEYDROP_ZACKETIZOR_API_KEY', 'KEYDROP_IMANTADO_API_KEY'] as const;

  it.each(KEYS)('%s vive en el bloque server', (key) => {
    expect(src).toMatch(new RegExp(`server:\\s*\\{[\\s\\S]*${key}[\\s\\S]*\\},`));
  });
  it.each(KEYS)('%s es opcional', (key) => {
    expect(src).toMatch(new RegExp(`${key}:\\s*z\\.string\\(\\)\\.min\\(1\\)\\.optional\\(\\)`));
  });
  it('NO aparece KEYDROP en el bloque client', () => {
    const clientBlock = /client:\s*\{[\s\S]*?\},/.exec(src)?.[0] ?? '';
    expect(clientBlock).not.toMatch(/KEYDROP/);
  });
  it.each(KEYS)('runtimeEnv incluye la mapping de %s', (key) => {
    expect(src).toMatch(new RegExp(`${key}:\\s*process\\.env\\.${key}`));
  });
});

describe('[keydrop-provider] client-factory reglas de seguridad', () => {
  const src = read('src/lib/external-giveaways/client-factory.ts');

  it('usa el authHeader dinámico, JAMÁS interpola apiKey en URL', () => {
    expect(src).toMatch(/\[authHeader\]:\s*apiKey/);
    expect(src).not.toMatch(/\?api_key=/);
    expect(src).not.toMatch(/&api_key=/);
    expect(src).not.toMatch(/\?apiKey=/);
    expect(src).not.toMatch(/\$\{apiKey\}/);
  });

  it('nunca loggea apiKey ni authHeader ni body de la respuesta', () => {
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*apiKey/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*authHeader/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*body/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*Authorization/i);
  });

  it('implementa timeout con AbortController', () => {
    expect(src).toMatch(/AbortController/);
    expect(src).toMatch(/setTimeout\(/);
    expect(src).toMatch(/timeoutMs/);
  });

  it('gate por env: sin key devuelve not_configured', () => {
    expect(src).toMatch(/if\s*\(!apiKey\)\s*return\s*\{\s*ok:\s*false,\s*error:\s*'not_configured'/);
  });

  it('cache Next revalidate con providerKey como tag', () => {
    expect(src).toMatch(/next:\s*\{\s*revalidate:\s*revalidateSeconds[\s\S]{0,80}tags:\s*\[providerKey\]/);
  });

  it('errores clasificados sin leak de body', () => {
    expect(src).toMatch(/console\.warn\(`\[\$\{providerKey\}\] fetch \$\{path\} shape_mismatch`\)/);
    expect(src).toMatch(/console\.warn\(`\[\$\{providerKey\}\] fetch \$\{path\} http_\$\{res\.status\}`\)/);
  });
});

describe('[keydrop-provider] fetch.ts sigue el patrón seguro', () => {
  const src = read('src/lib/external-giveaways/providers/keydrop/fetch.ts');

  it('exporta fetchKeydropForCreator', () => {
    expect(src).toMatch(/export\s+async\s+function\s+fetchKeydropForCreator/);
  });

  it('exporta KEYDROP_CONFIG usada por el registry', () => {
    expect(src).toMatch(/export\s+const\s+KEYDROP_CONFIG:\s*ProviderConfig/);
  });

  it('usa safeExternalFetch (client-factory), no fetch directo', () => {
    expect(src).toMatch(/safeExternalFetch\(/);
    expect(src).not.toMatch(/await\s+fetch\(/);
  });

  it('pasa el apiKey por config, nunca en URL/query', () => {
    expect(src).toMatch(/apiKey,/);
    expect(src).not.toMatch(/\?api_key=/);
    expect(src).not.toMatch(/\$\{apiKey\}/);
  });

  it('authHeader = "x-api-key"', () => {
    expect(src).toMatch(/authHeader:\s*'x-api-key'/);
  });

  it('externalUrl se construye en el mapper con id + promoCode (deep link)', () => {
    // Tras el diagnóstico HEAD de 2026-07 el mapper genera la URL con
    // buildKeydropDeepLink. fetch.ts no debe seguir teniendo el builder legacy.
    expect(src).not.toMatch(/function\s+buildKeydropExternalUrl/);
    // Fetch delega en el mapper — pasa solo item + creatorSlug.
    expect(src).toMatch(/keydropItemToCard\(\{\s*item,\s*creatorSlug\s*\}\)/);
  });

  it('el listing URL de la config es el dominio actual keydrop.com (no legacy)', () => {
    expect(src).toMatch(/https:\/\/keydrop\.com\/es\/giveaways/);
    expect(src).not.toMatch(/https:\/\/key-drop\.com/);
  });

  it('providerKey en safeExternalFetch = "keydrop"', () => {
    expect(src).toMatch(/providerKey:\s*'keydrop'/);
  });
});

describe('[keydrop-provider] no leak en UI/queries/mapper', () => {
  const files = [
    'src/features/giveaway-platform/components/ExternalGiveawayCard.tsx',
    'src/features/giveaway-platform/components/ExternalGiveawaysSection.tsx',
    'src/lib/queries/externalGiveaways.ts',
    'src/lib/external-giveaways/providers/keydrop/mapper.ts',
    'src/lib/external-giveaways/providers/keydrop/zod-schemas.ts',
  ];
  for (const rel of files) {
    it(`${rel} no referencia envs KEYDROP_* ni env.KEYDROP`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/KEYDROP_ZACKETIZOR_API_KEY/);
      expect(src).not.toMatch(/KEYDROP_IMANTADO_API_KEY/);
      expect(src).not.toMatch(/env\.KEYDROP/);
      expect(src).not.toMatch(/apiKey:\s*string/);
    });
  }
});
