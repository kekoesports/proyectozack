import Image from 'next/image';
import { CtaButton } from './CtaButton';
import { TELEGRAM_URL, BLOGABET_URL } from './tokens';

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-sp-black text-white py-24 md:py-32">
      <div className="absolute inset-0 bg-sp-grad opacity-[0.92]" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-5 md:px-8 text-center">
        <Image
          src="/images/logos/2.png"
          alt="SocialPro"
          width={56}
          height={56}
          className="mx-auto w-12 h-12 md:w-14 md:h-14 object-contain mb-6 drop-shadow-[0_0_28px_rgba(255,255,255,0.55)]"
        />

        <h2 className="font-display text-4xl md:text-6xl font-black uppercase leading-[0.95] mb-6">
          Análisis competitivo de CS2,<br />
          <span className="text-white/85">contado por quien la vive</span>
        </h2>
        <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-2xl mx-auto mb-10">
          Únete gratis a la comunidad. Picks publicados a diario, análisis
          previos en directo y seguimiento verificable en Blogabet.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <CtaButton
            href={TELEGRAM_URL}
            ctaId="apuesta_cs2_finalcta_telegram"
            variant="dark"
            external
            className="!px-9 !py-4 !text-base"
          >
            Entrar al Telegram
          </CtaButton>
          <CtaButton
            href={BLOGABET_URL}
            ctaId="apuesta_cs2_finalcta_blogabet"
            variant="outline"
            external
            className="!px-9 !py-4 !text-base !border-white/30 hover:!border-white"
          >
            Ver estadísticas
          </CtaButton>
        </div>

        <p className="mt-10 text-xs text-white/65 max-w-md mx-auto">
          Apuesta Segura CS2 es un proyecto del ecosistema{' '}
          <span className="font-display font-black uppercase tracking-wider">
            SocialPro
          </span>
          {' '}· Agencia gaming y esports · Madrid · 2012
        </p>
        <p className="mt-3 text-xs text-white/55 max-w-md mx-auto">
          +18 · Juega con responsabilidad. Las apuestas conllevan riesgo de
          pérdida.
        </p>
      </div>
    </section>
  );
}
