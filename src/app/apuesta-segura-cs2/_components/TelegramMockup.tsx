import { Send } from 'lucide-react';
import { PICK_PREVIEWS } from './tokens';
import { PickCard } from './PickCard';

type Density = 'compact' | 'full';

export function TelegramMockup({ density = 'full' }: { density?: Density }) {
  const items = density === 'compact' ? PICK_PREVIEWS.slice(0, 2) : PICK_PREVIEWS;

  return (
    <div className="relative bg-[#0c1016] border border-white/[0.08] rounded-3xl p-4 md:p-5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-sp-pink/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-sp-orange/12 blur-3xl pointer-events-none"
      />

      <header className="relative flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full bg-sp-grad flex items-center justify-center font-display font-black text-white shadow-[0_8px_24px_-8px_rgba(224,48,112,0.6)]">
            <Send className="w-4 h-4" strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-display font-black text-white text-sm leading-none flex items-center gap-1.5">
              Apuesta Segura CS2
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                aria-label="Verificado"
              >
                <circle cx="7" cy="7" r="6.5" fill="#3b82f6" />
                <path
                  d="M4 7L6 9L10 5"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-[11px] text-white/40 mt-1 flex items-center gap-1.5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              Comunidad activa · Canal gratuito
            </div>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/45 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1">
          Telegram
        </span>
      </header>

      <div className="relative space-y-3">
        {items.map((p, i) => (
          <PickCard key={`${p.teamA}-${i}`} {...p} />
        ))}
      </div>

      <footer className="relative mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40">
        <span className="uppercase tracking-wider">3–6 picks/día</span>
        <span className="tabular-nums">+ análisis previos en directo</span>
      </footer>
    </div>
  );
}
