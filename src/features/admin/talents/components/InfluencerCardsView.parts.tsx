'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as m from 'motion/react-client';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { parseFollowers, formatCompact } from '@/lib/utils/format';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';

// ── Status → tone mapping ────────────────────────────────────────────

export type TalentStatus = 'active' | 'available' | 'inactive';

export const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  available: 'info',
  inactive: 'neutral',
  // audienceStatus values
  activo: 'success',
  inactivo: 'neutral',
  pendiente: 'warning',
  potencial: 'info',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
  activo: 'Activo',
  inactivo: 'Inactivo',
  pendiente: 'Pendiente',
  potencial: 'Potencial',
};

export const PLATFORM_LABELS: Record<string, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  twitter: 'X',
  kick: 'Kick',
};

// ── Card ─────────────────────────────────────────────────────────────

type CardProps = {
  readonly creator: AdminRosterRow;
  readonly verticals: readonly TalentVertical[];
};

export function TalentCard({ creator, verticals }: CardProps): React.ReactElement {
  const router = useRouter();

  // Resolve status: prefer audienceStatus if set, fall back to status
  const displayStatus: string = creator.audienceStatus ?? creator.status;
  const tone: Tone = STATUS_TONE[displayStatus] ?? 'neutral';
  const statusLabel: string = STATUS_LABELS[displayStatus] ?? displayStatus;

  // Platform chips: from socials (up to 3)
  const platformChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: string[] = [];
    for (const s of creator.socials) {
      const key = s.platform.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        chips.push(key);
      }
      if (chips.length >= 3) break;
    }
    // Fallback to verticals if no socials
    if (chips.length === 0) {
      return verticals.slice(0, 3).map((v) => TALENT_VERTICAL_LABELS[v] ?? v);
    }
    return chips.map((p) => PLATFORM_LABELS[p] ?? p);
  }, [creator.socials, verticals]);

  // Total followers
  const totalFollowers = useMemo(() => {
    if (creator.socials.length === 0) return null;
    const total = creator.socials.reduce(
      (sum, s) => sum + parseFollowers(s.followersDisplay),
      0,
    );
    return total > 0 ? formatCompact(total) : null;
  }, [creator.socials]);

  const handleClick = (): void => {
    router.push(`/admin/talents/${creator.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <m.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ver perfil de ${creator.name}`}
      className="relative rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-sp-admin-accent focus-visible:outline-offset-2"
    >
      {/* Status badge — top right */}
      <div className="absolute top-3 right-3 z-10">
        <StateBadge tone={tone} variant="soft">
          {statusLabel}
        </StateBadge>
      </div>

      {/* Avatar area */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4 gap-3">
        <Avatar creator={creator} />

        {/* Name + slug */}
        <div className="text-center min-w-0 w-full">
          <p className="font-bold text-sp-admin-text truncate text-sm leading-tight">
            {creator.name}
          </p>
          <p className="text-[11px] text-sp-admin-muted truncate mt-0.5">
            @{creator.slug}
          </p>
        </div>

        {/* Platform chips */}
        {platformChips.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {platformChips.map((chip) => (
              <StateBadge key={chip} tone="info" variant="dot">
                {chip}
              </StateBadge>
            ))}
          </div>
        )}

        {/* Total followers */}
        <div className="text-center">
          {totalFollowers !== null ? (
            <>
              <p className="text-2xl font-black text-sp-admin-text tabular-nums leading-none">
                {totalFollowers}
              </p>
              <p className="text-[10px] text-sp-admin-muted uppercase tracking-wider mt-0.5">
                seguidores
              </p>
            </>
          ) : (
            <p className="text-2xl font-black text-sp-admin-muted leading-none">—</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-sp-admin-border px-4 py-2.5 flex items-center justify-between gap-2 mt-auto">
        <span className="text-[10px] text-sp-admin-muted truncate">
          {creator.role}{creator.game ? ` · ${creator.game}` : ''}
        </span>
        {creator.creatorCountry && (
          <span className="shrink-0 text-[10px] uppercase tracking-wider font-mono font-semibold text-sp-admin-muted border border-sp-admin-border rounded px-1.5 py-0.5">
            {creator.creatorCountry}
          </span>
        )}
      </div>
    </m.div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────

type AvatarProps = {
  readonly creator: AdminRosterRow;
};

function Avatar({ creator }: AvatarProps): React.ReactElement {
  if (creator.photoUrl) {
    return (
      <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-sp-admin-border">
        <Image
          src={creator.photoUrl}
          alt={creator.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
    );
  }

  return (
    <div
      className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center ring-2 ring-sp-admin-border"
      style={{
        background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})`,
      }}
    >
      <span className="font-display text-2xl font-black text-white/90 select-none">
        {creator.initials}
      </span>
    </div>
  );
}
