'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as m from 'motion/react-client';
import { parseFollowers, formatCompact } from '@/lib/utils/format';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import { setTalentStatusAction } from '@/app/admin/(dashboard)/talents/actions';
import { getFlagImageUrl, countryFlagEmoji } from '@/lib/flag-images';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';

// ── Status → tone mapping ────────────────────────────────────────────

export type TalentStatus = 'active' | 'available' | 'inactive';

export const STATUS_TONE: Record<string, Tone> = {
  active:    'success',
  available: 'info',
  inactive:  'neutral',
  activo:    'success',
  inactivo:  'neutral',
  pendiente: 'warning',
  potencial: 'info',
};

export const STATUS_LABELS: Record<string, string> = {
  active:    'Activo',
  available: 'Disponible',
  inactive:  'Inactivo',
  activo:    'Activo',
  inactivo:  'Inactivo',
  pendiente: 'Pendiente',
  potencial: 'Potencial',
};

export const PLATFORM_LABELS: Record<string, string> = {
  twitch:    'Twitch',
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  x:         'X',
  twitter:   'X',
  kick:      'Kick',
};

// Colores de plataforma para el dot indicator
const PLATFORM_DOT: Record<string, string> = {
  twitch:    '#9147ff',
  youtube:   '#ff0000',
  instagram: '#e1306c',
  tiktok:    '#010101',
  x:         '#1da1f2',
  twitter:   '#1da1f2',
  kick:      '#53fc18',
};

// Status config para el badge de footer
type StatusCfg = { dot: string; label: string; bg: string; text: string };
const STATUS_CFG = {
  active:    { dot: '#16a34a', label: 'Activo',     bg: 'bg-emerald-50', text: 'text-emerald-700' },
  available: { dot: '#5b9bd5', label: 'Disponible', bg: 'bg-blue-50',    text: 'text-blue-700'    },
  inactive:  { dot: '#9ca3af', label: 'Inactivo',   bg: 'bg-slate-100',  text: 'text-slate-500'   },
} as const satisfies Record<string, StatusCfg>;

// ── Card ─────────────────────────────────────────────────────────────

const STATUS_CYCLE: readonly TalentStatus[] = ['active', 'available', 'inactive'];

function nextStatus(current: TalentStatus): TalentStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? 'active';
}

type CardProps = {
  readonly creator:        AdminRosterRow;
  readonly verticals:      readonly TalentVertical[];
  readonly selectMode?:    boolean;
  readonly selected?:      boolean;
  readonly onToggleSelect?: (id: number) => void;
};

