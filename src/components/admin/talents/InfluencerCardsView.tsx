'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useMemo, useState, useTransition } from 'react';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import { TALENT_VERTICAL_LABELS, TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';
import { setTalentStatusAction } from '@/app/admin/(dashboard)/talents/actions';
import { exportTalentsToExcel } from './TalentExport';
import { AddTalentModal } from './AddTalentModal';
import { getFlagImageUrl, countryFlagEmoji } from '@/lib/flag-images';

// 'available' se trata como 'active' visualmente — solo ofrecemos Activo/Inactivo
type TalentStatus = 'active' | 'available' | 'inactive';

const STATUS_LABELS: Record<TalentStatus, string> = {
  active:    'Activo',
  available: 'Activo',   // visible = Activo
  inactive:  'Inactivo',
};

const STATUS_ACTIVE_STYLE: Record<TalentStatus, string> = {
  active:    'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
  available: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
  inactive:  'bg-slate-400 text-white shadow-sm',
};

// ── Helpers ───────────────────────────────────────────────────────────

// countryFlag ahora usa getFlagImageUrl + countryFlagEmoji del módulo flag-images

/** Parsea correctamente "46.6K" → 46600, "1.2M" → 1200000, "63" → 63 */
function parseFollowerCount(display: string): number {
  const s = display.trim();
  if (!s || s === '—' || s === '-') return 0;
  const upper = s.toUpperCase();
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;
  if (upper.includes('M')) return Math.round(num * 1_000_000);
  if (upper.includes('K')) return Math.round(num * 1_000);
  return Math.round(num);
}

