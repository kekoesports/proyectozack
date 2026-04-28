'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentSocial, TalentVertical } from '@/types';
import { TALENT_VERTICAL_LABELS, TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';
import { setTalentStatusAction, updateSocialGeoAction } from '@/app/admin/(dashboard)/talents/actions';

type TalentStatus = 'active' | 'available' | 'inactive';

const STATUS_LABELS: Record<TalentStatus, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
};

const STATUS_STYLES: Record<TalentStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  available: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const PLATFORM_EMOJI: Record<string, string> = {
  twitch: '📺',
  youtube: '📹',
  instagram: '📷',
  tiktok: '🎵',
  x: '𝕏',
  twitter: '𝕏',
  kick: '🦵',
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

  const INPUT_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  return (
    <div className="space-y-4">
      {/* KPI rápido */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Activos',      value: counts.active,    color: '#16a34a', filter: 'active' as TalentStatus },
          { label: 'Disponibles',  value: counts.available, color: '#5b9bd5', filter: 'available' as TalentStatus },
          { label: 'Inactivos',    value: counts.inactive,  color: '#72728a', filter: 'inactive' as TalentStatus },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s.filter ? 'all' : s.filter)}
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

      {/* Filtros */}
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
        <span className="text-[11px] text-sp-admin-muted tabular-nums ml-auto">{filtered.length} de {creators.length}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

type CardProps = {
  readonly creator: AdminRosterRow;
  readonly verticals: readonly TalentVertical[];
};

function InfluencerCard({ creator, verticals }: CardProps): React.ReactElement {
  const [status, setStatus] = useState<TalentStatus>(creator.status as TalentStatus);
  const [pending, startTransition] = useTransition();
  const [editingGeoId, setEditingGeoId] = useState<number | null>(null);

  const onChangeStatus = (next: TalentStatus): void => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const r = await setTalentStatusAction(creator.id, next);
      if (!r.success) setStatus(prev);
    });
  };

  // Top social para mostrar seguidores en la card
  const topSocial = creator.socials[0];

  return (
    <div className="group rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col transition-all duration-200">

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
            className="object-cover object-top"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-white/90">{creator.initials}</span>
          </div>
        )}

        {/* Overlay degradado inferior para que el texto sea legible */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Seguidores top social */}
        {topSocial && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="text-[9px] text-white/70">{PLATFORM_EMOJI[topSocial.platform.toLowerCase()] ?? '🔗'}</span>
            <span className="text-[10px] font-bold text-white tabular-nums">{topSocial.followersDisplay}</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-md ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* País */}
        {creator.creatorCountry && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/80 bg-black/30 backdrop-blur-sm rounded px-1.5 py-0.5">
              {creator.creatorCountry}
            </span>
          </div>
        )}
      </div>

      {/* Info compacta */}
      <div className="px-3 pt-2.5 pb-1">
        <Link href={`/admin/talents/${creator.id}/negocio`} className="block">
          <h3 className="font-bold text-[13px] text-sp-admin-text truncate hover:text-sp-admin-accent transition-colors">
            {creator.name}
          </h3>
        </Link>
        {creator.game && (
          <p className="text-[10px] text-sp-admin-muted truncate">{creator.game}</p>
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
              <span className="text-[8px] font-semibold text-sp-admin-muted">+{verticals.length - 2}</span>
            )}
          </div>
        )}

        {/* Redes sociales — compacto */}
        {creator.socials.length > 0 && (
          <div className="mt-2 pt-2 border-t border-sp-admin-border/60 space-y-1">
            {creator.socials.slice(0, 2).map((s) => (
              <SocialRow
                key={s.id}
                social={s}
                isEditingGeo={editingGeoId === s.id}
                onStartEditGeo={() => setEditingGeoId(s.id)}
                onStopEditGeo={() => setEditingGeoId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: cambiar estado + editar */}
      <div className="px-3 pb-3 pt-1 mt-auto flex items-center gap-1">
        {(['active', 'available', 'inactive'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChangeStatus(s)}
            disabled={pending}
            className={`flex-1 py-0.5 rounded-full border text-[8px] font-bold transition-colors cursor-pointer ${
              status === s ? STATUS_STYLES[s] : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

type SocialRowProps = {
  readonly social: TalentSocial;
  readonly isEditingGeo: boolean;
  readonly onStartEditGeo: () => void;
  readonly onStopEditGeo: () => void;
};

function SocialRow({ social, isEditingGeo, onStartEditGeo, onStopEditGeo }: SocialRowProps): React.ReactElement {
  const emoji = PLATFORM_EMOJI[social.platform.toLowerCase()] ?? '🔗';
  const geoSummary = formatGeos(social.topGeos);

  return (
    <div className="text-xs">
      <div className="flex items-center gap-2">
        <span className="shrink-0">{emoji}</span>
        {social.profileUrl ? (
          <a href={social.profileUrl} target="_blank" rel="noreferrer" className="text-sp-admin-text hover:underline truncate">
            {social.handle}
          </a>
        ) : (
          <span className="text-sp-admin-text truncate">{social.handle}</span>
        )}
        <span className="shrink-0 text-sp-admin-muted tabular-nums">{social.followersDisplay}</span>
      </div>
      <div className="flex items-center gap-2 pl-5 mt-0.5">
        {geoSummary ? (
          <span className="text-[10px] text-sp-admin-muted truncate">{geoSummary}</span>
        ) : (
          <span className="text-[10px] italic text-sp-admin-muted">Sin geo stats</span>
        )}
        <button
          type="button"
          onClick={onStartEditGeo}
          className="text-[10px] font-semibold text-sp-admin-accent hover:underline cursor-pointer"
        >
          {geoSummary ? 'editar' : 'añadir'}
        </button>
      </div>
      {isEditingGeo && <GeoEditor social={social} onDone={onStopEditGeo} />}
    </div>
  );
}

function formatGeos(topGeos: TalentSocial['topGeos']): string | null {
  if (!topGeos || topGeos.length === 0) return null;
  return topGeos.map((g) => `${g.country} ${g.pct}%`).join(' · ');
}

// ────────────────────────────────────────────────────────────────────

type GeoEditorProps = {
  readonly social: TalentSocial;
  readonly onDone: () => void;
};

function GeoEditor({ social, onDone }: GeoEditorProps): React.ReactElement {
  const initial = social.topGeos ?? [];
  const [entries, setEntries] = useState<Array<{ country: string; pct: string }>>(
    initial.length > 0
      ? initial.map((g) => ({ country: g.country, pct: String(g.pct) }))
      : [{ country: '', pct: '' }],
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateEntry = (idx: number, field: 'country' | 'pct', value: string): void => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const addRow = (): void => {
    setEntries((prev) => [...prev, { country: '', pct: '' }]);
  };

  const removeRow = (idx: number): void => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = (): void => {
    const parsed: Array<{ country: string; pct: number }> = [];
    for (const e of entries) {
      const c = e.country.trim();
      const p = parseFloat(e.pct);
      if (!c || Number.isNaN(p)) continue;
      parsed.push({ country: c, pct: p });
    }
    setError(null);
    startTransition(async () => {
      const r = await updateSocialGeoAction(social.id, parsed);
      if (!r.success) {
        setError(r.error ?? 'Error');
      } else {
        onDone();
      }
    });
  };

  return (
    <div className="mt-2 rounded-lg bg-sp-admin-bg border border-sp-admin-border p-2 space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-sp-admin-muted">Geo stats · {social.platform}</p>
      {entries.map((e, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={e.country}
            onChange={(ev) => updateEntry(idx, 'country', ev.target.value)}
            placeholder="ES"
            maxLength={3}
            className="w-14 rounded border border-sp-admin-border bg-sp-admin-card px-2 py-1 text-xs uppercase font-mono"
          />
          <input
            value={e.pct}
            onChange={(ev) => updateEntry(idx, 'pct', ev.target.value)}
            placeholder="45"
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="w-16 rounded border border-sp-admin-border bg-sp-admin-card px-2 py-1 text-xs tabular-nums"
          />
          <span className="text-[10px] text-sp-admin-muted">%</span>
          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="ml-auto text-[10px] font-semibold text-red-400 hover:bg-red-500/10 px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text"
      >
        + país
      </button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex items-center gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onDone}
          className="text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text px-2 py-1"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="text-[10px] font-bold bg-sp-admin-accent text-sp-admin-bg px-3 py-1 rounded-full hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
