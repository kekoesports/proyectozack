'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GiveawayPrizePlaceholder } from './GiveawayPrizePlaceholder';
import type { GiveawayWithTalent } from '@/types';

type Props = {
  readonly giveaway: GiveawayWithTalent;
  readonly finished?: boolean;
};

function CountdownDisplay({ diffMs }: { diffMs: number }): React.ReactElement {
  if (diffMs <= 0) return <span className="text-white/30 text-[10px] font-bold">Finalizado</span>;
  const d = Math.floor(diffMs / 86400000);
  const h = Math.floor((diffMs % 86400000) / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (d > 0) return <span className="text-[#C3FC00] text-[11px] font-black tabular-nums">{d}d {h}h</span>;
  if (h > 0) return <span className="text-[#C3FC00] text-[11px] font-black tabular-nums">{h}h {m}m</span>;
  return <span className="text-amber-400 text-[11px] font-black tabular-nums">{m}m</span>;
}

/**
 * Variante compacta horizontal de sorteo — usada en el perfil de creador.
 * ~80px de alto vs ~450px de GiveawayHubCard original.
 */
export function GiveawayRow({ giveaway, finished = false }: Props): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const [nowMs]                 = useState(Date.now);
  const isActive  = !finished && (giveaway.endsAt === null || giveaway.endsAt.getTime() > nowMs);
  const diffMs    = giveaway.endsAt ? giveaway.endsAt.getTime() - nowMs : null;

  return (
    <div className={`group flex items-center gap-0 rounded-xl border overflow-hidden transition-colors ${
      finished
        ? 'border-white/[0.04] bg-[#0d0d0d]/60 opacity-60'
        : 'border-white/[0.07] bg-[#0d0d0d] hover:border-white/15'
    }`}>

      {/* Miniatura premio */}
      <div className="w-20 h-16 shrink-0 relative bg-gradient-to-b from-white/[0.04] to-transparent border-r border-white/[0.06]">
        {giveaway.imageUrl && !imgError ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="80px"
            className="object-contain p-1.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <GiveawayPrizePlaceholder size="sm" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-2.5">
        {/* Marca + título */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {giveaway.brandLogo ? (
              <Image src={giveaway.brandLogo} alt={giveaway.brandName} width={14} height={14} className="object-contain rounded-sm opacity-70" />
            ) : null}
            <span className="text-[9px] font-black uppercase tracking-widest text-white/35">{giveaway.brandName}</span>
            {isActive && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-[#C3FC00]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                Live
              </span>
            )}
          </div>
          <p className="text-[13px] font-bold text-white/85 truncate leading-tight">{giveaway.title}</p>
        </div>

        {/* Valor */}
        {giveaway.value && (
          <div className="shrink-0 text-right hidden sm:block">
            <span className="text-[13px] font-black text-white/80 tabular-nums">{giveaway.value}</span>
          </div>
        )}

        {/* Countdown */}
        <div className="shrink-0 text-right min-w-[52px]">
          {diffMs !== null
            ? <CountdownDisplay diffMs={diffMs} />
            : <span className="text-white/25 text-[10px]">Sin fecha</span>
          }
        </div>
      </div>

      {/* CTA */}
      {!finished ? (
        <a
          href={giveaway.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center justify-center px-4 h-full bg-[#C3FC00]/10 border-l border-[#C3FC00]/10 text-[#C3FC00] text-[10px] font-black uppercase tracking-wider hover:bg-[#C3FC00]/20 transition-colors"
        >
          Entrar →
        </a>
      ) : (
        <div className="shrink-0 px-4 h-full flex items-center border-l border-white/[0.04]">
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Ended</span>
        </div>
      )}
    </div>
  );
}
