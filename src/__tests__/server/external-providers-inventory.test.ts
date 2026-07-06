/**
 * Inventario de providers externos confirmados.
 *
 * Salvaguarda contra "provider fantasma": si alguien añade un binding, una
 * env var o una entry en el registry sin actualizar el doc de onboarding
 * (docs/external-giveaways-provider-onboarding.md) y sin OK del owner,
 * este test lo detecta.
 *
 * Hoy (2026-07-06) los partnerships confirmados son
 *   zacketizor → KeyDrop → ZACKCSGO
 *   imantado   → KeyDrop → IMANTADO
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[external-providers-inventory] estado real 2026-07-06', () => {
  it('ProviderKey enum en types.ts SOLO incluye providers en producción — csgoroll/hellcase siguen comentados', () => {
    const src = read('src/lib/external-giveaways/types.ts');
    // Enum activo: solo keydrop hoy.
    expect(src).toMatch(/export type ProviderKey\s*=\s*[\s\S]{0,120}\|\s*'keydrop';/);
    // Los "próximos" quedan como comentario, nunca activos sin datos confirmados.
    expect(src).toMatch(/\/\/\s*\|\s*'csgoroll'/);
    expect(src).toMatch(/\/\/\s*\|\s*'hellcase'/);
    // Ningún alias suelto sin comentar.
    expect(src).not.toMatch(/^\s*\|\s*'(csgoroll|hellcase|datdrop|csgoempire|skinsmonkey|gamerpay)'/m);
  });

  it('registry en providers.ts solo tiene la entry `keydrop`', () => {
    const src = read('src/lib/external-giveaways/providers.ts');
    // Cuenta las claves del REGISTRY: exactamente 1 hoy.
    const registryBlock = /const REGISTRY:\s*Record<ProviderKey,\s*ProviderConfig>\s*=\s*\{([\s\S]*?)\};/.exec(src)?.[1] ?? '';
    // Debe listar keydrop.
    expect(registryBlock).toMatch(/\bkeydrop\s*:/);
    // No debe listar otros providers sin cobertura de datos confirmados.
    expect(registryBlock).not.toMatch(/\b(csgoroll|hellcase|datdrop|csgoempire|skinsmonkey|gamerpay)\s*:/);
  });

  it('creator-bindings.ts mapea zacketizor + imantado a keydrop, nada más', () => {
    const src = read('src/lib/external-giveaways/creator-bindings.ts');
    expect(src).toMatch(/^\s*zacketizor\s*:/m);
    expect(src).toMatch(/^\s*imantado\s*:/m);
    expect(src).toMatch(/provider:\s*'keydrop'/);
    // Ni bindings "de prueba" para otros creadores.
    for (const slug of ['naow', 'huasopeek', 'todocs2', 'jolu']) {
      // Aparecer en un comentario o import está OK; aparecer como key de binding no.
      expect(src).not.toMatch(new RegExp(`^\\s*${slug}\\s*:`, 'm'));
    }
  });

  it('env.ts declara KEYDROP_ZACKETIZOR + KEYDROP_IMANTADO (patrón <PROVIDER>_<CREATOR>_API_KEY)', () => {
    const src = read('src/lib/env.ts');
    expect(src).toMatch(/KEYDROP_ZACKETIZOR_API_KEY:\s*z\.string\(\)\.min\(1\)\.optional\(\)/);
    expect(src).toMatch(/KEYDROP_IMANTADO_API_KEY:\s*z\.string\(\)\.min\(1\)\.optional\(\)/);
    // No debe haber otras claves siguiendo el patrón sin OK del owner.
    const keys = Array.from(src.matchAll(/^\s*([A-Z][A-Z0-9_]+_API_KEY)\s*:/gm)).map((m) => m[1]!);
    // dedupe — env.ts declara cada key dos veces: en `server:` y en `runtimeEnv:`.
    const unique = Array.from(new Set(keys));
    const external = unique.filter((k) => /^(KEYDROP|CSGOROLL|HELLCASE|DATDROP|CSGOEMPIRE|SKINSMONKEY|GAMERPAY)_/.test(k)).sort();
    expect(external).toEqual(['KEYDROP_IMANTADO_API_KEY', 'KEYDROP_ZACKETIZOR_API_KEY']);
  });

  it('doc de onboarding existe y refleja el estado real', () => {
    const doc = read('docs/external-giveaways-provider-onboarding.md');
    // Tabla de estado con partnerships confirmados.
    expect(doc).toMatch(/zacketizor[\s\S]{0,140}KeyDrop[\s\S]{0,140}ZACKCSGO/);
    expect(doc).toMatch(/imantado[\s\S]{0,140}KeyDrop[\s\S]{0,140}IMANTADO/);
    // Los creadores sin deal siguen explícitamente pendientes.
    for (const slug of ['naow', 'huasopeek', 'todocs2', 'jolu']) {
      expect(doc).toMatch(new RegExp(`\\|\\s*${slug}\\s*\\|[^|]*\\|[^|]*\\|[^|]*Pendiente`, 'i'));
    }
    // Regla dura visible.
    expect(doc).toMatch(/1 creador = 1 provider/i);
    expect(doc).toMatch(/NO escriben nunca a[\s\S]{0,120}coin_transactions/);
  });
});
