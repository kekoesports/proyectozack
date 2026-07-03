import type { ExternalGiveawayCard, ExternalGiveawaySections, ProviderKey } from './types';
import { fetchKeydropForCreator, KEYDROP_CONFIG } from './providers/keydrop/fetch';

/**
 * Registry central de providers externos soportados.
 *
 * Cada entry describe la metadata visual del provider + la función que
 * ejecuta el fetch+mapper para un creador concreto. Añadir un provider:
 *   1) Nueva carpeta `providers/<key>/{zod-schemas,fetch,mapper}.ts`.
 *   2) Nueva entry aquí + entry en `ProviderKey` de `types.ts`.
 *   3) Nueva binding en `creator-bindings.ts` para el creador que lo use.
 *   4) `remotePatterns` en `next.config.ts` para el CDN de imágenes.
 *   5) Env var `<PROVIDER>_<CREATOR>_API_KEY` documentada.
 */

export interface ProviderConfig {
  key: ProviderKey;
  displayName: string;
  logoAsset: string;
  /** URL pública para el CTA "Ver en X". */
  listingUrl: string;
  /** Se muestra en badges y accent colors. */
  accentColor: string;
  /** Segundos de cache ISR de Next per-region. */
  revalidateSeconds: number;
  /**
   * Fetch específico: devuelve activos + finalizados ya mapeados a
   * `ExternalGiveawayCard`, o error clasificado. `apiKey` puede ser
   * undefined — el provider debe devolver `not_configured` sin lanzar.
   */
  fetchForCreator: (input: {
    creatorSlug: string;
    apiKey: string | undefined;
  }) => Promise<
    | { ok: true; active: ExternalGiveawayCard[]; finished: ExternalGiveawayCard[] }
    | { ok: false; error: ExternalGiveawaySections['status'] }
  >;
}

/** Registry read-only. Cambios requieren PR — auditable en git. */
const REGISTRY: Record<ProviderKey, ProviderConfig> = {
  keydrop: KEYDROP_CONFIG,
};

/** Devuelve la config de un provider por key, o `null` si no existe. */
export function getProvider(key: string): ProviderConfig | null {
  return (REGISTRY as Record<string, ProviderConfig | undefined>)[key] ?? null;
}

/** Lista de keys de providers conocidos (para tests y utilidades). */
export function listProviders(): ProviderKey[] {
  return Object.keys(REGISTRY) as ProviderKey[];
}

/** Export para lookup directo en el fetch. */
export { fetchKeydropForCreator };
