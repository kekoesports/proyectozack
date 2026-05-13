import Image from 'next/image';
import type { GiveawayWinnerFull } from '@/types';

type Props = {
  winners: GiveawayWinnerFull[];
  variant?: 'compact' | 'full';
  emptyMessage?: string;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Compact — fila pequeña ────────────────────────────────────────────────

function WinnerCompact({ w }: { w: GiveawayWinnerFull }) {
  const _talent = w.giveaway.talent;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
      {/* Prize image */}
      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-white/[0.04]">
        {w.giveaway.imageUrl ? (
          <Image src={w.giveaway.imageUrl} alt={w.giveaway.title} fill className="object-contain p-0.5" sizes="40px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white/20">
            {w.giveaway.brandName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white/80 truncate">{w.winnerName}</p>
        <p className="text-[10px] text-white/35 truncate">{w.giveaway.title}</p>
      </div>
      {/* Meta */}
      <div className="text-right shrink-0">
        {w.giveaway.value && (
          <p className="text-[11px] font-black text-white/60">{w.giveaway.value}</p>
        )}
        <p className="text-[9px] text-white/25">{formatDate(w.wonAt)}</p>
      </div>
    </div>
  );
}

// ── Full — card horizontal ────────────────────────────────────────────────

function WinnerFull({ w }: { w: GiveawayWinnerFull }) {
  const talent   = w.giveaway.talent;
  const proofUrl = w.proofUrl;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {/* Prize image */}
      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-white/[0.05]">
        {w.giveaway.imageUrl ? (
          <Image src={w.giveaway.imageUrl} alt={w.giveaway.title} fill className="object-contain p-1" sizes="64px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-black text-white/20">
            {w.giveaway.brandName.slice(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info central */}
      <div className="flex-1 min-w-0">
        {/* Winner */}
        <div className="flex items-center gap-2 mb-0.5">
          {w.winnerAvatar ? (
            <Image src={w.winnerAvatar} alt={w.winnerName} width={16} height={16} className="rounded-full" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-sp-orange/30 flex items-center justify-center text-[7px] font-black text-sp-orange">
              {w.winnerName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-[12px] font-black text-white/90">{w.winnerName}</span>
          <span className="text-[9px] text-white/30">ganó</span>
        </div>
        {/* Premio */}
        <p className="text-[11px] text-white/55 truncate mb-1">{w.giveaway.title}</p>
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/25 border border-white/[0.08] rounded px-1.5 py-0.5">
            {w.giveaway.brandName}
          </span>
          {talent && (
            <span className="text-[9px] text-white/20">con {talent.name}</span>
          )}
          <span className="text-[9px] text-white/20">{formatDate(w.wonAt)}</span>
        </div>
      </div>

      {/* Valor + proof */}
      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        {w.giveaway.value && (
          <span className="text-[13px] font-black text-white/70">{w.giveaway.value}</span>
        )}
        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-bold text-sp-orange/70 hover:text-sp-orange transition-colors uppercase tracking-wider"
          >
            Ver prueba →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────────────────

export function WinnersList({ winners, variant = 'full', emptyMessage }: Props) {
  if (winners.length === 0) {
    return (
      <p className="text-sm text-white/30 py-4">
        {emptyMessage ?? 'Próximamente: aquí aparecerán los ganadores.'}
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div>
        {winners.map((w) => <WinnerCompact key={w.id} w={w} />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {winners.map((w) => <WinnerFull key={w.id} w={w} />)}
    </div>
  );
}