/** Formatea un número total de seguidores en formato compacto */
function formatFollowers(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const PLATFORM_COLOR: Record<string, string> = {
  twitch:    '#9147ff',
  youtube:   '#ff0000',
  instagram: '#e1306c',
  tiktok:    '#000000',
  x:         '#1da1f2',
  twitter:   '#1da1f2',
  kick:      '#53fc18',
};

const PLATFORM_LABEL: Record<string, string> = {
  twitch:    'Twitch',
  youtube:   'YouTube',
  instagram: 'IG',
  tiktok:    'TikTok',
  x:         'X',
  twitter:   'X',
  kick:      'Kick',
};

type Props = {
  readonly creators: readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

export function InfluencerCardsView({ creators, verticalsByTalent }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TalentStatus | 'all'>('all');
  const [verticalFilter, setVerticalFilter] = useState<TalentVertical | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');

  // Modal añadir talento
  const [showAdd, setShowAdd] = useState(false);

  // Selección para exportar
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  // handleExport se define después de filtered (más abajo)

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) for (const s of c.socials) set.add(s.platform);
    return [...set].sort();
  }, [creators]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) if (c.creatorCountry) set.add(c.creatorCountry.toUpperCase());
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
      if (countryFilter && (c.creatorCountry ?? '').toUpperCase() !== countryFilter) return false;
      return true;
    });
  }, [creators, search, statusFilter, verticalFilter, platformFilter, countryFilter, verticalsByTalent]);

  const counts = useMemo(() => {
    let active = 0, available = 0, inactive = 0;
    for (const c of creators) {
      if (c.status === 'active') active++;
      else if (c.status === 'available') available++;
      else if (c.status === 'inactive') inactive++;
    }
    return { active, available, inactive };
  }, [creators]);

  const handleExport = useCallback(() => {
    const toExport = selectedIds.size > 0
      ? creators.filter((c) => selectedIds.has(c.id))
      : filtered;
    exportTalentsToExcel(toExport, verticalsByTalent);
  }, [selectedIds, creators, filtered, verticalsByTalent]);

  const INPUT_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  return (
    <div className="space-y-4">
      {/* KPI rápido */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Activos',   value: counts.active + counts.available, color: '#16a34a', filter: 'active' as TalentStatus },
          { label: 'Inactivos', value: counts.inactive,                  color: '#72728a', filter: 'inactive' as TalentStatus },
          { label: 'Total',     value: creators.length,                  color: '#f5632a', filter: 'all' as const },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(s.filter === 'all' ? 'all' : (statusFilter === s.filter ? 'all' : s.filter as TalentStatus | 'all'))}
            className={`rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden text-left hover:shadow-md transition-shadow ${statusFilter === s.filter ? 'ring-1 ring-sp-admin-accent/40' : ''}`}
          >
            <div className="h-[2px]" style={{ background: s.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{s.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtros + botón añadir */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar influencer…"
          className={`${INPUT_CLS} flex-1 min-w-[180px]`}
        />
        <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value as TalentVertical | '')} className={INPUT_CLS}>
          <option value="">Todos los sectores</option>
          {TALENT_VERTICALS.map((v) => <option key={v} value={v}>{TALENT_VERTICAL_LABELS[v]}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">Todas las plataformas</option>
          {platforms.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        {countries.length > 0 && (
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>{countryFlagEmoji(c)} {c}</option>
            ))}
          </select>
        )}
        {/* Botón añadir talento */}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
        >
          + Añadir talento
        </button>

        <span className="text-[11px] text-sp-admin-muted tabular-nums">{filtered.length} de {creators.length}</span>

        {/* Exportar */}
        {!selectMode ? (
          <button
            type="button"
            onClick={() => setSelectMode(true)}
            className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M7 1v12M1 7h12"/>
            </svg>
            Exportar Excel
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectAll(filtered.map((c) => c.id))}
              className="h-8 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover transition-colors"
            >
              Sel. todos ({filtered.length})
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
            >
              ⬇ Descargar{selectedIds.size > 0 ? ` (${selectedIds.size})` : ` todo (${filtered.length})`}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Grid — más columnas para cards más pequeñas */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-sm text-sp-admin-muted">Sin resultados con los filtros actuales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
            <InfluencerCard
              key={c.id}
              creator={c}
              verticals={verticalsByTalent[c.id] ?? []}
              selectMode={selectMode}
              selected={selectedIds.has(c.id)}
              onToggleSelect={() => toggleSelect(c.id)}
            />
          ))}
        </div>
      )}

      {/* Modal añadir talento */}
      {showAdd && <AddTalentModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

type CardProps = {
  readonly creator: AdminRosterRow;
  readonly verticals: readonly TalentVertical[];
  readonly selectMode?: boolean;
  readonly selected?: boolean;
  readonly onToggleSelect?: () => void;
};

function InfluencerCard({ creator, verticals, selectMode = false, selected = false, onToggleSelect }: CardProps): React.ReactElement {
  const [status, setStatus] = useState<TalentStatus>(creator.status as TalentStatus);
  const [pending, startTransition] = useTransition();

  const onChangeStatus = (next: TalentStatus): void => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const r = await setTalentStatusAction(creator.id, next);
      if (!r.success) setStatus(prev);
    });
  };

  // Total seguidores correctamente calculado
  const totalFollowers = useMemo(() => {
    if (creator.socials.length === 0) return null;
    const total = creator.socials.reduce((sum, s) => sum + parseFollowerCount(s.followersDisplay), 0);
    if (total === 0) return null;
    return formatFollowers(total);
  }, [creator.socials]);

  return (
    <Link
      href={`/admin/talents/${creator.id}`}
      className="group rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Foto cuadrada — centrada en la cara */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})` }}
      >
        {creator.photoUrl ? (
          <Image
            src={creator.photoUrl}
            alt={creator.name}
            fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-white/90">{creator.initials}</span>
          </div>
        )}

        {/* Overlay degradado para legibilidad */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Plataformas con seguidores — overlay inferior */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div>
            {creator.socials.slice(0, 2).map((s) => {
              const key = s.platform.toLowerCase();
              const color = PLATFORM_COLOR[key] ?? '#fff';
              const label = PLATFORM_LABEL[key] ?? s.platform.slice(0, 2).toUpperCase();
              return (
                <div key={s.id} className="flex items-center gap-1 mb-0.5">
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[6px] font-black shrink-0"
                    style={{ background: color }}>
                    {label.charAt(0)}
                  </div>
                  <span className="text-[11px] font-bold text-white tabular-nums leading-none">
                    {s.followersDisplay || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dot de estado o checkbox de selección */}
        <div className="absolute top-2 right-2">
          {selectMode ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggleSelect?.(); }}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-sp-admin-accent border-sp-admin-accent text-white'
                  : 'bg-white/80 border-white/60'
              }`}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ) : (
            <span className={`w-2.5 h-2.5 rounded-full block ${
              status === 'inactive' ? 'bg-slate-400' : 'bg-emerald-500'
            } ring-2 ring-white/80`} />
          )}
        </div>

        {/* Bandera del país — top left (imagen redonda si existe, emoji si no) */}
        {creator.creatorCountry && (() => {
          const imgUrl = getFlagImageUrl(creator.creatorCountry);
          return (
            <div className="absolute top-2 left-2" title={creator.creatorCountry}>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={creator.creatorCountry}
                  className="w-6 h-6 rounded-full object-cover drop-shadow-md ring-1 ring-white/50"
                />
              ) : (
                <span className="text-xl leading-none drop-shadow-md">
                  {countryFlagEmoji(creator.creatorCountry)}
                </span>
              )}
            </div>
          );
        })()}

        {/* Plataformas — bottom right con puntos de color */}
        {creator.socials.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
            {creator.socials.slice(0, 3).map((s) => {
              const key = s.platform.toLowerCase();
              const color = PLATFORM_COLOR[key] ?? '#ffffff';
              const label = PLATFORM_LABEL[key] ?? s.platform;
              return (
                <div
                  key={s.id}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[6px] font-black shrink-0"
                  style={{ background: color }}
                  title={`${label}: ${s.followersDisplay}`}
                >
                  {label.charAt(0)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-2">
        <h3 className="font-bold text-[13px] text-sp-admin-text truncate group-hover:text-sp-admin-accent transition-colors">
          {creator.name}
        </h3>
        {creator.game && (
          <p className="text-[10px] text-sp-admin-muted truncate mt-0.5">{creator.game}</p>
        )}

        {/* Sectores — max 2 pills */}
        {verticals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {verticals.slice(0, 2).map((v) => (
              <span key={v} className="text-[8px] font-semibold text-sp-admin-muted bg-sp-admin-hover border border-sp-admin-border rounded-full px-1.5 py-0.5">
                {TALENT_VERTICAL_LABELS[v]}
              </span>
            ))}
            {verticals.length > 2 && (
              <span className="text-[8px] text-sp-admin-muted">+{verticals.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer: toggle Activo / Inactivo */}
      <div
        className="px-3 pb-3 pt-2 mt-auto border-t border-sp-admin-border/50 flex items-center gap-1.5"
        onClick={(e) => e.preventDefault()}
      >
        {(['active', 'inactive'] as const).map((s) => {
          const isCurrentStatus = status === 'available' ? s === 'active' : status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={(e) => { e.preventDefault(); onChangeStatus(s); }}
              disabled={pending}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isCurrentStatus
                  ? STATUS_ACTIVE_STYLE[s]
                  : 'bg-sp-admin-hover text-sp-admin-muted hover:bg-sp-admin-border/60 border border-sp-admin-border'
              }`}
            >
              {s === 'active' ? 'Activo' : 'Inactivo'}
            </button>
          );
        })}
      </div>
    </Link>
  );
}

