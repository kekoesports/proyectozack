import type { Brand } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getBrandBg } from '@/components/ui/brand-bg-map';

type BrandsCarouselProps = {
  brands: Brand[];
}

/**
 * Carrusel marquee de logos de marcas que confían en SocialPro.
 *
 * Cada logo se renderiza en su color original sobre un plate (blanco por
 * defecto, oscuro para logos con artwork blanco-on-transparent). Altura
 * uniforme garantizada por el plate; ancho proporcional al aspect natural.
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
    <section className="relative py-16 bg-sp-dark border-y border-white/[0.05] overflow-hidden">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[420px] h-[260px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(245,99,42,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden
      />

      <FadeInOnScroll>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <SectionTag>Marcas que confían en nosotros</SectionTag>
          <SectionHeading className="text-white">Partners &amp; Brands</SectionHeading>
        </div>
      </FadeInOnScroll>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
          style={{ background: 'linear-gradient(to right, var(--color-sp-dark), transparent)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
          style={{ background: 'linear-gradient(to left, var(--color-sp-dark), transparent)' }}
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
                  plate={getBrandBg(brand.displayName)}
                  size="lg"
                  width={240}
                  height={56}
                />
              ) : (
                <span className="inline-flex items-center justify-center h-14 px-4 rounded-lg bg-white text-sp-dark font-display text-base font-black uppercase tracking-wide whitespace-nowrap">
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
