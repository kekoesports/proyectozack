'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { TELEGRAM_URL } from './tokens';

export function FloatingTelegramCta() {
  const [show, setShow] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Subscripción real a window.scroll: aparece pasado el hero (~600px),
    // colapsa a icono pequeño en zona FAQ (~2400px) para no estorbar.
    const onScroll = () => {
      const y = window.scrollY;
      setShow(y > 600);
      setCollapsed(y > 2400);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`hidden md:block fixed bottom-6 right-6 z-30 transition-all duration-300 ${
        show
          ? 'translate-y-0 opacity-100'
          : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      <TrackedCtaLink
        href={TELEGRAM_URL}
        ctaId="apuesta_cs2_floating_telegram"
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center gap-3 bg-sp-black/85 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden hover:border-white/25 hover:bg-sp-black/95 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 ${
          collapsed ? 'pl-2 pr-2 py-2' : 'pl-2.5 pr-5 py-2'
        }`}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-sp-grad opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-sp-grad text-white shadow-[0_0_24px_-6px_rgba(224,48,112,0.6)]">
          <Send className="w-4 h-4" strokeWidth={2.2} />
        </span>
        <span
          className={`relative font-display font-black uppercase text-sm tracking-tight text-white transition-all ${
            collapsed
              ? 'max-w-0 opacity-0 -ml-3 overflow-hidden'
              : 'max-w-[180px] opacity-100'
          }`}
        >
          Telegram CS2
        </span>
        {!collapsed ? (
          <span className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/55 border-l border-white/10 pl-3">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        ) : null}
      </TrackedCtaLink>
    </div>
  );
}
