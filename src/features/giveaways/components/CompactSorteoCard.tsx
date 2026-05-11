'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isIGamingBrand } from '@/lib/igaming';
import { GiveawayPrizePlaceholder } from './GiveawayPrizePlaceholder';
import type { GiveawayWithTalent } from '@/types';

function getCtaLabel(url: string): string {
  if (/twitter\.com|x\.com/i.test(url)) return 'Participar en X';
  if (/twitch\.tv/i.test(url)) return 'Ver en Twitch';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'Ver en YouTube';
  if (/instagram\.com/i.test(url)) return 'Ver en Instagram';
  return 'Participar';
}

function formatTimeLeft(endsAt: Date | null): string | null {
  if (!endsAt) return null;
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function deriveBadge(
  g: GiveawayWithTalent,
  isActive: boolean,
): { label: string; className: string } | null {
  if (!isActive) return null;
  if (g.isFeatured) return {
    label: '★ Destacado',
    className: 'bg-yellow-400/15 border-yellow-400/40 text-yellow-300',
  };
  if (g.badge) return {
    label: g.badge,
    className: 'bg-sp-orange/15 border-sp-orange/40 text-sp-orange',
  };
  const num = g.value ? parseFloat(g.value.replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
  if (num >= 200) return {
    label: '🔥 HOT',
    className: 'bg-orange-500/15 border-orange-400/35 text-orange-300',
  };
  if (g.endsAt) {
    const hoursLeft = (new Date(g.endsAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft < 48) return {
      label: '⚡ Acaba pronto',
      className: 'bg-red-500/15 border-red-400/30 text-red-300',
    };
  }
  return null;
}

type Props = {
  readonly giveaway: GiveawayWithTalent;
};

export function CompactSorteoCard({ giveaway }: Props): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const handleImgError = useCallback(() => setImgError(true), []);

  const isActive = giveaway.endsAt === null || new Date(giveaway.endsAt) > new Date();
  const needsAge18 = isIGamingBrand(giveaway.brandName);
  const badge = deriveBadge(giveaway, isActive);
  const timeLeft = isActive ? formatTimeLeft(giveaway.endsAt) : null;
  const ctaLabel = getCtaLabel(giveaway.redirectUrl);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
        isActive
          ? 'border-white/[0.08] bg-[#0c0c0c] hover:border-sp-orange/35 hover:shadow-[0_4px_36px_rgba(245,99,42,0.1)]'
          : 'border-white/[0.04] bg-[#0a0a0a] opacity-55'
      }`}
    >
      {/* Image area — aspect-[3/2] ≈ 180px on a 270px column */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-b from-white/[0.02] to-black/40">

        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-45 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(245,99,42,0.20) 0%, rgba(139,58,173,0.12) 55%, transparent 80%)' }}
          aria-hidden
        />

        {/* Prize image */}
        {giveaway.imageUrl && !imgError ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-contain p-5 drop-shadow-[0_0_20px_rgba(245,99,42,0.18)] transition-transform duration-500 group-hover:scale-[1.06] ${isActive ? 'gw-sp-float' : ''}`}
            onError={handleImgError}
          />
        ) : (
          <GiveawayPrizePlaceholder size="sm" />
        )}

        {/* Bottom fade for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/70 to-transparent pointer-events-none" />

        {/* Top-left: +18 + badge */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {needsAge18 && (
            <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/20 text-[9px] font-black text-white/60 backdrop-blur-sm">
              +18
            </span>
          )}
          {badge && (
            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider backdrop-blur-sm ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Top-right: brand logo */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {giveaway.brandLogo ? (
            <div className="w-8 h-8 rounded-lg bg-black/65 backdrop-blur-sm border border-white/10 flex items-center justify-center p-1.5">
              <img
                src={giveaway.brandLogo}
                alt={giveaway.brandName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sp-orange/20 border border-sp-orange/30 flex items-center justify-center text-[10px] font-black text-sp-orange">
              {giveaway.brandName.charAt(0)}
            </div>
          )}
        </div>

        {/* Bottom overlay: title + value + status */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.02em] text-white/92 leading-tight line-clamp-2 mb-1 group-hover:text-sp-orange/90 transition-colors duration-200">
            {giveaway.title}
          </h3>
          <div className="flex items-center gap-2">
            {giveaway.value && (
              <span className="text-sm font-black gw-sp-value leading-none">{giveaway.value}</span>
            )}
            {timeLeft && (
              <span className="text-[9px] font-bold text-white/40 tabular-nums">· ⏱ {timeLeft}</span>
            )}
            {isActive && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400/70">Activo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: creator + CTA */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.02] border-t border-white/[0.04]">
        {/* Creator avatar + name → link al perfil del talento (solo si visibility public) */}
        {giveaway.talent.visibility === 'public' ? (
          <Link
            href={`/talentos/${giveaway.talent.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="group/creator flex items-center gap-2 flex-1 min-w-0 hover:text-white/85 transition-colors"
            aria-label={`Ver perfil de ${giveaway.talent.name}`}
          >
            {giveaway.talent.photoUrl ? (
              <Image
                src={giveaway.talent.photoUrl}
                alt={giveaway.talent.name}
                width={20}
                height={20}
                className="rounded-full object-cover border border-white/10 shrink-0 group-hover/creator:border-white/30 transition-colors"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white/80 shrink-0"
                style={{ background: `linear-gradient(135deg, ${giveaway.talent.gradientC1}, ${giveaway.talent.gradientC2})` }}
              >
                {giveaway.talent.initials}
              </div>
            )}
            <span className="text-[10px] font-bold text-white/45 truncate group-hover/creator:text-white/80 transition-colors">
              {giveaway.talent.name}
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {giveaway.talent.photoUrl ? (
              <Image
                src={giveaway.talent.photoUrl}
                alt={giveaway.talent.name}
                width={20}
                height={20}
                className="rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white/80 shrink-0"
                style={{ background: `linear-gradient(135deg, ${giveaway.talent.gradientC1}, ${giveaway.talent.gradientC2})` }}
              >
                {giveaway.talent.initials}
              </div>
            )}
            <span className="text-[10px] font-bold text-white/45 truncate">{giveaway.talent.name}</span>
          </div>
        )}

        {/* CTA */}
        {isActive && (
          <a
            href={giveaway.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sp-grad text-white text-[10px] font-black uppercase tracking-[0.08em] hover:opacity-85 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {ctaLabel} →
          </a>
        )}
      </div>
    </div>
  );
}
