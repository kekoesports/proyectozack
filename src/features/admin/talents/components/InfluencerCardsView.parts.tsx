'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as m from 'motion/react-client';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { parseFollowers, formatCompact } from '@/lib/utils/format';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import { setTalentStatusAction } from '@/app/admin/(dashboard)/talents/actions';
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

const STATUS_CYCLE: readonly TalentStatus[] = ['active', 'available', 'inactive'];

function nextStatus(current: TalentStatus): TalentStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? 'active';
}

type CardProps = {
  readonly creator: AdminRosterRow;
  readonly verticals: readonly TalentVertical[];
};

export function TalentCard({ creator, verticals }: CardProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<TalentStatus>(creator.status as TalentStatus);

  // Resolve status: prefer audienceStatus if set, fall back to optimistic status
  const displayStatus: string = creator.audienceStatus ?? optimisticStatus;
  const tone: Tone = STATUS_TONE[displayStatus] ?? 'neutral';
  const statusLabel: string = STATUS_LABELS[displayStatus] ?? displayStatus;
  const isPillClickable = !creator.audienceStatus;

  const handleStatusClick = (e: React.MouseEvent | React.KeyboardEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    const next = nextStatus(optimisticStatus);
    setOptimisticStatus(next);
    startTransition(async () => {
      const res = await setTalentStatusAction(creator.id, next);
      if (!res.success) {
        setOptimisticStatus(creator.status as TalentStatus);
      } else {
        router.refresh();
      }
    });
  };

  const handleStatusKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleStatusClick(e);
    }
  };

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
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ver perfil de ${creator.name}`}
      className="relative rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-sp-admin-accent focus-visible:outline-offset-2"
    >
      {/* Foto cuadrada centrada en cara */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})` }}
      >
        <Avatar creator={creator} />

        {/* Status badge — clickable cycles status when no audienceStatus override */}
        <div className="absolute top-2 right-2 z-10">
          {isPillClickable ? (
            <button
              type="button"
              onClick={handleStatusClick}
              onKeyDown={handleStatusKeyDown}
              disabled={isPending}
              aria-label={`Cambiar estado: ${statusLabel}`}
              className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-sp-admin-accent focus-visible:outline-offset-2 disabled:opacity-60"
            >
              <StateBadge tone={tone} variant="soft">{statusLabel}</StateBadge>
            </button>
          ) : (
            <StateBadge tone={tone} variant="soft">{statusLabel}</StateBadge>
          )}
        </div>

        {/* País */}
        {creator.creatorCountry && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm rounded px-1.5 py-0.5">
              {creator.creatorCountry}
            </span>
          </div>
        )}

        {/* Total followers — overlay inferior */}
        {totalFollowers !== null && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="text-base font-black text-white tabular-nums leading-none">{totalFollowers}</p>
            <p className="text-[8px] text-white/70 uppercase tracking-wide">seguidores</p>
          </div>
        )}
      </div>

      {/* Info compacta */}
      <div className="px-3 pt-2 pb-1">
        <p className="font-bold text-[12px] text-sp-admin-text truncate leading-tight">{creator.name}</p>
        {creator.game && <p className="text-[10px] text-sp-admin-muted truncate">{creator.game}</p>}

        {/* Platform chips — max 2 */}
        {platformChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {platformChips.slice(0, 2).map((chip) => (
              <StateBadge key={chip} tone="info" variant="dot">{chip}</StateBadge>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sp-admin-border/60 px-3 py-1.5 mt-auto">
        <span className="text-[9px] text-sp-admin-muted truncate block">{creator.role}</span>
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
      <Image
        src={creator.photoUrl}
        alt={creator.name}
        fill
        className="object-cover object-top"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-display text-4xl font-black text-white/90 select-none">
        {creator.initials}
      </span>
    </div>
  );
}
