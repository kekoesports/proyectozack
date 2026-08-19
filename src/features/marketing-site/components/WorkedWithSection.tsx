import Image from 'next/image';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { gradientStyle } from '@/lib/utils/gradient';

type Creator = {
  readonly slug: string;
  readonly label: string;
  readonly profileUrl: string;
  /** `undefined` → fallback con inicial (solo Preview; no debe llegar así a producción). */
  readonly photoUrl?: string;
};

const CREATORS: readonly Creator[] = [
  { slug: 'imantado',     label: 'Imantado',     profileUrl: 'https://www.twitch.tv/imantado',     photoUrl: '/images/worked-with/imantado.png' },
  { slug: 'andreachinii', label: 'Andreachinii', profileUrl: 'https://www.twitch.tv/andreachinii', photoUrl: '/images/worked-with/andreachinii.png' },
  { slug: 'axozer',       label: 'Axozer',       profileUrl: 'https://www.twitch.tv/axozer',       photoUrl: '/images/worked-with/axozer.jpg' },
  { slug: 'jcorko',       label: 'JCorko',       profileUrl: 'https://www.twitch.tv/jcorko_',      photoUrl: '/images/worked-with/jcorko.png' },
  { slug: 'lucasrojo',    label: 'Lucas Rojo',   profileUrl: 'https://www.twitch.tv/lucasrojo',    photoUrl: '/images/worked-with/lucasrojo.webp' },
  { slug: 'b0rja',        label: 'B0rja',        profileUrl: 'https://www.twitch.tv/b0rja',        photoUrl: '/images/worked-with/b0rja.webp' },
  { slug: 'lazypopa',     label: 'Lazypopa',     profileUrl: 'https://www.twitch.tv/lazypopa',     photoUrl: '/images/worked-with/lazypopa.webp' },
];

const TWITCH_GRADIENT: React.CSSProperties = { background: gradientStyle('#6441a5', '#2a0e61') };

export function WorkedWithSection(): React.JSX.Element {
  return (
    <section className="bg-sp-off py-16 sm:py-20 px-4 sm:px-6 border-t border-sp-border">
      <div className="max-w-6xl mx-auto">
        <FadeInOnScroll>
          <div className="text-center mb-10 sm:mb-12">
            <SectionTag>Prestigio</SectionTag>
            <SectionHeading>Creadores con los que colaboramos</SectionHeading>
            <p className="mt-3 text-sm sm:text-base text-sp-muted max-w-2xl mx-auto leading-relaxed">
              Colaboraciones con algunos de los creadores más relevantes del ecosistema gaming español.
            </p>
          </div>
        </FadeInOnScroll>

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          {CREATORS.map((c) => {
            const initial = c.label.charAt(0).toUpperCase();
            return (
              <li key={c.slug}>
                <a
                  href={c.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c.label} en Twitch — abre en una nueva pestaña`}
                  className="group flex flex-col items-center gap-3 bg-white border border-sp-border rounded-2xl px-4 py-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-sp-dark/20 transition-all h-full"
                >
                  <div
                    className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-sp-border group-hover:ring-sp-dark/40 transition"
                    style={c.photoUrl ? undefined : TWITCH_GRADIENT}
                  >
                    {c.photoUrl ? (
                      <Image
                        src={c.photoUrl}
                        alt={`Foto de perfil de ${c.label}`}
                        fill
                        sizes="80px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-3xl font-black text-white/85">
                          {initial}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-display text-sm font-black uppercase tracking-tight text-sp-dark leading-none">
                      {c.label}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-1.5 text-sp-muted">
                      <SocialIcon type="twitch" size={11} />
                      <span className="text-[11px]">Twitch</span>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
