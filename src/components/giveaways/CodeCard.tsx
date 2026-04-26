'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { CreatorCodeWithTalent } from '@/types';

const BADGE_STYLES: Record<string, string> = {
  TOP: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
  RECOMENDADO: 'bg-sp-grad shadow-[0_0_10px_rgba(245,99,42,0.4)]',
  MEJOR_BONUS: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  NUEVO: 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
  MAS_USADO: 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]',
  EXCLUSIVO: 'bg-gradient-to-r from-sp-dpink to-sp-purple shadow-[0_0_10px_rgba(196,40,128,0.4)]',
};

const BADGE_LABELS: Record<string, string> = {
  TOP: '🔥 TOP',
  RECOMENDADO: '⭐ Recomendado',
  MEJOR_BONUS: '💎 Mejor bonus',
  NUEVO: '✨ Nuevo',
  MAS_USADO: '🚀 Más usado',
  EXCLUSIVO: '👑 Exclusivo',
};

const CATEGORY_LABELS: Record<string, string> = {
  casino: 'Casino',
  apuestas: 'Apuestas',
  skins_cs2: 'CS2',
  otros: 'Otros',
};

function trackClick(codeId: number, action: 'copy' | 'cta'): void {
  fetch('/api/giveaways/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeId, action }),
  }).catch(() => {});
}

type CodeCardProps = {
  readonly code: CreatorCodeWithTalent;
  readonly featured?: boolean;
};

export function CodeCard({ code, featured = false }: CodeCardProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(code.code);
    setCopied(true);
    trackClick(code.id, 'copy');
    setTimeout(() => setCopied(false), 2000);
  }, [code.code, code.id]);

  const handleCta = useCallback(() => {
    trackClick(code.id, 'cta');
  }, [code.id]);

  const offer = code.description?.trim() || `Beneficios exclusivos con ${code.brandName}`;
  const ctaLabel = code.ctaText?.trim() || 'Usar código';
  const badge = code.badge;

  return (
    <motion.div
      className={`gw-sp-card group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
        featured
          ? 'border-sp-orange/25 bg-[#0e0e0e] hover:border-sp-orange/50 hover:shadow-[0_0_40px_rgba(245,99,42,0.12)]'
          : 'border-white/[0.06] bg-[#0e0e0e]/95 hover:border-sp-orange/30 hover:shadow-[0_0_30px_rgba(245,99,42,0.08)]'
      }`}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      {/* Badge + Category row */}
      {(badge || code.category) && (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          {badge && BADGE_LABELS[badge] ? (
            <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.12em] text-white ${BADGE_STYLES[badge] ?? ''}`}>
              {BADGE_LABELS[badge]}
            </span>
          ) : (
            <span />
          )}
          {code.category && CATEGORY_LABELS[code.category] && (
            <span className="inline-flex px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-black uppercase tracking-[0.15em] text-white/50">
              {CATEGORY_LABELS[code.category]}
            </span>
          )}
        </div>
      )}

      {/* Brand hero */}
      <div className={`relative flex items-center justify-center bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.04] overflow-hidden ${featured ? 'h-36' : 'h-28'}`}>
        <div
          className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
          style={{ background: 'radial-gradient(80% 60% at 50% 40%, rgba(245,99,42,0.18) 0%, rgba(224,48,112,0.12) 40%, transparent 75%)' }}
          aria-hidden
        />
        {code.brandLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={code.brandLogo}
            alt={code.brandName}
            className={`relative z-10 max-w-[60%] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 ${featured ? 'max-h-16' : 'max-h-14'}`}
          />
        ) : (
          <span className={`relative z-10 font-display font-black uppercase tracking-[0.15em] text-white/80 ${featured ? 'text-4xl' : 'text-3xl'}`}>
            {code.brandName}
          </span>
        )}
      </div>

      {/* Offer */}
      <div className="px-5 pt-4 pb-3 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sp-orange/80 mb-1.5">
          {code.brandName}
        </p>
        <p className={`font-bold text-white leading-snug ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>
          {offer}
        </p>
      </div>

      {/* Code + CTA */}
      <div className="px-5 pb-4 space-y-2.5">
        <div className="flex items-stretch gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-dashed border-white/15">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 shrink-0">Code</span>
            <span className="flex-1 font-mono text-sm font-black text-sp-orange tracking-[0.15em] truncate">
              {code.code}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copiar código ${code.code}`}
            className={`px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
              copied
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-white/[0.04] border-white/10 text-white/70 hover:border-sp-orange/40 hover:text-sp-orange'
            }`}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <a
          href={code.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCta}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-sp-grad text-white text-[12px] font-black uppercase tracking-[0.15em] gw-sp-btn-glow transition-all group-hover:tracking-[0.2em]"
        >
          {ctaLabel}
          <span aria-hidden>→</span>
        </a>
      </div>

      {/* Creator footer — links to creator page */}
      <Link
        href={`/c/${code.talent.slug}`}
        className="flex items-center gap-2.5 px-5 py-3 bg-white/[0.02] border-t border-white/[0.04] hover:bg-white/[0.05] transition-colors group/creator"
      >
        {code.talent.photoUrl ? (
          <Image
            src={code.talent.photoUrl}
            alt={code.talent.name}
            width={28}
            height={28}
            className="rounded-full object-cover border border-white/10"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white/80 shrink-0"
            style={{ background: `linear-gradient(135deg, ${code.talent.gradientC1}, ${code.talent.gradientC2})` }}
          >
            {code.talent.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 leading-none">Código de</p>
          <p className="text-[12px] font-bold text-white/80 group-hover/creator:text-white truncate leading-tight mt-0.5 transition-colors">{code.talent.name}</p>
        </div>
        <span className="text-white/20 group-hover/creator:text-sp-orange/60 text-xs transition-colors" aria-hidden>→</span>
      </Link>
    </motion.div>
  );
}
