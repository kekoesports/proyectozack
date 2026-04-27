import type { PortfolioItem } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { PortfolioGrid } from './PortfolioGrid';

type PortfolioSectionProps = {
  items: PortfolioItem[];
}

/**
 * Sección "Portfolio" — wrapper server-side con cabecera + `PortfolioGrid`
 * (cliente) que maneja filtros y animaciones.
 *
 * @kind server
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <PortfolioSection items={items} />
 * ```
 */
export function PortfolioSection({ items }: PortfolioSectionProps) {
  return (
    <section id="portfolio" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>Nuestro trabajo</SectionTag>
            <SectionHeading>
              <GradientText>Portfolio</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>
        <PortfolioGrid items={items} />
      </div>
    </section>
  );
}
