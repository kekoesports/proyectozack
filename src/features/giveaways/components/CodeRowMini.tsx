'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import type { CreatorCodeWithTalent } from '@/types';

// Jerarquía visual por badge — de mayor a menor peso
type CodeTier = 'featured' | 'top' | 'exclusive' | 'best' | 'new' | 'popular' | 'normal';

function getTier(code: CreatorCodeWithTalent): CodeTier {
  if (code.isFeatured) return 'featured';
  if (code.badge === 'TOP')          return 'top';
  if (code.badge === 'EXCLUSIVO')    return 'exclusive';
  if (code.badge === 'MEJOR_BONUS')  return 'best';
  if (code.badge === 'NUEVO')        return 'new';
  if (code.badge === 'MAS_USADO')    return 'popular';
  return 'normal';
}

const TIER_STYLES: Record<CodeTier, {
  wrapper: string;
  logoBg: string;
  benefitColor: string;
  indicator: string | null;
  label: string | null;
}> = {
  featured: {
    wrapper: 'border-sp-orange/25 bg-[#0e0a08] hover:border-sp-orange/45',
    logoBg:  'bg-sp-orange/[0.06] border-sp-orange/10',
    benefitColor: 'text-white',
    indicator: 'bg-sp-orange',
    label: null,
  },
  top: {
    wrapper: 'border-amber-500/20 bg-[#0d0b07] hover:border-amber-500/35',
    logoBg:  'bg-amber-500/[0.05] border-amber-500/10',
    benefitColor: 'text-white',
    indicator: 'bg-amber-400',
    label: '🔥',
  },
  exclusive: {
    wrapper: 'border-sp-purple/20 bg-[#0b090e] hover:border-sp-purple/35',
    logoBg:  'bg-sp-purple/[0.06] border-sp-purple/10',
    benefitColor: 'text-white',
    indicator: 'bg-sp-purple',
    label: '👑',
  },
  best: {
    wrapper: 'border-emerald-500/18 bg-[#070e0a] hover:border-emerald-500/30',
    logoBg:  'bg-emerald-500/[0.05] border-emerald-500/10',
    benefitColor: 'text-white',
    indicator: 'bg-emerald-400',
    label: '💎',
  },
  new: {
    wrapper: 'border-blue-400/15 bg-[#07090e] hover:border-blue-400/28',
    logoBg:  'bg-blue-400/[0.04] border-blue-400/08',
    benefitColor: 'text-white/90',
    indicator: 'bg-blue-400',
    label: '✨',
  },
  popular: {
    wrapper: 'border-white/[0.07] bg-[#0a0a0a] hover:border-white/14',
    logoBg:  'bg-white/[0.03] border-white/[0.05]',
    benefitColor: 'text-white/90',
    indicator: null,
    label: '🚀',
  },
  normal: {
    wrapper: 'border-white/[0.06] bg-[#090909] hover:border-white/10',
    logoBg:  'bg-white/[0.02] border-white/[0.04]',
    benefitColor: 'text-white/80',
    indicator: null,
    label: null,
  },
};

type Props = { readonly code: CreatorCodeWithTalent };

export function CodeRowMini({ code }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const trackClick = trpc.giveaways.trackClick.useMutation();
  const tier = getTier(code);
  const st   = TIER_STYLES[tier];

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

  const benefit = code.description?.trim() || null;

  return (
    <div className={`group flex items-center h-[56px] rounded-xl border transition-all overflow-hidden ${st.wrapper}`}>

      {/* Indicador de tier — franja izquierda de 3px */}
      {st.indicator && (
        <div className={`w-[3px] h-full shrink-0 ${st.indicator} opacity-60`} aria-hidden />
      )}

      {/* Logo */}
      <div className={`w-[52px] h-full shrink-0 flex items-center justify-center border-r ${st.logoBg} ${!st.indicator ? '' : ''}`}>
        {code.brandLogo ? (
          <Image src={code.brandLogo} alt={code.brandName} width={38} height={26}
            className="object-contain max-h-[26px] max-w-[38px]" />
        ) : (
          <span className="text-[8px] font-black uppercase text-white/30 text-center px-1 leading-tight">
            {code.brandName.slice(0, 7)}
          </span>
        )}
      </div>

      {/* Beneficio + marca */}
      <div className="flex-1 min-w-0 px-3 flex flex-col justify-center">
        {benefit ? (
          <>
            <div className="flex items-center gap-1.5">
              {st.label && <span className="text-[10px] shrink-0">{st.label}</span>}
              <p className={`text-[13px] font-black leading-none truncate ${st.benefitColor}`}>{benefit}</p>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mt-0.5 truncate">{code.brandName}</p>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            {st.label && <span className="text-[10px] shrink-0">{st.label}</span>}
            <p className={`text-[13px] font-black truncate ${st.benefitColor}`}>{code.brandName}</p>
          </div>
        )}
      </div>

      {/* Código — solo desktop */}
      <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-2.5 mx-1 py-1.5 rounded-lg bg-white/[0.04] border border-dashed border-white/10">
        <span className="font-mono text-[11px] font-black text-sp-orange tracking-[0.12em]">{code.code}</span>
      </div>

      {/* Copiar */}
      <button type="button" onClick={handleCopy} aria-label={`Copiar ${code.code}`}
        className={`shrink-0 px-3 h-full text-[10px] font-black uppercase tracking-wider transition-all border-l ${
          copied
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10'
            : 'text-white/30 hover:text-sp-orange border-white/[0.05] hover:bg-sp-orange/5'
        }`}>
        {copied ? '✓' : 'Copiar'}
      </button>

      {/* Ir → */}
      <a href={code.redirectUrl} target="_blank" rel="noopener noreferrer" onClick={handleCta}
        aria-label={`Usar ${code.code}`}
        className="shrink-0 w-10 h-full flex items-center justify-center border-l border-white/[0.05] text-white/20 hover:text-white hover:bg-white/[0.04] transition-colors font-bold text-sm">
        →
      </a>
    </div>
  );
}
