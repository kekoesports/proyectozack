'use client';

import { useMemo, useState } from 'react';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import { exportTalentsToExcel } from './TalentExport';

type Props = {
  readonly creators:          readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

const PLATFORM_COLORS: Record<string, string> = {
  twitch:    '#9146ff',
  youtube:   '#ff0000',
  instagram: '#e1306c',
  tiktok:    '#010101',
  kick:      '#53fc18',
  twitter:   '#1da1f2',
};

const AVATAR_COLORS = ['#f5632a', '#8b3aad', '#5b9bd5', '#c42880', '#16a34a', '#e8a800'];

function Avatar({ creator }: { readonly creator: AdminRosterRow }): React.ReactElement {
  if (creator.photoUrl) {
    return <img src={creator.photoUrl} alt={creator.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />;
  }
  const color = AVATAR_COLORS[creator.name.charCodeAt(0) % AVATAR_COLORS.length]!;
  const initials = creator.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('').slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)` }}>
      {initials || '?'}
    </div>
  );
}

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

export function TalentExportView({ creators, verticalsByTalent }: Props): React.ReactElement {
  const [selected,   setSelected]   = useState<ReadonlySet<number>>(() => new Set(creators.map((c) => c.id)));
  const [search,     setSearch]     = useState('');
  const [platform,   setPlatform]   = useState('');
  const [statusFilter, setStatus]   = useState('');

  const platforms = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => c.socials.forEach((s) => set.add(s.platform)));
    return [...set].sort();
  }, [creators]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return creators.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (platform && !c.socials.some((s) => s.platform === platform)) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [creators, search, platform, statusFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleAll(): void {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filtered.map((c) => c.id)]));
    }
  }

  function toggle(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport(): void {
    const toExport = creators.filter((c) => selected.has(c.id));
    if (toExport.length === 0) return;
    exportTalentsToExcel(toExport, verticalsByTalent);
  }

  const selectedInFiltered = filtered.filter((c) => selected.has(c.id)).length;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header con info SocialPro */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}>
          <span className="text-white font-black text-[10px]">SP</span>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-sp-admin-text">Exportar roster SocialPro</p>
          <p className="text-[11px] text-sp-admin-muted">
            Excel con todas las redes sociales y métricas · 2 hojas (Influencers + Resumen)
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!someSelected}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-40 transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" />
          </svg>
          Exportar Excel
          {someSelected && <span className="bg-white/20 px-1.5 rounded text-[10px]">{selected.size}</span>}
        </button>
      </div>

      {/* Filtros + selección */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT_SM} min-w-[180px] flex-1`}
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT_SM}>
          <option value="">Todas las plataformas</option>
          {platforms.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className={INPUT_SM}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="available">Disponibles</option>
          <option value="inactive">Inactivos</option>
        </select>
        <button type="button" onClick={toggleAll}
          className="h-8 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
          {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-sp-admin-muted">
          {filtered.length} influencers
          {selectedInFiltered > 0 && ` · `}
          {selectedInFiltered > 0 && <span className="font-semibold text-sp-admin-accent">{selectedInFiltered} seleccionados para exportar</span>}
        </p>
        {selected.size > 0 && (
          <button type="button" onClick={() => setSelected(new Set())}
            className="text-[10px] text-sp-admin-muted hover:text-sp-admin-text">
            Limpiar selección
          </button>
        )}
      </div>

      {/* Lista de talentos */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-sp-admin-border/40">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-sp-admin-muted">
            Sin talentos que coincidan con los filtros.
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-sp-admin-hover/50 ${isSelected ? 'bg-sp-admin-accent/[0.04]' : ''}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(c.id)}
                  className="rounded accent-sp-admin-accent w-4 h-4 shrink-0 cursor-pointer"
                />

                {/* Avatar */}
                <Avatar creator={c} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold leading-snug truncate ${isSelected ? 'text-sp-admin-text' : 'text-sp-admin-muted'}`}>
                    {c.name}
                  </p>
                  <p className="text-[10px] text-sp-admin-muted/70 truncate">
                    {c.creatorCountry && <span className="mr-2">{c.creatorCountry}</span>}
                    {c.game && <span>{c.game}</span>}
                  </p>
                </div>

                {/* Plataformas */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {c.socials.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border border-sp-admin-border bg-sp-admin-hover/50"
                      style={{ color: PLATFORM_COLORS[s.platform] ?? '#6b7280' }}>
                      <span className="capitalize">{s.platform.slice(0, 2).toUpperCase()}</span>
                      <span className="text-sp-admin-muted">{s.followersDisplay}</span>
                    </div>
                  ))}
                </div>

                {/* Estado */}
                <div className="hidden md:block shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    c.status === 'active'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    c.status === 'available' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {c.status === 'active' ? 'Activo' : c.status === 'available' ? 'Disponible' : 'Inactivo'}
                  </span>
                </div>
              </label>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-sp-admin-muted text-center">
        El Excel incluye: Twitch · YouTube · Instagram · TikTok · Kick · Twitter — una fila por talento con todas sus métricas
      </p>
    </div>
  );
}
