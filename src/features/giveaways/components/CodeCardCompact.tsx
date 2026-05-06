'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import type { CreatorCodeWithTalent } from '@/types';

const BADGE_STYLES: Record<string, string> = {
  TOP:          'bg-gradient-to-r from-amber-500 to-orange-500',
  RECOMENDADO:  'bg-sp-grad',
  MEJOR_BONUS:  'bg-gradient-to-r from-emerald-500 to-teal-500',
  NUEVO:        'bg-gradient-to-r from-blue-500 to-cyan-500',
  MAS_USADO:    'bg-gradient-to-r from-purple-500 to-pink-500',
  EXCLUSIVO:    'bg-gradient-to-r from-sp-dpink to-sp-purple',
};
const BADGE_LABELS: Record<string, string> = {
  TOP: '🔥 TOP', RECOMENDADO: '⭐', MEJOR_BONUS: '💎', NUEVO: '✨', MAS_USADO: '🚀', EXCLUSIVO: '👑',
};

type Props = { readonly code: CreatorCodeWithTalent };

/**
 * Variante compacta horizontal de CodeCard — usada en el perfil de creador.
 * ~96px de alto vs ~600px de CodeCard original.
 */
export function CodeCardCompact({ code }: Props): React.JSX.Element {
  const [copied, setCopied]  = useState(false);
  const trackClick           = trpc.giveaways.trackClick.useMutation();

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(code.code);
    setCopied(true);
    trackClick.mutate({ codeId: code.id, action: 'copy' });
    setTimeout(() => setCopied(false), 2000);
  }, [code.code, code.id, trackClick]);

  const handleCta = useCallback(() => {
    trackClick.mutate({ codeId: code.id, action: 'cta' });
  }, [code.id, trackClick]);

  const offer    = code.description?.trim() || `Beneficios con ${code.brandName}`;
  const ctaLabel = code.ctaText?.trim() || 'Usar código';

  return (
    <div className="group flex items-stretch gap-0 rounded-xl border border-white/[0.07] bg-[#0d0d0d] hover:border-sp-orange/25 transition-colors overflow-hidden">

      {/* Logo marca — franja izquierda */}
      <div className="w-20 shrink-0 flex items-center justify-center bg-white/[0.03] border-r border-white/[0.06] px-2">
        {code.brandLogo ? (
          <Image
            src={code.brandLogo}
            alt={code.brandName}
            width={56}
            height={40}
            className="object-contain max-h-9 max-w-[56px] drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <span className="font-display font-black uppercase text-[11px] tracking-wider text-white/60 text-center leading-tight px-1">
            {code.brandName}
          </span>
        )}
      </div>

      {/* Contenido central */}
      <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sp-orange/80">{code.brandName}</span>
            {code.badge && BADGE_LABELS[code.badge] && (
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black text-white ${BADGE_STYLES[code.badge] ?? ''}`}>
                {BADGE_LABELS[code.badge]}
              </span>
            )}
          </div>
          <p className="text-[12px] text-white/70 leading-tight truncate">{offer}</p>
        </div>

        {/* Código + copiar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-dashed border-white/15">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/25">code</span>
            <span className="font-mono text-[12px] font-black text-sp-orange tracking-wider">{code.code}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copiar ${code.code}`}
            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
              copied
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-white/[0.04] border-white/10 text-white/60 hover:border-sp-orange/40 hover:text-sp-orange'
            }`}
          >
            {copied ? '✓' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* CTA */}
      <a
        href={code.redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleCta}
        className="shrink-0 flex items-center justify-center px-5 bg-sp-grad text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
      >
        {ctaLabel} →
      </a>
    </div>
  );
}
