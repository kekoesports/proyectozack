import type { Brand } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { BrandLogo } from '@/components/ui/BrandLogo';

type BrandsCarouselProps = {
  brands: Brand[];
}

/**
 * Presencia visual por marca. Default = 'normal'.
 *  - `boost`: artwork cuadrado/bajo-aspect que rinde proporcionalmente
 *             más pequeño en plate height-bound (1WIN, SKIN.CLUB).
 *  - `shrink`: artwork muy ancho que ocupa demasiado espacio horizontal
 *              y desbalancea el carrusel (JUGABET, SKIN.PLACE, 1XBET).
 */
const BRAND_PRESENCE: Readonly<Record<string, 'shrink' | 'boost'>> = {
  '1WIN':       'boost',
  'SKIN.CLUB':  'boost',
  'JUGABET':    'shrink',
  'SKIN.PLACE': 'shrink',
  '1XBET':      'shrink',
  'CSGOSKINS':  'shrink',
  'YOSPORTS':   'shrink',
  'CSDROP':     'shrink',
  'KICK':       'shrink',
  'HELLCASE':   'shrink',
};

/**
 * Logos con artwork oscuro/coloreado-bajo que son poco legibles sobre
 * plate dark. brightness-0 invert los convierte a blanco puro, coherente
 * con KEYDROP, CSDROP y SKINSMONKEY.
 *
 * Criterio de inclusión: >35% pixels oscuros (br<80) O artwork coloreado
 * de bajo contraste verificado visualmente sobre sp-dark.
 */
const LOGO_IMAGE_CLASS: Readonly<Record<string, string>> = {
  'CLASH.GG':   'brightness-0 invert', // 54% dark
  'EVOPLAY':    'brightness-0 invert', // 79% dark
  'EMPIREDROP': 'brightness-0 invert', // 38% dark + 62% colored oscuro
  'SKIN.CLUB':  'brightness-0 invert', // coloreado de bajo contraste sobre dark
};

/**
 * Carrusel marquee de logos de marcas que confían en SocialPro.
 *
 * Todos los logos se sirven sobre un plate oscuro uniforme (bg-sp-dark)
 * para garantizar coherencia visual independientemente del artwork del logo.
 * CLASH.GG recibe además brightness-0 invert al tener artwork oscuro.
 *
 * @kind server
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <BrandsCarousel brands={brands} />
 * ```
 */
export function BrandsCarousel({ brands }: BrandsCarouselProps) {
  const items = brands.concat(brands);

  return (
    <section className="relative py-16 bg-white border-y border-sp-border overflow-hidden">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[420px] h-[260px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(245,99,42,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden
      />

      <FadeInOnScroll>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <SectionTag>Marcas que confían en nosotros</SectionTag>
          <SectionHeading>Partners &amp; Brands</SectionHeading>
        </div>
      </FadeInOnScroll>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
          style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
          style={{ background: 'linear-gradient(to left, #ffffff, transparent)' }}
          aria-hidden
        />

        <div className="marquee-track">
          {items.map((brand, i) => (
            <div
              key={`${brand.slug}-${i}`}
              className="mx-6 sm:mx-7 lg:mx-8 shrink-0 flex items-center justify-center"
            >
              {brand.logoUrl ? (
                <BrandLogo
                  src={brand.logoUrl}
                  alt={brand.displayName}
                  plate="dark"
                  size="lg"
                  presence={BRAND_PRESENCE[brand.displayName] ?? 'normal'}
                  imageClassName={LOGO_IMAGE_CLASS[brand.displayName]}
                  width={240}
                  height={56}
                />
              ) : (
                <span className="inline-flex items-center justify-center h-14 px-4 rounded-lg bg-sp-dark text-white font-display text-base font-black uppercase tracking-wide whitespace-nowrap">
                  {brand.displayName}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
