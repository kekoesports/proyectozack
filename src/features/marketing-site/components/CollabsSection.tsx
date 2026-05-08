import Image from 'next/image';
import { STAGGER } from '@/lib/utils/animation';
import type { Collaborator } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { gradientStyle } from '@/lib/utils/gradient';

const ArrowUpRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M17 7H7M17 7v10"/>
  </svg>
);

type CollabsSectionProps = {
  readonly collaborators: Collaborator[];
}

/**
 * Bloque "Colaboradores Destacados": grid de partners adicionales con su
 * gradiente y enlace external (icono ArrowUpRight).
 *
 * @kind server
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <CollabsSection collaborators={collaborators} />
 * ```
 */
export function CollabsSection({ collaborators }: CollabsSectionProps): React.JSX.Element {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>También han trabajado con nosotros</SectionTag>
            <SectionHeading>
              Colaboradores <GradientText>Destacados</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {collaborators.map((c, i) => {
            const grad = gradientStyle(c.gradientC1, c.gradientC2);
            const inner = (
              <>
                {/* Circular photo */}
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 mb-4 flex items-center justify-center"
                  style={{ background: grad }}
                >
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} width={96} height={96} className="object-cover w-full h-full" />
                  ) : (
                    <span className="font-display text-3xl font-black text-white/80">{c.initials}</span>
                  )}
                </div>

                <h3 className="font-display text-xl font-black uppercase text-sp-dark">{c.name}</h3>
                <p className="text-sm text-sp-muted mt-1 mb-3">{c.description}</p>

                {/* Platform badge + link indicator */}
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest gradient-text">
                    {c.badge}
                  </p>
                  {c.profileUrl && (
                    <span className="text-sp-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight />
                    </span>
                  )}
                </div>
              </>
            );

            return (
              <FadeInOnScroll key={c.id} delay={i * STAGGER.base}>
                {c.profileUrl ? (
                  <a
                    href={c.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-sp-border bg-white overflow-hidden hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center group hover:-translate-y-1"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="rounded-2xl border border-sp-border bg-white overflow-hidden hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center group">
                    {inner}
                  </div>
                )}
              </FadeInOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
