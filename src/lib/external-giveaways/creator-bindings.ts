import { env } from '@/lib/env';
import type { ProviderKey } from './types';

/**
 * Binding creator → provider externo + env var con la API key.
 *
 * Regla: **1 creador = 1 fuente**.
 *   - Creador con binding → sorteos externos. La `<section id="sorteos">`
 *     del CRM interno se oculta.
 *   - Creador sin binding → sorteos internos del CRM.
 *
 * Cambios requieren PR (auditable en git). MVP suficiente hasta que
 * lleguemos a >15 creadores o multi-tenant.
 *
 * Naming de env vars: `<PROVIDER>_<CREATOR>_API_KEY` (uppercase).
 *   Ejemplos:
 *     KEYDROP_ZACKETIZOR_API_KEY
 *     CSGOROLL_NAOW_API_KEY
 *     HELLCASE_HUASOPEEK_API_KEY
 */

export interface CreatorBinding {
  provider: ProviderKey;
  /** Nombre canónico de la env var (para docs y tests). */
  envKey: string;
  /** Valor actual de la key desde env (posiblemente undefined en dev). */
  apiKey: () => string | undefined;
}

/**
 * Mapa slug → binding. Sin fila = creador usa sorteos internos del CRM.
 * Los slugs deben estar en `PLATFORM_CREATOR_SLUGS`.
 */
const BINDINGS: Record<string, CreatorBinding> = {
  zacketizor: {
    provider: 'keydrop',
    envKey: 'KEYDROP_ZACKETIZOR_API_KEY',
    apiKey: () => env.KEYDROP_ZACKETIZOR_API_KEY,
  },
  imantado: {
    provider: 'keydrop',
    envKey: 'KEYDROP_IMANTADO_API_KEY',
    apiKey: () => env.KEYDROP_IMANTADO_API_KEY,
  },
  naow: {
    provider: 'keydrop',
    envKey: 'KEYDROP_NAOW_API_KEY',
    apiKey: () => env.KEYDROP_NAOW_API_KEY,
  },
  todocs2: {
    provider: 'keydrop',
    envKey: 'KEYDROP_TODOCS2_API_KEY',
    apiKey: () => env.KEYDROP_TODOCS2_API_KEY,
  },
  // Futuros bindings (comentados hasta que lleguen las API keys):
  //   huasopeek:  { provider: '...',  envKey: '<PROVIDER>_HUASOPEEK_API_KEY', apiKey: () => env.<PROVIDER>_HUASOPEEK_API_KEY },
};

/**
 * Devuelve el binding del creador o `null` si no tiene fuente externa
 * (usará sorteos internos del CRM).
 */
export function getCreatorBinding(slug: string): CreatorBinding | null {
  return BINDINGS[slug] ?? null;
}

/** True si el creador tiene una fuente externa configurada. */
export function isExternalCreator(slug: string): boolean {
  return slug in BINDINGS;
}

/** Slugs con binding externo — útil para tests y utilidades. */
export function listBoundCreatorSlugs(): string[] {
  return Object.keys(BINDINGS);
}
