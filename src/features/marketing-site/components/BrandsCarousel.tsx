import type { Brand } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { BrandLogo } from '@/components/ui/BrandLogo';

type BrandsCarouselProps = {
  brands: Brand[];
}

/**
 * Carrusel marquee de logos de marcas que confían en SocialPro.
 *
 * Tratamiento editorial:
 *  - Fondo oscuro premium (`sp-dark`) sin caja blanca por logo
 *  - Logos en silueta blanca al 65% opacity por defecto
 *  - Hover individual revela el color original de marca
 *  - Alturas visuales normalizadas (`max-h-9`)
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
  // Duplicate for seamless marquee loop — computed once per prop change (server component)
  const items = brands.concat(brands);

  return (
    <section className="relative py-16 bg-sp-dark border-y border-white/[0.05] overflow-hidden">
      {/* Glow lateral muy sutil — refuerzo editorial sin saturar */}
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
        {/* Fades laterales — fundido editorial sobre el track */}
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
              className="group mx-10 sm:mx-12 lg:mx-14 shrink-0 flex items-center justify-center h-16"
            >
              {brand.logoUrl ? (
                <BrandLogo
                  src={brand.logoUrl}
                  alt={brand.displayName}
                  tone="on-dark"
                  size="xl"
                  width={200}
                  height={64}
                />
              ) : (
                <span className="text-sm font-bold text-white/40 uppercase tracking-wider whitespace-nowrap transition-colors hover:text-white">
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
