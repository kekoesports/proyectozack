'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as m from 'motion/react-client';
import { StateBadge } from '@/components/admin/ui/StateBadge';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { parseFollowers, formatCompact } from '@/lib/format';
import { TALENT_VERTICAL_LABELS, TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import type { Tone } from '@/components/admin/ui/StateBadge';

// ── Status → tone mapping ────────────────────────────────────────────

type TalentStatus = 'active' | 'available' | 'inactive';

const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  available: 'info',
  inactive: 'neutral',
  // audienceStatus values
  activo: 'success',
  inactivo: 'neutral',
  pendiente: 'warning',
  potencial: 'info',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
  activo: 'Activo',
  inactivo: 'Inactivo',
  pendiente: 'Pendiente',
  potencial: 'Potencial',
};

const PLATFORM_LABELS: Record<string, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  twitter: 'X',
  kick: 'Kick',
};

// ── Props ────────────────────────────────────────────────────────────

type Props = {
  readonly creators: readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

// ── Main component ───────────────────────────────────────────────────

export function InfluencerCardsView({ creators, verticalsByTalent }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TalentStatus | 'all'>('all');
  const [verticalFilter, setVerticalFilter] = useState<TalentVertical | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) for (const s of c.socials) set.add(s.platform);
    return [...set].sort();
  }, [creators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creators.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (verticalFilter) {
        const vs = verticalsByTalent[c.id] ?? [];
        if (!vs.includes(verticalFilter)) return false;
      }
      if (platformFilter && !c.socials.some((s) => s.platform === platformFilter)) return false;
      return true;
    });
  }, [creators, search, statusFilter, verticalFilter, platformFilter, verticalsByTalent]);

  const counts = useMemo(() => {
    let active = 0, available = 0, inactive = 0;
    for (const c of creators) {
      if (c.status === 'active') active++;
      else if (c.status === 'available') available++;
      else if (c.status === 'inactive') inactive++;
    }
    return { active, available, inactive };
  }, [creators]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sp-admin-card border border-sp-admin-border p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="min-w-[220px] flex-1 rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TalentStatus | 'all')}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="all">Todos ({creators.length})</option>
          <option value="active">Activos ({counts.active})</option>
          <option value="available">Disponibles ({counts.available})</option>
          <option value="inactive">Inactivos ({counts.inactive})</option>
        </select>

        <select
          value={verticalFilter}
          onChange={(e) => setVerticalFilter(e.target.value as TalentVertical | '')}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="">Todos los sectores</option>
          {TALENT_VERTICALS.map((v) => (
            <option key={v} value={v}>{TALENT_VERTICAL_LABELS[v]}</option>
          ))}
        </select>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="">Todas plataformas</option>
          {platforms.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>
          ))}
        </select>

        <span className="text-xs text-sp-admin-muted tabular-nums ml-auto">
          {filtered.length} / {creators.length}
        </span>
      </div>

      {/* Grid / Empty state */}
      {filtered.length === 0 ? (
        creators.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Sin talentos"
            description="Importa talentos para empezar"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Importar
              </button>
            }
          />
        ) : (
          <EmptyState
            variant="no-results"
            title="Sin resultados"
            description="Prueba con otros filtros"
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <TalentCard
              key={c.id}
              creator={c}
              verticals={verticalsByTalent[c.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────

type CardProps = {
  readonly creator: AdminRosterRow;
  readonly verticals: readonly TalentVertical[];
};

function TalentCard({ creator, verticals }: CardProps): React.ReactElement {
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
