'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CountdownTimer } from '@/components/creadores/CountdownTimer';
import type { GiveawayWithTalent } from '@/types';

function getCtaLabel(url: string): string {
  if (/twitter\.com|x\.com/i.test(url)) return 'Participar en Twitter / X';
  if (/twitch\.tv/i.test(url)) return 'Participar en Twitch';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'Participar en YouTube';
  if (/instagram\.com/i.test(url)) return 'Participar en Instagram';
  return 'Participar en el sorteo';
}

type SorteoCardProps = {
  readonly giveaway: GiveawayWithTalent;
};

export function SorteoCard({ giveaway }: SorteoCardProps): React.JSX.Element {
  const [expired, setExpired] = useState(false);
  const isActive = !expired && new Date(giveaway.endsAt) > new Date();
  const handleExpired = useCallback(() => setExpired(true), []);

  const numericValue = giveaway.value
    ? parseFloat(giveaway.value.replace(/[^\d.,]/g, '').replace(',', '.'))
    : 0;
  const isHot = isActive && numericValue >= 200;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
        isActive
          ? 'border-white/[0.08] bg-[#0c0c0c] hover:border-sp-orange/35 hover:shadow-[0_4px_40px_rgba(245,99,42,0.1)]'
          : 'border-white/[0.04] bg-[#0a0a0a] opacity-55'
      }`}
    >
      {/* Brand bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.03] border-b border-white/[0.05]">
        {giveaway.brandLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={giveaway.brandLogo}
            alt={giveaway.brandName}
            className="h-6 w-6 rounded object-contain bg-white/5 p-0.5 shrink-0"
          />
        ) : (
          <div className="h-6 w-6 rounded bg-sp-orange/20 flex items-center justify-center text-[10px] font-black text-sp-orange shrink-0">
            {giveaway.brandName.charAt(0)}
          </div>
        )}
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70 truncate flex-1">
          {giveaway.brandName}
        </span>
        {isActive ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">En directo</span>
          </div>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-wider text-white/25 shrink-0">Finalizado</span>
        )}
      </div>

      {/* Prize image */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-b from-white/[0.02] to-black/30">
        {isHot && (
          <div className="absolute top-3 right-3 z-10 gw-hot-badge">
            <div className="px-2.5 py-1 rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_14px_rgba(239,68,68,0.4)]">
              🔥 HOT
            </div>
          </div>
        )}
        <div
          className="absolute inset-0 opacity-25 transition-opacity duration-500 group-hover:opacity-50"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(245,99,42,0.18) 0%, rgba(139,58,173,0.1) 50%, transparent 80%)' }}
          aria-hidden
        />
        {giveaway.imageUrl ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={`object-contain p-8 drop-shadow-[0_0_24px_rgba(245,99,42,0.2)] transition-transform duration-500 group-hover:scale-105 ${isActive ? 'gw-sp-float' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-6xl font-black">?</div>
        )}
      </div>

      {/* Info */}
      <div className="px-5 pt-4 pb-3 flex-1">
        <h3 className="font-display text-xl font-black uppercase tracking-[0.04em] text-white/90 leading-tight line-clamp-2 mb-2">
          {giveaway.title}
        </h3>
        {giveaway.value && (
          <p className="text-3xl font-black gw-sp-value">{giveaway.value}</p>
        )}
      </div>

      {/* Countdown */}
      <div className="px-5 pb-4 flex justify-center">
        {isActive ? (
          <CountdownTimer endsAt={giveaway.endsAt.toISOString()} onExpiredAction={handleExpired} />
        ) : (
          <div className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25">Sorteo finalizado</span>
          </div>
        )}
      </div>

      {/* Creator footer */}
      <div className="flex items-center gap-2.5 px-5 py-3 bg-white/[0.02] border-t border-white/[0.05]">
        {giveaway.talent.photoUrl ? (
          <Image
            src={giveaway.talent.photoUrl}
            alt={giveaway.talent.name}
            width={24}
            height={24}
            className="rounded-full object-cover border border-white/10 shrink-0"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white/80 shrink-0"
            style={{ background: `linear-gradient(135deg, ${giveaway.talent.gradientC1}, ${giveaway.talent.gradientC2})` }}
          >
            {giveaway.talent.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 leading-none">Sorteo de</p>
          <p className="text-[12px] font-bold text-white/70 truncate leading-tight mt-0.5">{giveaway.talent.name}</p>
        </div>
        <Link
          href={`/c/${giveaway.talent.slug}`}
          title={`Ver perfil de ${giveaway.talent.name}`}
          className="text-white/20 hover:text-sp-orange/60 text-xs transition-colors"
        >
          ↗
        </Link>
      </div>

      {/* CTA */}
      {isActive && (
        <div className="px-5 pb-5 pt-1">
          <a
            href={giveaway.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sp-grad text-white text-[12px] font-black uppercase tracking-[0.12em] gw-sp-btn-glow transition-all hover:tracking-[0.18em] hover:opacity-90"
          >
            {getCtaLabel(giveaway.redirectUrl)}
            <span aria-hidden>→</span>
          </a>
        </div>
      )}
    </div>
  );
}
