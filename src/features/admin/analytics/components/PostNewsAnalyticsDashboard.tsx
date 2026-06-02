'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type {
  PostTopViewRow, PostViewsByDayRow, PostTopTagRow,
  TalentArticleViewRow, BrandViewRow, CountryViewRow, MonthlyViewRow,
} from '@/lib/queries/postAnalytics';

type Vertical = 'all' | 'blog' | 'news';
type Window   = '7d' | '30d' | 'all';

const VERTICALS: { value: Vertical; label: string }[] = [
  { value: 'all',  label: 'Todo'  },
  { value: 'news', label: 'News'  },
  { value: 'blog', label: 'Blog'  },
];
const WINDOWS: { value: Window; label: string }[] = [
  { value: '7d',  label: '7 días'  },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Total'   },
];

type Props = {
  readonly topPosts:      readonly PostTopViewRow[];
  readonly viewsByDay:    readonly PostViewsByDayRow[];
  readonly topTags:       readonly PostTopTagRow[];
  readonly talentRanking: readonly TalentArticleViewRow[];
  readonly brandRanking:  readonly BrandViewRow[];
  readonly countryViews:  readonly CountryViewRow[];
  readonly monthlyViews:  readonly MonthlyViewRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────

function sinceIso(w: Window): string | null {
  if (w === 'all') return null;
  const days = w === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function viewsFor(row: PostTopViewRow, w: Window): number {
  if (w === '7d')  return row.views7d;
  if (w === '30d') return row.views30d;
  return row.totalViews;
}

// ── Sub-componentes ───────────────────────────────────────────────────

function TabBar<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }): React.ReactElement {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-sp-admin-border bg-sp-admin-hover p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-6 px-2.5 rounded-md text-[10px] font-semibold transition-colors ${
            value === o.value
              ? 'bg-white shadow text-sp-admin-text'
              : 'text-sp-admin-muted hover:text-sp-admin-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1 leading-none truncate" style={{ color: accent }}>
          {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        </p>
        {sub && <p className="text-[9px] text-sp-admin-muted/70 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function WinnerCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
      <div className="h-[3px]" style={{ background: accent }} />
      <div className="px-4 py-3 flex-1">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted mb-1">{label}</p>
        <p className="text-[13px] font-bold text-sp-admin-text leading-snug line-clamp-2">{value}</p>
        <p className="text-[9px] text-sp-admin-muted/70 mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────

export function PostNewsAnalyticsDashboard({
  topPosts, viewsByDay, topTags, talentRanking, brandRanking, countryViews, monthlyViews,
}: Props): React.ReactElement {
  const [vertical, setVertical] = useState<Vertical>('all');
  const [window,   setWindow]   = useState<Window>('30d');

  const windowCutoff = sinceIso(window);

  const filteredPosts = useMemo(() =>
    vertical === 'all' ? topPosts : topPosts.filter((p) => p.vertical === vertical),
    [topPosts, vertical],
  );

  const sortedPosts = useMemo(() =>
    [...filteredPosts].sort((a, b) => viewsFor(b, window) - viewsFor(a, window)),
    [filteredPosts, window],
  );

  const kpis = useMemo(() => {
    const dayRows = windowCutoff ? viewsByDay.filter((r) => r.day >= windowCutoff) : viewsByDay;
    const relevantDays = vertical === 'all' ? dayRows : dayRows.filter((r) => r.vertical === vertical);
    const totalViews     = relevantDays.reduce((s, r) => s + r.views, 0);
    const totalUnique    = filteredPosts.reduce((s, p) => s + p.uniqueVisitors, 0);
    const articleCount   = filteredPosts.length;
    const topPost        = sortedPosts[0];
    return { totalViews, totalUnique, articleCount, topPost };
  }, [windowCutoff, vertical, viewsByDay, filteredPosts, sortedPosts]);

  const chartData = useMemo(() => {
    const relevantDays = windowCutoff ? viewsByDay.filter((r) => r.day >= windowCutoff) : viewsByDay;
    const byDay = new Map<string, { blog: number; news: number }>();
    for (const r of relevantDays) {
      if (vertical !== 'all' && r.vertical !== vertical) continue;
      const entry = byDay.get(r.day) ?? { blog: 0, news: 0 };
      entry[r.vertical] += r.views;
      byDay.set(r.day, entry);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day: day.slice(5), blog: v.blog, news: v.news }));
  }, [viewsByDay, windowCutoff, vertical]);

  const filteredTags = useMemo(() => topTags.slice(0, 15), [topTags]);

  const hasData = topPosts.length > 0;

  // Ganadores del bloque ejecutivo — calculados desde los datos disponibles
  const topPost    = sortedPosts[0];
  const topTalent  = talentRanking[0];
  const topBrand   = brandRanking[0];
  const topTag     = filteredTags[0];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <TabBar options={VERTICALS} value={vertical} onChange={setVertical} />
        <TabBar options={WINDOWS}   value={window}   onChange={setWindow} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KpiCard label={`Visitas (${window === 'all' ? 'total' : window})`} value={kpis.totalViews}   accent="#8b3aad" />
        <KpiCard label="Visitantes únicos (aprox.)"                         value={kpis.totalUnique}  accent="#5b9bd5" />
        <KpiCard label="Artículos con visitas"                              value={kpis.articleCount} accent="#f5632a" />
        <KpiCard
          label="Artículo más visto"
          value={kpis.topPost ? String(viewsFor(kpis.topPost, window)) : '—'}
          accent="#e03070"
        />
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-[13px] font-semibold text-sp-admin-text">Sin visitas registradas</p>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            Las visitas se acumularán automáticamente desde los artículos de /news y /blog.
          </p>
        </div>
      ) : (
        <>
          {/* Bloque ejecutivo — ganadores del período activo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <WinnerCard
              label="Artículo más leído"
              value={topPost?.title ?? '—'}
              sub={topPost ? `${viewsFor(topPost, window).toLocaleString('es-ES')} visitas` : 'Sin datos'}
              accent="#8b3aad"
            />
            <WinnerCard
              label="Talento más leído"
              value={topTalent?.talentName ?? '—'}
              sub={topTalent ? `${topTalent.articleViews.toLocaleString('es-ES')} visitas · ${topTalent.articleCount} artículos` : 'Sin datos'}
              accent="#5b9bd5"
            />
            <WinnerCard
              label="Marca más leída"
              value={topBrand?.brand ?? '—'}
              sub={topBrand ? `${topBrand.views.toLocaleString('es-ES')} visitas · ${topBrand.articles} artículos` : 'Sin datos'}
              accent="#f5632a"
            />
            <WinnerCard
              label="Tag más leído"
              value={topTag?.tag ?? '—'}
              sub={topTag ? `${topTag.views.toLocaleString('es-ES')} visitas` : 'Sin datos'}
              accent="#e03070"
            />
          </div>

          {/* Gráfico de evolución diaria */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted mb-4">
                Visitas por día
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#5b9bd5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#5b9bd5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f5632a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f5632a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} labelStyle={{ fontWeight: 700 }} />
                  {(vertical === 'all' || vertical === 'news') && (
                    <Area type="monotone" dataKey="news" name="News" stroke="#5b9bd5" fill="url(#colorNews)" strokeWidth={2} dot={false} />
                  )}
                  {(vertical === 'all' || vertical === 'blog') && (
                    <Area type="monotone" dataKey="blog" name="Blog" stroke="#f5632a" fill="url(#colorBlog)" strokeWidth={2} dot={false} />
                  )}
                  {vertical === 'all' && <Legend wrapperStyle={{ fontSize: 11 }} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Evolución mensual */}
          {monthlyViews.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted mb-4">
                Evolución mensual
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthlyViews} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} labelStyle={{ fontWeight: 700 }} />
                    <Bar dataKey="views" name="Visitas" fill="#8b3aad" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-sp-admin-border">
                        {['Mes', 'Visitas', 'Δ%'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sp-admin-border/40">
                      {monthlyViews.map((r) => (
                        <tr key={r.month} className="hover:bg-sp-admin-hover">
                          <td className="px-2 py-1.5 text-[11px] text-sp-admin-text tabular-nums">{r.month}</td>
                          <td className="px-2 py-1.5 text-[11px] tabular-nums font-bold text-sp-admin-text">{r.views.toLocaleString('es-ES')}</td>
                          <td className="px-2 py-1.5 text-[11px] tabular-nums">
                            {r.delta === null ? (
                              <span className="text-sp-admin-muted">—</span>
                            ) : (
                              <span className={r.delta >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                                {r.delta >= 0 ? '+' : ''}{r.delta}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Distribución geográfica */}
          {countryViews.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                  Distribución geográfica (últimos 30 días)
                </p>
              </div>
              <div className="p-4">
                {/* Top 3 KPIs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {countryViews.slice(0, 3).map((c) => (
                    <div key={c.country ?? 'unknown'} className="rounded-lg bg-sp-admin-hover px-3 py-2 text-center">
                      <p className="text-[15px] font-black text-sp-admin-text">{c.country ?? '??'}</p>
                      <p className="text-[11px] tabular-nums font-bold text-sp-admin-text">{c.views.toLocaleString('es-ES')}</p>
                      <p className="text-[9px] text-sp-admin-muted">{c.pct}%</p>
                    </div>
                  ))}
                </div>
                {/* Tabla completa con barras */}
                <div className="space-y-1.5">
                  {countryViews.map((c) => (
                    <div key={c.country ?? 'unknown'} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-sp-admin-text w-8 shrink-0">{c.country ?? '??'}</span>
                      <div className="flex-1 h-2 rounded-full bg-sp-admin-hover overflow-hidden">
                        <div className="h-full rounded-full bg-sp-admin-accent/40" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-sp-admin-muted w-12 text-right shrink-0">
                        {c.views.toLocaleString('es-ES')}
                      </span>
                      <span className="text-[9px] text-sp-admin-muted w-8 text-right shrink-0">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Talentos más leídos */}
          {talentRanking.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                  Talentos más leídos (últimos 30 días)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sp-admin-border">
                      {['#', 'Talento', 'Artículos', 'Visitas artículos', 'Visitas perfil', 'CTR →perfil'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sp-admin-border/40">
                    {talentRanking.map((r, i) => {
                      const ctr = r.articleViews > 0
                        ? Math.round((r.profileViews / r.articleViews) * 100)
                        : 0;
                      return (
                        <tr key={r.talentId} className="hover:bg-sp-admin-hover transition-colors">
                          <td className="px-3 py-2 text-[10px] tabular-nums text-sp-admin-muted w-6">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {r.photoUrl ? (
                                <Image src={r.photoUrl} alt={r.talentName} width={24} height={24} className="rounded-full object-cover shrink-0 w-6 h-6" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-sp-admin-hover border border-sp-admin-border shrink-0 flex items-center justify-center text-[8px] font-black text-sp-admin-muted">
                                  {r.talentName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <Link
                                href={`/talentos/${r.talentSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-sp-admin-text hover:text-sp-admin-accent transition-colors whitespace-nowrap"
                              >
                                {r.talentName}
                              </Link>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">{r.articleCount}</td>
                          <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-orange text-right">{r.articleViews.toLocaleString('es-ES')}</td>
                          <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">{r.profileViews.toLocaleString('es-ES')}</td>
                          <td className="px-3 py-2 text-[11px] tabular-nums text-right">
                            <span className={ctr >= 5 ? 'text-emerald-500 font-bold' : 'text-sp-admin-muted'}>{ctr}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Marcas más leídas */}
          {brandRanking.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                  Marcas más leídas (últimos 30 días)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sp-admin-border">
                      {['#', 'Marca', 'Artículos', 'Visitas'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sp-admin-border/40">
                    {brandRanking.map((r, i) => (
                      <tr key={r.brand} className="hover:bg-sp-admin-hover transition-colors">
                        <td className="px-3 py-2 text-[10px] tabular-nums text-sp-admin-muted w-6">{i + 1}</td>
                        <td className="px-3 py-2 text-[12px] font-bold text-sp-admin-text">{r.brand}</td>
                        <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">{r.articles}</td>
                        <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-orange text-right">{r.views.toLocaleString('es-ES')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ranking tabla completo */}
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                Ranking de artículos — {sortedPosts.length} con visitas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    {['#', 'Artículo', 'Tipo', 'Lectura', 'Total', '30d', '7d', 'Únicos', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sp-admin-border/40">
                  {sortedPosts.map((r, i) => (
                    <tr key={r.postId} className="hover:bg-sp-admin-hover transition-colors">
                      <td className="px-3 py-2 text-[10px] tabular-nums text-sp-admin-muted w-6">{i + 1}</td>
                      <td className="px-3 py-2 max-w-[260px]">
                        <Link
                          href={`/admin/analytics/news/${r.postId}`}
                          className="text-[11px] font-bold text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block"
                        >
                          {r.title}
                        </Link>
                        <span className="text-[9px] text-sp-admin-muted/60">/{r.vertical}/{r.slug}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          r.vertical === 'news'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {r.vertical}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] tabular-nums text-sp-admin-muted">{r.readMinutes}m</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-admin-text">{r.totalViews.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted">{r.views30d.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted">{r.views7d.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted">{r.uniqueVisitors.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/analytics/news/${r.postId}`} className="text-[10px] text-sp-admin-accent hover:underline whitespace-nowrap">
                          Ficha →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top tags */}
          {filteredTags.length > 0 && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted mb-4">
                Top tags por visitas (últimos 30 días)
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((t) => (
                  <div
                    key={t.tag}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sp-admin-border bg-sp-admin-hover text-[11px]"
                  >
                    <span className="font-medium text-sp-admin-text">{t.tag}</span>
                    <span className="text-sp-admin-muted tabular-nums">{t.views.toLocaleString('es-ES')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
