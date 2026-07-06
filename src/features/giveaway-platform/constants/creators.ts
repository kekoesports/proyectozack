/**
 * Metadata visual de los creadores en la plataforma (emoji fallback, color
 * acento, sub). Los slugs deben coincidir con `PLATFORM_CREATOR_SLUGS` de
 * `src/lib/giveaway-platform/constants.ts` (constante de backend). Este
 * archivo es puramente presentacional (colores + emoji fallback del dropdown).
 * La foto real del creador vive en `talents.photoUrl` y se inyecta desde el
 * server en `page.tsx`.
 */

export interface PlatformCreatorVisual {
  emoji: string;
  color: string;
  code: string;
  sub: string;
}

export const PLATFORM_CREATOR_VISUALS: Record<string, PlatformCreatorVisual> = {
  // ZACKETIZOR: display name en KeyDrop es "zack", código promocional real
  // es ZACKCSGO (descubierto en el probe de la API KeyDrop).
  zacketizor: { emoji: '🎬', color: '#e03070', code: 'ZACKCSGO', sub: 'Creador CS2 · SocialPro' },
  huasopeek:  { emoji: '🔥', color: '#ff9d2e', code: 'HUASOPEEK', sub: 'Creador de CS · SocialPro' },
  naow:       { emoji: '🎯', color: '#28d7ff', code: 'NAOW',      sub: 'Creador de CS · SocialPro' },
  // TODOCS2: display name en KeyDrop es "TODOCS2", pero el código
  // promocional real está registrado como "TODO" (probable límite de
  // 4 chars en el sistema de promocodes de KeyDrop). Verificado con
  // GET /api/list el 2026-07-06 → organizer.promocode = "TODO".
  todocs2:    { emoji: '🎮', color: '#f5b73d', code: 'TODO',      sub: 'Creador CS2 · SocialPro' },
  imantado:   { emoji: '🧲', color: '#8b3dff', code: 'IMANTADO',  sub: 'Creador CS2 · SocialPro' },
  // Slug DB real: `jolu`; el display público es "JoluCS2".
  jolu:       { emoji: '💎', color: '#4ade80', code: 'JOLUCS2',   sub: 'Trading CS2 · SocialPro' },
};

export function getCreatorVisual(slug: string): PlatformCreatorVisual {
  return (
    PLATFORM_CREATOR_VISUALS[slug] ?? {
      emoji: '✨',
      color: '#8b3dff',
      code: slug.toUpperCase(),
      sub: 'Creador · SocialPro',
    }
  );
}
