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
  naow: { emoji: '🎯', color: '#28d7ff', code: 'NAOW', sub: 'Creador de CS · SocialPro' },
  huasopeek: { emoji: '🔥', color: '#ff9d2e', code: 'HUASOPEEK', sub: 'Creador de CS · SocialPro' },
  martinez: { emoji: '⚔️', color: '#4ade80', code: 'MARTINEZ', sub: 'Creador de CS · SocialPro' },
  // ZACKETIZOR: display name en KeyDrop es "zack", código promocional real
  // es ZACKCSGO (no ZACKETIZOR — descubierto en el probe de la API KeyDrop).
  zacketizor: { emoji: '🎬', color: '#e03070', code: 'ZACKCSGO', sub: 'Creador CS2 · SocialPro' },
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
