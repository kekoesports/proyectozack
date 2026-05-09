import { Send, Bell, Users, FileBarChart } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { TelegramMockup } from './TelegramMockup';
import { TELEGRAM_URL } from './tokens';

const PERKS = [
  { icon: Send, label: 'Picks diarios con análisis previo' },
  { icon: Bell, label: 'Avisos en tiempo real antes del partido' },
  { icon: FileBarChart, label: 'Resultados publicados en Blogabet' },
  { icon: Users, label: 'Comunidad activa CS2 · Acceso gratuito' },
];

export function TelegramSection() {
  return (
    <section
      id="telegram"
      className="relative isolate overflow-hidden text-white py-24 md:py-32"
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(245,99,42,0.22), transparent 50%), radial-gradient(circle at 80% 70%, rgba(139,58,173,0.28), transparent 55%), #0e0e0e',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/85">
                Comunidad activa · Gratis
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-6xl font-black uppercase leading-[0.92]">
              Únete al<br />
              <span className="bg-sp-grad bg-clip-text text-transparent">Telegram CS2</span>
            </h2>

            <p className="mt-6 text-base md:text-lg text-white/65 leading-relaxed max-w-xl">
              El producto principal vive en Telegram. Picks, análisis y
              comunidad en directo, sin VIPs de pago, sin upsells. Solo entra
              cuando vayamos a publicar — el resto lo verás en abierto.
            </p>

            <ul className="mt-9 grid sm:grid-cols-2 gap-3 max-w-xl">
              {PERKS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5"
                >
                  <span className="flex-none flex items-center justify-center w-9 h-9 rounded-lg bg-sp-grad/15 border border-sp-pink/30">
                    <Icon className="w-4 h-4 text-white" strokeWidth={1.8} />
                  </span>
                  <span className="text-sm text-white/85 leading-tight">
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <CtaButton
                href={TELEGRAM_URL}
                ctaId="apuesta_cs2_telegram_main"
                external
                className="!px-9 !py-4 !text-base"
              >
                <Send className="w-4 h-4" strokeWidth={2.2} />
                Entrar al canal
              </CtaButton>
            </div>

            <p className="mt-4 text-xs text-white/40">
              +18 · Juega con responsabilidad. Las apuestas conllevan riesgo
              de pérdida.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-sp-grad/20 blur-3xl rounded-[40px] pointer-events-none" />
            <TelegramMockup density="full" />
          </div>
        </div>
      </div>
    </section>
  );
}
