'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import type { CreatorCodeWithTalent } from '@/types';

const BADGE_LABELS: Record<string, string> = {
  TOP: '🔥 TOP', RECOMENDADO: '⭐ Recomendado', MEJOR_BONUS: '💎 Mejor bonus',
  NUEVO: '✨ Nuevo', MAS_USADO: '🚀 Más usado', EXCLUSIVO: '👑 Exclusivo',
};
const CATEGORY_LABELS: Record<string, string> = {
  casino: 'Casino', apuestas: 'Apuestas', skins_cs2: 'Skins CS2', otros: 'Otros',
};

type Props = { readonly code: CreatorCodeWithTalent };

export function HeroSponsorCard({ code }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const trackClick = trpc.giveaways.trackClick.useMutation();

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    void navigator.clipboard.writeText(code.code);
    setCopied(true);
    trackClick.mutate({ codeId: code.id, action: 'copy' });
    setTimeout(() => setCopied(false), 2000);
  }, [code.code, code.id, trackClick]);

  const handleCta = useCallback(() => {
    trackClick.mutate({ codeId: code.id, action: 'cta' });
  }, [code.id, trackClick]);

  const benefit  = code.description?.trim() || `Beneficios con ${code.brandName}`;
  const ctaLabel = code.ctaText?.trim() || `Usar código en ${code.brandName}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080808]">
      {/* Glow fondo — sutil naranja */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(55% 45% at 50% 0%, rgba(245,99,42,0.18) 0%, rgba(139,58,173,0.08) 55%, transparent 80%)' }}
        aria-hidden
      />
      {/* Línea luminosa top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sp-orange/60 to-transparent" aria-hidden />

      <div className="relative">
        {/* Franja de marca */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            {code.brandLogo ? (
              <Image src={code.brandLogo} alt={code.brandName} width={80} height={28}
                className="object-contain max-h-7 drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]" />
            ) : (
              <span className="font-display font-black uppercase text-base tracking-wider text-white/80">{code.brandName}</span>
            )}
            {code.badge && BADGE_LABELS[code.badge] && (
              <span className="px-2 py-0.5 rounded-md bg-sp-orange/15 border border-sp-orange/25 text-[10px] font-black text-sp-orange uppercase tracking-wider">
                {BADGE_LABELS[code.badge]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {code.category && CATEGORY_LABELS[code.category] && (
              <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[9px] font-bold uppercase tracking-wider text-white/30">
                {CATEGORY_LABELS[code.category]}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-sp-orange/10 border border-sp-orange/20 text-[9px] font-black uppercase tracking-wider text-sp-orange/80">
              ★ Partner
            </span>
          </div>
        </div>

        {/* Beneficio — elemento HERO */}
        <div className="px-5 py-5 sm:py-6 text-center sm:text-left">
          <p className="font-display text-3xl sm:text-4xl font-black uppercase leading-none tracking-tight text-white mb-1"
            style={{ textShadow: '0 0 40px rgba(245,99,42,0.3)' }}>
            {benefit}
          </p>
          <p className="text-[11px] text-white/35 uppercase tracking-[0.2em] mt-2">
            Usa el código de {code.talent.name} para activar el beneficio
          </p>
        </div>

        {/* Código + CTAs */}
        <div className="px-5 pb-5 space-y-2.5">
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-sp-orange/25">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 shrink-0">Código</span>
              <span className="flex-1 font-mono text-xl font-black tracking-[0.25em] text-sp-orange truncate">
                {code.code}
              </span>
            </div>
            <button type="button" onClick={handleCopy} aria-label={`Copiar ${code.code}`}
              className={`shrink-0 px-5 rounded-xl border font-black text-[11px] uppercase tracking-wider transition-all ${
                copied
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/[0.05] border-white/12 text-white/60 hover:border-sp-orange/50 hover:text-sp-orange'
              }`}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>

          <a href={code.redirectUrl} target="_blank" rel="noopener noreferrer" onClick={handleCta}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sp-grad text-white text-[13px] font-black uppercase tracking-[0.15em] shadow-[0_2px_20px_rgba(245,99,42,0.2)] hover:shadow-[0_4px_30px_rgba(245,99,42,0.35)] hover:tracking-[0.2em] transition-all duration-300">
            {ctaLabel} →
          </a>
        </div>
      </div>
    </div>
  );
}
