import Image from 'next/image';

export function OfficialChannelStamp() {
  return (
    <section
      aria-label="Canal oficial"
      className="relative bg-sp-black border-t border-white/[0.05] py-12 md:py-16 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,99,42,0.10), rgba(139,58,173,0.05) 40%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
        <div className="flex-none relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-1 ring-white/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
          <Image
            src="/images/apuesta-segura-cs2/badge.png"
            alt="Apuesta Segura CS2"
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
            Canal oficial
          </p>
          <h3 className="font-display text-2xl md:text-3xl font-black uppercase text-white leading-tight tracking-tight mb-3">
            Apuesta Segura CS2{' '}
            <span className="bg-sp-grad bg-clip-text text-transparent">
              by SocialPro
            </span>
          </h3>
          <p className="text-sm md:text-[15px] text-white/55 leading-relaxed max-w-xl mx-auto md:mx-0">
            Comunidad gratuita en Telegram dedicada al análisis competitivo de
            Counter-Strike 2. Picks publicados a diario, histórico abierto en
            Blogabet, sin VIPs de pago. Solo análisis y comunidad.
          </p>
        </div>
      </div>
    </section>
  );
}
