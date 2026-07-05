import Image from 'next/image';
import Link from 'next/link';
import { CtaButton } from './CtaButton';
import { TELEGRAM_URL, BLOGABET_URL } from './tokens';

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-sp-black text-white py-14 md:py-20">
      <div
        aria-hidden
        className="absolute -left-32 top-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.20), rgba(224,48,112,0.10) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        aria-hidden
        className="absolute -right-32 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(139,58,173,0.20), transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
          <div className="flex items-center gap-4 md:gap-5">
            <Image
              src="/images/logos/2.png"
              alt="SocialPro"
              width={48}
              height={48}
              className="flex-none w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-[0_0_18px_rgba(224,48,112,0.45)]"
            />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
                Apuesta Segura CS2 · SocialPro
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-black uppercase leading-[1.05] tracking-tight">
                Únete gratis a la comunidad{' '}
                <span className="bg-sp-grad bg-clip-text text-transparent">
                  CS2
                </span>
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:flex-none">
            <CtaButton
              href={TELEGRAM_URL}
              ctaId="apuesta_cs2_finalcta_telegram"
              external
            >
              Entrar al Telegram
            </CtaButton>
            <CtaButton
              href={BLOGABET_URL}
              ctaId="apuesta_cs2_finalcta_blogabet"
              variant="outline"
              external
            >
              Ver estadísticas
            </CtaButton>
          </div>
        </div>

        <p className="mt-6 md:mt-8 pt-5 border-t border-white/[0.06] text-[11px] text-white/45 leading-relaxed">
          Proyecto del ecosistema{' '}
          <span className="font-display font-black uppercase tracking-wider text-white/65">
            SocialPro
          </span>
          {' '}· Agencia gaming y esports · Madrid · 2012 · +18 · Juega con
          responsabilidad — las apuestas conllevan riesgo de pérdida.
        </p>

        {/* Enlazado interno editorial — silo iGaming + CS2 */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col gap-2 text-[12px] text-white/55 leading-relaxed">
          <p>
            El equipo detrás de este canal es{' '}
            <Link href="/servicios/igaming" className="text-white/80 hover:text-sp-orange underline decoration-white/20 hover:decoration-sp-orange transition-colors">
              SocialPro — campañas iGaming con streamers verificados
            </Link>
            . Trabajamos con operadores dentro del marco{' '}
            <Link href="/guia-dgoj-igaming-influencers" className="text-white/80 hover:text-sp-orange underline decoration-white/20 hover:decoration-sp-orange transition-colors">
              regulatorio DGOJ para influencers
            </Link>
            .
          </p>
          <p>
            ¿Buscas talento CS2 para campañas de marca? Consulta nuestro roster de{' '}
            <Link href="/influencers-cs2" className="text-white/80 hover:text-sp-orange underline decoration-white/20 hover:decoration-sp-orange transition-colors">
              creadores especializados en Counter-Strike
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
