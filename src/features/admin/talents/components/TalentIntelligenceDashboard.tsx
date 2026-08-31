'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, Play, Search, Sparkles } from 'lucide-react';

import type {
  TalentIntelligenceCreator,
  TalentIntelligenceDashboard as DashboardData,
} from '@/lib/queries/talentIntelligence';
import { formatCompact } from '@/lib/utils/format';

type Period = 30 | 90 | 365;
type Direction = 'rising' | 'stable' | 'falling' | 'untracked';

const PLATFORM_COLORS: Readonly<Record<string, string>> = {
  youtube: '#ff3b30',
  twitch: '#9147ff',
  instagram: '#e1306c',
  tiktok: '#25f4ee',
  kick: '#53fc18',
  x: '#4b9fe8',
  discord: '#5865f2',
};

const PERIODS: readonly Period[] = [30, 90, 365];

export function TalentIntelligenceDashboard({ data }: { readonly data: DashboardData }): React.ReactElement {
  const [period, setPeriod] = useState<Period>(30);
  const [search, setSearch] = useState('');

  const visibleCreators = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return data.creators
      .filter((creator) => !query || creator.name.toLocaleLowerCase('es').includes(query))
      .map((creator) => ({
        ...creator,
        selectedGrowth: growthForPeriod(creator, period),
      }))
      .sort((a, b) => (b.selectedGrowth.pct ?? -Infinity) - (a.selectedGrowth.pct ?? -Infinity));
  }, [data.creators, period, search]);

  const trend = useMemo(() => {
    const cutoff = new Date(data.generatedAt).getTime() - period * 86_400_000;
    return data.dailyTrend.filter((point) => new Date(`${point.date}T12:00:00Z`).getTime() >= cutoff);
  }, [data.dailyTrend, data.generatedAt, period]);

  const improving = visibleCreators.filter((creator) => directionFor(creator.selectedGrowth.pct) === 'rising');
  const falling = visibleCreators.filter((creator) => directionFor(creator.selectedGrowth.pct) === 'falling');
  const freshCreators = data.creators.filter((creator) => !creator.stale).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sp-admin-accent" />
              <h2 className="text-base font-black text-sp-admin-text">Inteligencia de talentos</h2>
            </div>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-sp-admin-muted">
              Compara evolución, detecta canales en tendencia y relaciona el crecimiento con su mejor contenido público.
              Instagram, TikTok y Kick muestran audiencia actual; el histórico automático depende de que su API esté conectada.
            </p>
          </div>
          <div className="flex rounded-xl border border-sp-admin-border bg-sp-admin-bg p-1">
            {PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  period === value ? 'bg-sp-admin-accent text-white' : 'text-sp-admin-muted hover:text-sp-admin-text'
                }`}
              >
                {value === 365 ? '1 año' : `${value} días`}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Audiencia total" value={formatCompact(data.summary.totalAudience)} detail={`${data.coverage.channels} canales propios`} />
        <Kpi label="Mejorando" value={improving.length.toString()} detail={`en los últimos ${period === 365 ? '12 meses' : `${period} días`}`} tone="positive" />
        <Kpi label="Requieren atención" value={falling.length.toString()} detail="caída de audiencia detectada" tone={falling.length > 0 ? 'negative' : 'neutral'} />
        <Kpi label="Con histórico" value={`${data.coverage.trackedChannels}/${data.coverage.channels}`} detail="canales comparables" />
        <Kpi label="Datos recientes" value={`${freshCreators}/${data.coverage.talents}`} detail="talentos actualizados" tone={data.summary.stale > 0 ? 'warning' : 'positive'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-sp-admin-text">Evolución de audiencia conectada</h3>
              <p className="text-[11px] text-sp-admin-muted">Suscriptores de YouTube y seguidores de Twitch registrados por el CRM.</p>
            </div>
            <span className="rounded-full bg-sp-admin-hover px-2 py-1 text-[9px] font-bold text-sp-admin-muted">FUENTE API</span>
          </div>
          <div className="h-[290px]">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="talentYoutube" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#ff3b30" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="talentTwitch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9147ff" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#9147ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b91a7' }} tickFormatter={shortDate} minTickGap={28} />
                  <YAxis tick={{ fontSize: 10, fill: '#8b91a7' }} tickFormatter={formatCompact} width={50} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="monotone" dataKey="youtube" name="YouTube" stroke="#ff3b30" fill="url(#talentYoutube)" strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="twitch" name="Twitch" stroke="#9147ff" fill="url(#talentTwitch)" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty message="Aún no hay dos puntos comparables en este periodo." />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <h3 className="text-sm font-bold text-sp-admin-text">Canales en tendencia</h3>
          <p className="mb-3 text-[11px] text-sp-admin-muted">Ordenados por crecimiento porcentual.</p>
          <div className="space-y-2">
            {improving.slice(0, 6).map((creator, index) => (
              <Link
                key={creator.id}
                href={`/admin/talents/${creator.id}`}
                className="flex items-center gap-3 rounded-xl border border-sp-admin-border/70 p-2.5 transition-colors hover:bg-sp-admin-hover"
              >
                <span className="w-4 text-center text-[10px] font-black text-sp-admin-muted">{index + 1}</span>
                <CreatorAvatar creator={creator} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-sp-admin-text">{creator.name}</p>
                  <p className="truncate text-[10px] text-sp-admin-muted">{trendReasonForPeriod(creator, creator.selectedGrowth, period)}</p>
                </div>
                <GrowthValue pct={creator.selectedGrowth.pct} absolute={creator.selectedGrowth.absolute} />
              </Link>
            ))}
            {improving.length === 0 && <Empty message="Ningún canal supera todavía el umbral de tendencia." />}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sp-admin-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-sp-admin-text">Rendimiento por talento</h3>
            <p className="text-[11px] text-sp-admin-muted">Qué está mejorando, empeorando y la señal que explica la clasificación.</p>
          </div>
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3">
            <Search size={13} className="text-sp-admin-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar talento…"
              aria-label="Buscar talento en estadísticas"
              className="w-full bg-transparent text-[12px] text-sp-admin-text outline-none placeholder:text-sp-admin-muted/60"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/40 text-left text-[9px] font-black uppercase tracking-[0.14em] text-sp-admin-muted">
                <th className="px-4 py-2.5">Talento</th>
                <th className="px-4 py-2.5 text-right">Audiencia</th>
                <th className="px-4 py-2.5 text-right">Cambio</th>
                <th className="px-4 py-2.5">Diagnóstico</th>
                <th className="px-4 py-2.5">Mejor mes de vistas</th>
                <th className="px-4 py-2.5">Mejor contenido</th>
                <th className="px-4 py-2.5">Actualización</th>
              </tr>
            </thead>
            <tbody>
              {visibleCreators.map((creator) => {
                const direction = directionFor(creator.selectedGrowth.pct);
                return (
                  <tr key={creator.id} className="border-b border-sp-admin-border/50 transition-colors last:border-0 hover:bg-sp-admin-hover/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/talents/${creator.id}`} className="flex items-center gap-2.5">
                        <CreatorAvatar creator={creator} />
                        <div className="min-w-0">
                          <p className="max-w-[150px] truncate text-[12px] font-bold text-sp-admin-text">{creator.name}</p>
                          <div className="mt-1 flex gap-1">
                            {creator.platforms.slice(0, 5).map((platform) => (
                              <span key={platform} className="h-1.5 w-1.5 rounded-full" style={{ background: PLATFORM_COLORS[platform] ?? '#7d859e' }} title={platform} />
                            ))}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] font-black tabular-nums text-sp-admin-text">{formatCompact(creator.totalAudience)}</td>
                    <td className="px-4 py-3 text-right"><GrowthValue pct={creator.selectedGrowth.pct} absolute={creator.selectedGrowth.absolute} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <DirectionBadge direction={direction} />
                        <span className="max-w-[260px] text-[10px] leading-relaxed text-sp-admin-muted">{trendReasonForPeriod(creator, creator.selectedGrowth, period)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-sp-admin-muted">
                      {creator.bestViewsMonth ? (
                        <>
                          <strong className="text-sp-admin-text">{formatMonth(creator.bestViewsMonth.month)}</strong><br />
                          {formatCompact(creator.bestViewsMonth.views)} vistas
                          {creator.bestViewsMonth.basis === 'published-content' && <span className="ml-1 text-[8px] text-sp-admin-muted/70">de vídeos publicados</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {creator.bestContent ? (
                        <a href={creator.bestContent.url} target="_blank" rel="noopener noreferrer" className="group/content flex max-w-[240px] items-center gap-2">
                          <Play size={12} className="shrink-0 text-red-400" />
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-semibold text-sp-admin-text group-hover/content:text-sp-admin-accent">{creator.bestContent.title}</span>
                            <span className="text-[9px] text-sp-admin-muted">{formatCompact(creator.bestContent.views)} vistas</span>
                          </span>
                        </a>
                      ) : <span className="text-[10px] text-sp-admin-muted/60">Pendiente de sincronizar</span>}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-sp-admin-muted">{creator.latestSnapshotAt ? formatSnapshotDate(creator.latestSnapshotAt) : 'Sin histórico'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <h3 className="text-sm font-bold text-sp-admin-text">Contenido que mejor funciona</h3>
          <p className="mb-3 text-[11px] text-sp-admin-muted">Vídeos públicos del último año, ordenados por visualizaciones actuales.</p>
          {data.topContent.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.topContent.slice(0, 6).map((content) => (
                <a key={content.id} href={content.url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-sp-admin-border transition-colors hover:border-sp-admin-accent/50">
                  <div className="relative aspect-video bg-sp-admin-bg">
                    {content.thumbnailUrl ? <Image src={content.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, 260px" className="object-cover" /> : null}
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white">{formatCompact(content.views)} vistas</span>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-[11px] font-bold leading-snug text-sp-admin-text group-hover:text-sp-admin-accent">{content.title}</p>
                    <p className="mt-1 text-[9px] text-sp-admin-muted">{content.talentName} · {new Date(content.publishedAt).toLocaleDateString('es-ES')}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : <Empty message="La primera sincronización de vídeos rellenará esta sección automáticamente." />}
        </section>

        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <h3 className="text-sm font-bold text-sp-admin-text">Cobertura de datos</h3>
          <p className="mb-3 text-[11px] text-sp-admin-muted">Qué plataformas pueden compararse automáticamente hoy.</p>
          <div className="space-y-2">
            {[...data.coverage.platforms].sort((a, b) => b.channels - a.channels).map((item) => (
              <div key={item.platform} className="rounded-xl border border-sp-admin-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[11px] font-bold capitalize text-sp-admin-text">
                    <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS[item.platform] ?? '#7d859e' }} />
                    {item.platform}
                  </span>
                  <span className="text-[10px] font-bold text-sp-admin-muted">{item.tracked}/{item.channels}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sp-admin-bg">
                  <div className="h-full rounded-full bg-sp-admin-accent" style={{ width: `${item.channels > 0 ? (item.tracked / item.channels) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, tone = 'neutral' }: { readonly label: string; readonly value: string; readonly detail: string; readonly tone?: 'neutral' | 'positive' | 'negative' | 'warning' }): React.ReactElement {
  const color = tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : tone === 'warning' ? 'text-amber-400' : 'text-sp-admin-text';
  return <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-sp-admin-muted">{label}</p><p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p><p className="mt-1 text-[10px] text-sp-admin-muted">{detail}</p></div>;
}

function CreatorAvatar({ creator }: { readonly creator: TalentIntelligenceCreator }): React.ReactElement {
  return <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full" style={{ background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})` }}>{creator.photoUrl ? <Image src={creator.photoUrl} alt="" fill sizes="32px" className="object-cover object-top" /> : <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{creator.initials}</span>}</div>;
}

function GrowthValue({ pct, absolute }: { readonly pct: number | null; readonly absolute: number }): React.ReactElement {
  if (pct === null) return <span className="text-[10px] text-sp-admin-muted">Sin base</span>;
  const direction = directionFor(pct);
  const color = direction === 'rising' ? 'text-emerald-400' : direction === 'falling' ? 'text-red-400' : 'text-sp-admin-muted';
  return <span className={`inline-flex flex-col items-end text-[11px] font-black tabular-nums ${color}`}><span>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span><span className="text-[9px] font-medium opacity-75">{absolute >= 0 ? '+' : ''}{formatCompact(absolute)}</span></span>;
}

function DirectionBadge({ direction }: { readonly direction: Direction }): React.ReactElement {
  if (direction === 'rising') return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-1 text-[8px] font-black text-emerald-400"><ArrowUpRight size={10} /> SUBE</span>;
  if (direction === 'falling') return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-1 text-[8px] font-black text-red-400"><ArrowDownRight size={10} /> BAJA</span>;
  if (direction === 'untracked') return <span className="inline-flex shrink-0 items-center rounded-md bg-amber-500/10 px-1.5 py-1 text-[8px] font-black text-amber-400">SIN DATOS</span>;
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sp-admin-hover px-1.5 py-1 text-[8px] font-black text-sp-admin-muted"><Minus size={10} /> ESTABLE</span>;
}

function Empty({ message }: { readonly message: string }): React.ReactElement {
  return <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-sp-admin-border p-4 text-center text-[11px] text-sp-admin-muted">{message}</div>;
}

function directionFor(pct: number | null): Direction {
  if (pct === null) return 'untracked';
  if (pct >= 1) return 'rising';
  if (pct < -0.25) return 'falling';
  return 'stable';
}

function growthForPeriod(creator: TalentIntelligenceCreator, period: Period): { absolute: number; pct: number | null } {
  if (period === 30) return { absolute: creator.growth30, pct: creator.growthPct30 };
  if (period === 90) return { absolute: creator.growth90, pct: creator.growthPct90 };
  return { absolute: creator.growth365, pct: creator.growthPct365 };
}

function trendReasonForPeriod(
  creator: TalentIntelligenceCreator,
  growth: { readonly absolute: number; readonly pct: number | null },
  period: Period,
): string {
  if (creator.stale) return 'Datos automáticos desactualizados; conviene revisar la conexión del canal.';
  if (growth.pct === null) return 'Canal sin histórico automático suficiente para este periodo.';
  const label = period === 365 ? '12 meses' : `${period} días`;
  const pct = `${growth.pct >= 0 ? '+' : ''}${growth.pct.toFixed(1)}%`;
  const absolute = `${growth.absolute >= 0 ? '+' : ''}${growth.absolute.toLocaleString('es-ES')}`;
  const direction = directionFor(growth.pct);
  if (direction === 'rising') return `Mejora ${pct} en ${label} (${absolute}).`;
  if (direction === 'falling') return `Pierde ${pct} en ${label}; revisar frecuencia y rendimiento del contenido.`;
  if (creator.bestContent) return `Audiencia estable; su mejor pieza reciente suma ${creator.bestContent.views.toLocaleString('es-ES')} vistas.`;
  return `Audiencia estable durante ${label}.`;
}

function shortDate(value: string): string { return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }
function formatMonth(value: string): string { return new Date(`${value}-01T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }); }
function formatSnapshotDate(value: string): string { return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }

function TrendTooltip({ active, payload, label }: { readonly active?: boolean; readonly payload?: ReadonlyArray<{ readonly name?: string; readonly value?: number; readonly color?: string }>; readonly label?: string }): React.ReactElement | null {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-3 shadow-xl"><p className="mb-1 text-[10px] font-bold text-sp-admin-muted">{label ? shortDate(label) : ''}</p>{payload.map((item) => <p key={item.name} className="text-[11px] font-semibold" style={{ color: item.color }}><span>{item.name}</span>: {formatCompact(item.value ?? 0)}</p>)}</div>;
}