export function TalentCard({ creator, verticals, selectMode, selected, onToggleSelect }: CardProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<TalentStatus>(creator.status as TalentStatus);

  const displayStatus: string = creator.audienceStatus ?? optimisticStatus;
  const statusCfg = STATUS_CFG[optimisticStatus] ?? STATUS_CFG.inactive;
  const isPillClickable = !creator.audienceStatus;

  // Plataformas únicas (máx 4 para los dots)
  const _platforms = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of creator.socials) {
      const k = s.platform.toLowerCase();
      if (!seen.has(k)) { seen.add(k); list.push(k); }
      if (list.length >= 4) break;
    }
    return list;
  }, [creator.socials]);


  // Sectores como badges (máx 2)
  const sectorBadges = useMemo(() =>
    verticals.slice(0, 2).map((v) => TALENT_VERTICAL_LABELS[v] ?? v),
  [verticals]);

  function handleStatusCycle(e: React.MouseEvent | React.KeyboardEvent): void {
    e.stopPropagation();
    if (!isPillClickable) return;
    const next = nextStatus(optimisticStatus);
    setOptimisticStatus(next);
    startTransition(async () => {
      const res = await setTalentStatusAction(creator.id, next);
      if (!res.success) setOptimisticStatus(creator.status as TalentStatus);
      else router.refresh();
    });
  }

  function handleCardClick(): void {
    if (selectMode) { onToggleSelect?.(creator.id); return; }
    router.push(`/admin/talents/${creator.id}`);
  }

  return (
    <m.div
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      data-selected={selected || undefined}
      className={`group relative rounded-xl bg-sp-admin-card shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-sp-admin-accent focus-visible:outline-offset-2 transition-shadow ${selected ? 'ring-2 ring-sp-admin-accent' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={selectMode ? `Seleccionar ${creator.name}` : `Ver perfil de ${creator.name}`}
    >

      {/* ── Checkbox de selección ──────────────────────────────── */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-20">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selected ? 'bg-sp-admin-accent border-sp-admin-accent' : 'bg-white/80 border-white/60'}`}>
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* ── Imagen — limpia, solo bandera discreta ─────────────── */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})` }}
      >
        <Avatar creator={creator} />

        {/* Bandera — solo emoji/img, sin texto, esquina superior derecha */}
        {creator.creatorCountry && (() => {
          const flagUrl   = getFlagImageUrl(creator.creatorCountry);
          const flagEmoji = countryFlagEmoji(creator.creatorCountry);
          return (
            <div className="absolute top-2 right-2 z-10">
              {flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flagUrl}
                  alt={creator.creatorCountry}
                  title={creator.creatorCountry}
                  className="w-5 h-5 rounded-sm object-cover shadow-sm opacity-90"
                />
              ) : (
                <span className="text-base leading-none" title={creator.creatorCountry}>{flagEmoji}</span>
              )}
            </div>
          );
        })()}

        {/* Overlay de acciones — aparece en hover */}
        {!selectMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Link
              href={`/admin/talents/${creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 px-3 rounded-full bg-white/90 text-[11px] font-bold text-sp-admin-text hover:bg-white transition-colors shadow-sm"
            >
              Ver perfil
            </Link>
            <Link
              href={`/admin/talents/${creator.id}`}
              onClick={(e) => e.stopPropagation()}
              className="h-7 px-3 rounded-full bg-sp-admin-accent/90 text-[11px] font-bold text-white hover:bg-sp-admin-accent transition-colors shadow-sm"
            >
              Editar
            </Link>
          </div>
        )}
      </div>

      {/* ── Cuerpo: nombre, sector, redes + números ────────────── */}
      <div className="px-3 pt-2.5 pb-2 flex-1 flex flex-col">
        {/* Nombre */}
        <p className="font-bold text-[13px] text-sp-admin-text truncate leading-tight">{creator.name}</p>

        {/* Sector como badge compacto */}
        {sectorBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {sectorBadges.map((s) => (
              <span
                key={s}
                className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sp-admin-hover border border-sp-admin-border/60 text-sp-admin-muted"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Redes con seguidores — una fila por plataforma */}
        {creator.socials.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-2">
            {creator.socials.slice(0, 3).map((s) => {
              const count = parseFollowers(s.followersDisplay);
              const pKey  = s.platform.toLowerCase();
              return (
                <div key={s.platform} className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: PLATFORM_DOT[pKey] ?? '#888' }}
                    />
                    <span className="text-[10px] text-sp-admin-muted font-medium">
                      {PLATFORM_LABELS[pKey] ?? s.platform}
                    </span>
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold text-sp-admin-text tabular-nums">
                      {formatCompact(count)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer: estado + tratos activos ────────────────────── */}
      <div className="border-t border-sp-admin-border/50 px-3 py-2 flex items-center justify-between gap-2 mt-auto">
        {isPillClickable ? (
          <button
            type="button"
            onClick={handleStatusCycle}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStatusCycle(e)}
            disabled={isPending}
            title="Clic para cambiar estado"
            aria-label={`Estado: ${statusCfg.label}. Clic para cambiar.`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity ${statusCfg.bg} ${statusCfg.text}`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusCfg.dot }} />
            {statusCfg.label}
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusCfg.dot }} />
            {STATUS_LABELS[displayStatus] ?? displayStatus}
          </span>
        )}

        {/* Badge de visibilidad */}
        {!creator.isPublished ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-sp-admin-border/60 text-sp-admin-muted">
            Borrador
          </span>
        ) : creator.showInRoster ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700">
            En roster
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700">
            No listado
          </span>
        )}

        {/* Badge de tratos activos */}
        {(creator.activeDealsCount ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-sp-admin-accent/10 text-sp-admin-accent">
            {creator.activeDealsCount} {creator.activeDealsCount === 1 ? 'trato' : 'tratos'}
          </span>
        )}

      </div>
    </m.div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────

type AvatarProps = { readonly creator: AdminRosterRow };

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
