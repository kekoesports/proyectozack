import { STAGGER } from '@/lib/animation';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { AboutCard } from '@/components/sections/AboutCard';

export function AboutSection() {
  return (
    <section id="nosotros" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center">
        <FadeInOnScroll>
          <SectionTag>Sobre SocialPro</SectionTag>
          <SectionHeading className="mb-6">
            Somos la agencia <GradientText>gaming</GradientText> del mercado hispano
          </SectionHeading>
          <div className="space-y-4 text-sm text-sp-muted leading-relaxed">
            <p>
              Fundada por ex-profesionales de esports con más de una década de experiencia,
              SocialPro nació para resolver el problema real del mercado: conectar talentos
              gaming con marcas que buscan audiencias comprometidas y resultados medibles.
            </p>
            <p>
              Nuestra especialización en iGaming, CS2 y el ecosistema gaming hispano nos
              permite ofrecer campañas con tasas de conversión muy superiores a la media del sector.
            </p>
            <p>
              Operamos en España y LatAm, con talentos que suman más de 10 millones de
              usuarios únicos mensuales y un engagement rate promedio del 8.9%.
            </p>
          </div>
        </FadeInOnScroll>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'España & LatAm', sub: 'Mercados principales' },
            { label: '+14 años', sub: 'Experiencia en gaming' },
            { label: 'iGaming', sub: 'Especialización principal' },
            { label: '100% tracking', sub: 'Resultados medibles' },
          ].map(({ label, sub }, i) => (
            <FadeInOnScroll key={sub} delay={i * STAGGER.base}>
              <AboutCard item={{ label, sub }} />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
