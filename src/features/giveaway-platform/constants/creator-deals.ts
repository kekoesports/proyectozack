import type { BrandKey } from './brands';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

/**
 * Config declarativa: qué partners/deals tiene cada creador confirmados.
 *
 * Regla dura: solo aparecen aquí partnerships REALES. Si un creador no
 * tiene deal confirmado, su entry es `[]` y su landing muestra un
 * placeholder honesto ("Deals de partners próximamente"). Nunca inventar
 * partnerships para llenar espacio.
 *
 * `BrandKey` corresponde con las cards estáticas de
 * `PLATFORM_BRANDS` en `./brands.ts`. Añadir un partner aquí implica
 * tener la card visual creada; añadir un provider externo con API real
 * implica además ver `docs/external-giveaways-provider-onboarding.md`.
 */

export type PlatformCreatorSlug = (typeof PLATFORM_CREATOR_SLUGS)[number];

export const CREATOR_DEALS: Record<PlatformCreatorSlug, readonly BrandKey[]> = {
  zacketizor: ['keydrop', 'csgoskins'],
  huasopeek:  [],
  naow:       ['keydrop'],
  todocs2:    ['keydrop', 'csgoskins'],
  imantado:   ['keydrop'],
  jolu:       [],
};

/**
 * Partners activos de un creador. Devuelve `[]` si el slug no está en el
 * roster público (defensivo — el caller debería haber validado antes).
 */
export function getCreatorDeals(slug: string): readonly BrandKey[] {
  const key = slug as PlatformCreatorSlug;
  return CREATOR_DEALS[key] ?? [];
}

/** True si el creador tiene al menos un deal confirmado. */
export function hasAnyDeal(slug: string): boolean {
  return getCreatorDeals(slug).length > 0;
}
