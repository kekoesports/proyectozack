'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import { formatCompact, totalFollowersForCreator } from '@/lib/utils/format';
import { platformMatchesKey, SOCIAL_PLATFORMS } from '@/lib/utils/platform';
import {
  GrowthCell,
  Th,
  getFollowersForPlatform,
  getGrowthPct,
} from './RosterSpreadsheet.parts';
import type { SortField, SortState } from './RosterSpreadsheet.parts';

// ── Component ────────────────────────────────────────────────────────

type RosterSpreadsheetProps = {
  creators: AdminRosterRow[];
  verticalsByTalent?: Readonly<Record<number, readonly TalentVertical[]>>;
};

/**
 * Vista spreadsheet editable del roster de talents con edición inline y persistencia por celda.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents
 * @example
 * ```tsx
 * <RosterSpreadsheet creators={creators} verticalsByTalent={verticalsByTalent} />
 * ```
 */
export function RosterSpreadsheet({ creators, verticalsByTalent = {} }: RosterSpreadsheetProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set());
  const [verticalFilter, setVerticalFilter] = useState<TalentVertical | ''>('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'internal'>('all');
  const [gameFilter, setGameFilter] = useState<string>('');
  const [sort, setSort] = useState<SortState>({ field: 'total', dir: 'desc' });
  const [showGrowth, setShowGrowth] = useState(false);

  // Derived: unique games
  const games = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) if (c.game) set.add(c.game);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [creators]);

  // Derived: visibility counts
  const visCounts = useMemo(() => {
    let pub = 0, int = 0;
    for (const c of creators) {
      if (c.visibility === 'public') pub++;
      else int++;
    }
    return { public: pub, internal: int };
  }, [creators]);

  const hasFilters = search || activePlatforms.size > 0 || visibilityFilter !== 'all' || gameFilter || verticalFilter;

  const clearAll = (): void => {
    setSearch('');
    setActivePlatforms(new Set());
    setVisibilityFilter('all');
    setGameFilter('');
    setVerticalFilter('');
  };

  const togglePlatform = (key: string): void => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Filter + Sort ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = creators;

    // Text search
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c) => c.name.toLowerCase().includes(q));

    // Visibility
    if (visibilityFilter !== 'all')
      result = result.filter((c) => c.visibility === visibilityFilter);

    // Game
    if (gameFilter) result = result.filter((c) => c.game === gameFilter);

    // Vertical: creator must have the selected vertical
    if (verticalFilter)
      result = result.filter((c) => (verticalsByTalent[c.id] ?? []).includes(verticalFilter));

    // Multi-platform: creator must have ALL selected platforms
    if (activePlatforms.size > 0)
        result = result.filter((c) =>
          [...activePlatforms].every((pKey) =>
            c.socials.some((s) => platformMatchesKey(s.platform, pKey)),
          ),
        );

    // Sort
    result = [...result].sort((a, b) => {
      const { field, dir } = sort;

      if (field === 'name') {
        const cmp = a.name.localeCompare(b.name, 'es');
        return dir === 'desc' ? -cmp : cmp;
      }

      if (field === 'game') {
        const cmp = (a.game ?? '').localeCompare(b.game ?? '', 'es');
        return dir === 'desc' ? -cmp : cmp;
      }

      if (field === 'total') {
        const fa = totalFollowersForCreator(a.socials, activePlatforms);
        const fb = totalFollowersForCreator(b.socials, activePlatforms);
        if (fa === 0 && fb === 0) return 0;
        if (fa === 0) return 1;
        if (fb === 0) return -1;
        return dir === 'desc' ? fb - fa : fa - fb;
      }

      if (field === 'growth-yt' || field === 'growth-tw') {
        const platform = field === 'growth-yt' ? 'youtube' : 'twitch';
        const ga = getGrowthPct(a.growth, platform);
        const gb = getGrowthPct(b.growth, platform);
        if (ga === null && gb === null) return 0;
        if (ga === null) return 1;
        if (gb === null) return -1;
        return dir === 'desc' ? gb - ga : ga - gb;
      }

      // Platform-specific follower sort
      const fa = getFollowersForPlatform(a, field);
      const fb = getFollowersForPlatform(b, field);
      if (fa === 0 && fb === 0) return 0;
      if (fa === 0) return 1;
      if (fb === 0) return -1;
      return dir === 'desc' ? fb - fa : fa - fb;
    });

    return result;
  }, [creators, search, activePlatforms, visibilityFilter, gameFilter, verticalFilter, verticalsByTalent, sort]);

  // ── Sort toggle handler ────────────────────────────────────────────

  const toggleSort = (field: SortField): void => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
      }
      // Default direction: desc for numbers, asc for text
      const defaultDir = field === 'name' || field === 'game' ? 'asc' : 'desc';
      return { field, dir: defaultDir };
    });
  };

  const sortIndicator = (field: SortField): string | null => {
    if (sort.field !== field) return null;
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="rounded-t-xl bg-sp-admin-card border border-sp-admin-border border-b-0">
        {/* Row 1: Search + filters + count */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-sp-admin-border flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sp-admin-muted pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <circle cx={11} cy={11} r={8} />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar creador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-sp-admin-bg rounded-lg pl-9 pr-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/50 focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40 transition-all"
            />
          </div>

          {/* Game filter */}
          {games.length > 1 && (
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="rounded-lg bg-sp-admin-bg border-0 px-3 py-2 text-xs font-semibold text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40"
            >
              <option value="">Todos los juegos</option>
              {games.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}

          {/* Vertical filter */}
          <select
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value as TalentVertical | '')}
            className="rounded-lg bg-sp-admin-bg border-0 px-3 py-2 text-xs font-semibold text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40"
          >
            <option value="">Todas las verticales</option>
            {Object.entries(TALENT_VERTICAL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>

          {/* Visibility pills */}
          <div className="flex items-center gap-1 border-l border-sp-admin-border pl-3">
            {(['all', 'public', 'internal'] as const).map((v) => {
              const active = visibilityFilter === v;
              const label = v === 'all' ? 'Todos' : v === 'public' ? 'Público' : 'Interno';
              const count = v === 'all' ? creators.length : visCounts[v];
              return (
                <button
                  key={v}
                  onClick={() => setVisibilityFilter(v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    active ? 'bg-sp-admin-accent text-sp-admin-bg' : 'text-sp-admin-muted hover:text-sp-admin-text'
                  }`}
                >
                  {label}
                  <span className={`text-[10px] tabular-nums ${active ? 'text-sp-admin-bg/50' : 'text-sp-admin-muted/40'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Growth toggle */}
          <button
            onClick={() => setShowGrowth((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
              showGrowth
                ? 'bg-sp-admin-accent text-sp-admin-bg border-sp-admin-accent'
                : 'bg-sp-admin-card text-sp-admin-muted border-sp-admin-border hover:text-sp-admin-text hover:border-sp-admin-muted/30'
            }`}
          >
            +30d
          </button>

          {/* Count + clear */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-sp-admin-muted tabular-nums">
              <span className="font-bold text-sp-admin-text">{filtered.length}</span> de {creators.length}
            </span>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-sp-admin-accent hover:bg-sp-admin-accent/10 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Platform filter */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-sp-admin-bg/50">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted/60 mr-2 shrink-0">
            Plataforma
          </span>
          {SOCIAL_PLATFORMS.map((p) => {
            const count = creators.filter((c) => c.socials.some((s) => platformMatchesKey(s.platform, p.key))).length;
            const active = activePlatforms.has(p.key);
            return (
              <button
                key={p.key}
                onClick={() => togglePlatform(p.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-sp-admin-card text-sp-admin-text border border-sp-admin-border hover:border-sp-admin-muted/30'
                }`}
                style={active ? { backgroundColor: p.color } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.8)' : p.color }}
                />
                {p.label}
                <span className={`text-[10px] ${active ? 'text-white/60' : 'text-sp-admin-muted/50'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          {activePlatforms.size > 0 && (
            <button
              onClick={() => setActivePlatforms(new Set())}
              className="ml-1 text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent transition-colors"
            >
              Todas
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="rounded-b-xl border border-sp-admin-border border-t-0 bg-sp-admin-card overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
              <Th className="w-8 text-center">#</Th>
              <Th sortable field="name" sort={sort} onSort={toggleSort} indicator={sortIndicator}>
                Creador
              </Th>
              <Th sortable field="game" sort={sort} onSort={toggleSort} indicator={sortIndicator}>
                Juego
              </Th>
              <Th className="w-14 text-center">Vis.</Th>
              {SOCIAL_PLATFORMS.map((p) => (
                <Th
                  key={p.key}
                  sortable
                  field={p.key}
                  sort={sort}
                  onSort={toggleSort}
                  indicator={sortIndicator}
                  className="w-16 text-center"
                  style={{ color: p.color }}
                >
                  {p.label}
                </Th>
              ))}
              <Th sortable field="total" sort={sort} onSort={toggleSort} indicator={sortIndicator} className="w-20 text-right">
                Total
              </Th>
              {showGrowth && (
                <>
                  <Th sortable field="growth-yt" sort={sort} onSort={toggleSort} indicator={sortIndicator} className="w-20 text-center" style={{ color: '#FF0000' }}>
                    +30d YT
                  </Th>
                  <Th sortable field="growth-tw" sort={sort} onSort={toggleSort} indicator={sortIndicator} className="w-20 text-center" style={{ color: '#9146FF' }}>
                    +30d TW
                  </Th>
                </>
              )}
              <Th className="w-40">Negocio</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={99} className="px-5 py-16 text-center text-sp-admin-muted">
                  Sin resultados para esta búsqueda
                </td>
              </tr>
            ) : (
              filtered.map((creator, i) => {
                const total = totalFollowersForCreator(creator.socials);
                return (
                  <tr key={creator.id} className="transition-colors hover:bg-sp-admin-hover group">
                    <td className="px-3 py-2.5 text-center text-[11px] text-sp-admin-muted tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})`,
                          }}
                        >
                          {creator.initials}
                        </div>
                        <span className="font-semibold text-sp-admin-text text-[13px] group-hover:text-sp-admin-accent transition-colors">
                          {creator.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-sp-admin-muted">
                      {creator.game ?? '--'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {creator.visibility === 'public' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-900/30 text-emerald-400">
                          PUB
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sp-admin-border text-sp-admin-muted">
                          INT
                        </span>
                      )}
                    </td>
                    {SOCIAL_PLATFORMS.map((p) => {
                      const social = creator.socials.find((s) => platformMatchesKey(s.platform, p.key));
                      if (!social) {
                        return (
                          <td key={p.key} className="px-3 py-2.5 text-center text-[11px] text-sp-admin-muted/25 tabular-nums">
                            --
                          </td>
                        );
                      }
                      return (
                        <td key={p.key} className="px-3 py-2.5 text-center text-[11px] font-medium text-sp-admin-text tabular-nums">
                          {social.profileUrl ? (
                            <a
                              href={social.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              style={{ color: p.color }}
                            >
                              {social.followersDisplay}
                            </a>
                          ) : (
                            social.followersDisplay
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right text-[11px] font-bold text-sp-admin-text tabular-nums">
                      {total > 0 ? formatCompact(total) : '--'}
                    </td>
                    {showGrowth && (
                      <>
                        <GrowthCell growth={creator.growth} platform="youtube" />
                        <GrowthCell growth={creator.growth} platform="twitch" />
                      </>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {(verticalsByTalent[creator.id] ?? []).slice(0, 3).map((v) => (
                            <span
                              key={v}
                              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border"
                              title={TALENT_VERTICAL_LABELS[v]}
                            >
                              {TALENT_VERTICAL_LABELS[v]}
                            </span>
                          ))}
                          {(verticalsByTalent[creator.id]?.length ?? 0) > 3 && (
                            <span className="text-[9px] text-sp-admin-muted">+{(verticalsByTalent[creator.id]?.length ?? 0) - 3}</span>
                          )}
                        </div>
                        <Link
                          href={`/admin/talents/${creator.id}/negocio`}
                          className="ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold text-sp-admin-accent hover:bg-sp-admin-accent/10 transition-colors"
                        >
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
