import { STAGGER } from '@/lib/utils/animation';
import type { TeamMember } from '@/types';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { TeamCard } from '@/features/marketing-site/components/TeamCard';

type TeamGridProps = {
  readonly team: TeamMember[];
}

/**
 * Grid del equipo SocialPro con `TeamCard` por miembro y stagger en la
 * entrada al viewport (`FadeInOnScroll`).
 *
 * @kind server
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <TeamGrid team={team} />
 * ```
 */
export function TeamGrid({ team }: TeamGridProps): React.JSX.Element {
  return (
    <section id="equipo" className="py-24 bg-sp-off">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>El equipo</SectionTag>
            <SectionHeading>
              Las personas <GradientText>detrás</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, i) => (
            <FadeInOnScroll key={member.id} delay={i * STAGGER.base}>
              <TeamCard member={member} />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
