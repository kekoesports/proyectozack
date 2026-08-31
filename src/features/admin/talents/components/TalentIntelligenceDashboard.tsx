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
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Minus,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import type {
  TalentIntelligenceChannel,
  TalentIntelligenceDashboard as DashboardData,
} from '@/lib/queries/talentIntelligence';
import {
  TALENT_GROWTH_PERIODS,
  type TalentGrowthMetric,
  type TalentGrowthPeriod,
} from '@/lib/talent-intelligence/growth';
import { formatCompact } from '@/lib/utils/format';

type Direction = 'rising' | 'stable' | 'falling';

const PLATFORM_COLORS: Readonly<Record<string, string>> = {
  youtube: '#ff3b30',
  twitch: '#9147ff',
  instagram: '#e1306c',
  tiktok: '#25f4ee',
  kick: '#53fc18',
  x: '#4b9fe8',
  discord: '#5865f2',
};

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  kick: 'Kick',
  x: 'X',
  discord: 'Discord',
};

export function TalentIntelligenceDashboard({ data }: { readonly data: DashboardData }): React.ReactElement {
  const initialPlatform = data.coverage.platforms.find((item) => item.comparable[30] > 0)?.platform
    ?? data.coverage.platforms.find((item) => item.tracked > 0)?.platform
    ?? data.coverage.platforms[0]?.platform
    ?? 'youtube';
  const [period, setPeriod] = useState<TalentGrowthPeriod>(30);
  const [platform, setPlatform] = useState(initialPlatform);
  const [search, setSearch] = useState('');

  const platformCoverage = data.coverage.platforms.find((item) => item.platform === platform) ?? null;
  const platformChannels = useMemo(
    () => data.channels.filter((channel) => channel.platform === platform),
    [data.channels, platform],
  );
  const eligibleChannels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return platformChannels
      .filter((channel) => channel.growth[period].eligible)
      .filter((channel) => !query || `${channel.talentName} ${channel.handle}`.toLocaleLowerCase('es').includes(query))
      .sort((a, b) => {
        const aGrowth = a.growth[period];
        const bGrowth = b.growth[period];
        return (bGrowth.score ?? -Infinity) - (aGrowth.score ?? -Infinity)
          || (bGrowth.absolute - aGrowth.absolute);
      });
  }, [period, platformChannels, search]);
  const improving = eligibleChannels.filter((channel) => directionFor(channel.growth[period]) === 'rising');
  const falling = eligibleChannels.filter((channel) => directionFor(channel.growth[period]) === 'falling');
  const excluded = platformChannels.filter((channel) => !channel.growth[period].eligible);
  const verifiedAudience = platformChannels.reduce(
    (sum, channel) => sum + (channel.verifiedAudience ? channel.currentAudience ?? 0 : 0),
    0,
  );
  const trend = useMemo(() => {
    const cutoff = new Date(data.generatedAt).getTime() - period * 86_400_000;
    return data.dailyTrend
      .filter((point) => new Date(`${point.date}T12:00:00Z`).getTime() >= cutoff)
      .map((point) => ({ date: point.date, audience: point.values[platform] ?? 0 }));
  }, [data.dailyTrend, data.generatedAt, period, platform]);
  const platformContent = data.topContent.filter((content) => content.platform === platform);
  const exclusions = countExclusions(excluded, period);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sp-admin-accent" />
              <h2 className="text-base font-black text-sp-admin-text">Inteligencia de canales</h2>
            </div>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-sp-admin-muted">
              Rankings por red y por canal. Solo entran perfiles con audiencia reciente y una base que cubra de verdad el periodo elegido;
              los incompletos quedan fuera para no alterar las posiciones.
            </p>
          </div>
          <div className="flex rounded-xl border border-sp-admin-border bg-sp-admin-bg p-1">
            {TALENT_GROWTH_PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  period === value ? 'bg-sp-admin-accent text-white' : 'text-sp-admin-muted hover:text-sp-admin-text'
                }`}
              >
                {value} días
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar estadísticas por red social">
          {data.coverage.platforms.map((item) => (
            <button
              key={item.platform}
              type="button"
              aria-pressed={platform === item.platform}
              onClick={() => setPlatform(item.platform)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors ${
                platform === item.platform
                  ? 'border-sp-admin-accent/60 bg-sp-admin-accent/10 text-sp-admin-text'
                  : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover hover:text-sp-admin-text'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: platformColor(item.platform) }} />
              {platformLabel(item.platform)}
              <span className="rounded-md bg-sp-admin-bg px-1.5 py-0.5 text-[9px]">{item.comparable[period]}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Audiencia verificada" value={formatCompact(verifiedAudience)} detail={`${platformLabel(platform)} · dato reciente`} />
        <Kpi label="Mejorando" value={improving.length.toString()} detail={`crecen en ${period} días`} tone="positive" />
        <Kpi label="Requieren atención" value={falling.length.toString()} detail="caída comparable" tone={falling.length > 0 ? 'negative' : 'neutral'} />
        <Kpi label="Ranking fiable" value={`${eligibleChannels.length}/${platformChannels.length}`} detail="canales con periodo completo" />
        <Kpi label="Fuera del ranking" value={excluded.length.toString()} detail="sin base suficiente o desactualizados" tone={excluded.length > 0 ? 'warning' : 'positive'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-sp-admin-text">Evolución de audiencia · {platformLabel(platform)}</h3>
              <p className="text-[11px] text-sp-admin-muted">Suma únicamente los canales con histórico registrado por el CRM.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400">
              <ShieldCheck size={10} /> FUENTE VERIFICADA
            </span>
          </div>
          <div className="h-[290px]">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="talentPlatform" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={platformColor(platform)} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={platformColor(platform)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b91a7' }} tickFormatter={shortDate} minTickGap={28} />
                  <YAxis tick={{ fontSize: 10, fill: '#8b91a7' }} tickFormatter={formatCompact} width={50} />
                  <Tooltip content={<TrendTooltip platform={platform} />} />
                  <Area type="monotone" dataKey="audience" stroke={platformColor(platform)} fill="url(#talentPlatform)" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty message={`Todavía no hay dos puntos comparables de ${platformLabel(platform)} en este periodo.`} />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <h3 className="text-sm font-bold text-sp-admin-text">Canales con más momentum</h3>
          <p className="mb-3 text-[11px] text-sp-admin-muted">Mejora porcentual ponderada por tamaño y cobertura, sin canales incompletos.</p>
          <div className="space-y-2">
            {improving.slice(0, 6).map((channel, index) => (
              <Link
                key={channel.socialId}
                href={`/admin/talents/${channel.talentId}`}
                className="flex items-center gap-3 rounded-xl border border-sp-admin-border/70 p-2.5 transition-colors hover:bg-sp-admin-hover"
              >
                <span className="w-4 text-center text-[10px] font-black text-sp-admin-muted">{index + 1}</span>
                <ChannelAvatar channel={channel} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-sp-admin-text">{channel.talentName}</p>
                  <p className="truncate text-[10px] text-sp-admin-muted">{channel.handle} · {channelSignal(channel)}</p>
                </div>
                <GrowthValue metric={channel.growth[period]} />
              </Link>
            ))}
            {improving.length === 0 && <Empty message="Ningún canal comparable supera todavía el umbral de crecimiento." />}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sp-admin-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-sp-admin-text">Ranking por canal · {platformLabel(platform)}</h3>
            <p className="text-[11px] text-sp-admin-muted">{eligibleChannels.length} canales con una comparación válida de {period} días.</p>
          </div>
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3">
            <Search size={13} className="text-sp-admin-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar talento o canal…"
              aria-label="Buscar canal en estadísticas"
              className="w-full bg-transparent text-[12px] text-sp-admin-text outline-none placeholder:text-sp-admin-muted/60"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/40 text-left text-[9px] font-black uppercase tracking-[0.14em] text-sp-admin-muted">
                <th className="px-4 py-2.5"># · Canal</th>
                <th className="px-4 py-2.5 text-right">Audiencia</th>
                <th className="px-4 py-2.5 text-right">Cambio</th>
                <th className="px-4 py-2.5">Señal de marketing</th>
                <th className="px-4 py-2.5">Diagnóstico</th>
                <th className="px-4 py-2.5">Mejor mes</th>
                <th className="px-4 py-2.5">Mejor contenido</th>
                <th className="px-4 py-2.5">Base usada</th>
              </tr>
            </thead>
            <tbody>
              {eligibleChannels.map((channel, index) => {
                const metric = channel.growth[period];
                return (
                  <tr key={channel.socialId} className="border-b border-sp-admin-border/50 transition-colors last:border-0 hover:bg-sp-admin-hover/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/talents/${channel.talentId}`} className="flex items-center gap-2.5">
                        <span className="w-5 text-right text-[9px] font-black text-sp-admin-muted">{index + 1}</span>
                        <ChannelAvatar channel={channel} />
                        <div className="min-w-0">
                          <p className="max-w-[155px] truncate text-[12px] font-bold text-sp-admin-text">{channel.talentName}</p>
                          <p className="max-w-[155px] truncate text-[9px] text-sp-admin-muted">{channel.handle}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] font-black tabular-nums text-sp-admin-text">{formatCompact(channel.currentAudience ?? 0)}</td>
                    <td className="px-4 py-3 text-right"><GrowthValue metric={metric} /></td>
                    <td className="px-4 py-3 text-[10px] text-sp-admin-muted">{channelSignal(channel)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <DirectionBadge direction={directionFor(metric)} />
                        <span className="max-w-[235px] text-[10px] leading-relaxed text-sp-admin-muted">{trendReason(metric, period)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-sp-admin-muted">
                      {channel.bestViewsMonth ? (
                        <><strong className="text-sp-admin-text">{formatMonth(channel.bestViewsMonth.month)}</strong><br />{formatCompact(channel.bestViewsMonth.views)} vistas</>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {channel.bestContent ? (
                        <a href={channel.bestContent.url} target="_blank" rel="noopener noreferrer" className="group/content flex max-w-[210px] items-center gap-2">
                          <Play size={12} className="shrink-0" style={{ color: platformColor(channel.platform) }} />
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-semibold text-sp-admin-text group-hover/content:text-sp-admin-accent">{channel.bestContent.title}</span>
                            <span className="text-[9px] text-sp-admin-muted">{formatCompact(channel.bestContent.views)} vistas</span>
                          </span>
                        </a>
                      ) : <span className="text-[10px] text-sp-admin-muted/60">Sin contenido sincronizado</span>}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-sp-admin-muted">
                      {metric.baselineDate ? `${formatSnapshotDate(metric.baselineDate)} → ${formatSnapshotDate(metric.currentDate ?? metric.baselineDate)}` : '—'}
                      <br /><span className="text-[8px]">{metric.coverageDays} días · {metric.points} puntos</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {eligibleChannels.length === 0 && <div className="p-4"><Empty message="No hay canales que cumplan la cobertura completa para este filtro." /></div>}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,0.6fr)]">
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <h3 className="text-sm font-bold text-sp-admin-text">Contenido que mejor funciona · {platformLabel(platform)}</h3>
          <p className="mb-3 text-[11px] text-sp-admin-muted">Piezas públicas del último año, separadas por red.</p>
          {platformContent.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platformContent.slice(0, 6).map((content) => (
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
          ) : <Empty message={`No hay contenido público sincronizado para ${platformLabel(platform)}.`} />}
        </section>

        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-sp-admin-accent" />
            <h3 className="text-sm font-bold text-sp-admin-text">Calidad del ranking</h3>
          </div>
          <p className="mb-3 mt-1 text-[11px] text-sp-admin-muted">Los perfiles excluidos no alteran el top ni los KPIs.</p>
          <div className="space-y-2">
            <QualityRow label="Comparables" value={platformCoverage?.comparable[period] ?? 0} total={platformCoverage?.channels ?? 0} tone="good" />
            <QualityRow label="Datos recientes" value={platformCoverage?.fresh ?? 0} total={platformCoverage?.channels ?? 0} />
            <QualityRow label="Sin histórico suficiente" value={exclusions['not-enough-history'] ?? 0} total={excluded.length} tone="warning" />
            <QualityRow label="Desactualizados" value={exclusions.stale ?? 0} total={excluded.length} tone="warning" />
            <QualityRow label="Sin audiencia válida" value={exclusions['missing-audience'] ?? 0} total={excluded.length} tone="warning" />
            <QualityRow label="Histórico inconsistente" value={exclusions['inconsistent-history'] ?? 0} total={excluded.length} tone="warning" />
          </div>
          <p className="mt-3 rounded-xl bg-sp-admin-bg p-3 text-[10px] leading-relaxed text-sp-admin-muted">
            Para {period} días exigimos una base entre {Math.ceil(period * 0.8)} y {Math.ceil(period * 1.2)} días, actualización de los últimos 8 días, audiencia mayor que cero y una serie sin saltos incompatibles.
          </p>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, tone = 'neutral' }: { readonly label: string; readonly value: string; readonly detail: string; readonly tone?: 'neutral' | 'positive' | 'negative' | 'warning' }): React.ReactElement {
  const color = tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : tone === 'warning' ? 'text-amber-400' : 'text-sp-admin-text';
  return <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-sp-admin-muted">{label}</p><p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p><p className="mt-1 text-[10px] text-sp-admin-muted">{detail}</p></div>;
}

function ChannelAvatar({ channel }: { readonly channel: TalentIntelligenceChannel }): React.ReactElement {
  return (
    <div className="relative h-8 w-8 shrink-0">
      <div className="absolute inset-0 overflow-hidden rounded-full" style={{ background: `linear-gradient(135deg, ${channel.gradientC1}, ${channel.gradientC2})` }}>
        {channel.photoUrl ? <Image src={channel.photoUrl} alt="" fill sizes="32px" className="object-cover object-top" /> : <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{channel.initials}</span>}
      </div>
      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-sp-admin-card" style={{ background: platformColor(channel.platform) }} title={platformLabel(channel.platform)} />
    </div>
  );
}

function GrowthValue({ metric }: { readonly metric: TalentGrowthMetric }): React.ReactElement {
  if (!metric.eligible || metric.pct === null) return <span className="text-[10px] text-sp-admin-muted">Fuera del ranking</span>;
  const direction = directionFor(metric);
  const color = direction === 'rising' ? 'text-emerald-400' : direction === 'falling' ? 'text-red-400' : 'text-sp-admin-muted';
  return <span className={`inline-flex flex-col items-end text-[11px] font-black tabular-nums ${color}`}><span>{metric.pct >= 0 ? '+' : ''}{metric.pct.toFixed(1)}%</span><span className="text-[9px] font-medium opacity-75">{metric.absolute >= 0 ? '+' : ''}{formatCompact(metric.absolute)}</span></span>;
}

function DirectionBadge({ direction }: { readonly direction: Direction }): React.ReactElement {
  if (direction === 'rising') return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-1 text-[8px] font-black text-emerald-400"><ArrowUpRight size={10} /> SUBE</span>;
  if (direction === 'falling') return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-1 text-[8px] font-black text-red-400"><ArrowDownRight size={10} /> BAJA</span>;
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sp-admin-hover px-1.5 py-1 text-[8px] font-black text-sp-admin-muted"><Minus size={10} /> ESTABLE</span>;
}

function QualityRow({ label, value, total, tone = 'neutral' }: { readonly label: string; readonly value: number; readonly total: number; readonly tone?: 'neutral' | 'good' | 'warning' }): React.ReactElement {
  const color = tone === 'good' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-400' : 'text-sp-admin-text';
  return <div className="flex items-center justify-between rounded-xl border border-sp-admin-border/70 px-3 py-2.5"><span className="text-[10px] font-semibold text-sp-admin-muted">{label}</span><span className={`text-[11px] font-black tabular-nums ${color}`}>{value}<span className="text-sp-admin-muted">/{total}</span></span></div>;
}

function Empty({ message }: { readonly message: string }): React.ReactElement {
  return <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-sp-admin-border p-4 text-center text-[11px] text-sp-admin-muted">{message}</div>;
}

function directionFor(metric: TalentGrowthMetric): Direction {
  if ((metric.pct ?? 0) >= 1) return 'rising';
  if ((metric.pct ?? 0) < -0.25) return 'falling';
  return 'stable';
}

function trendReason(metric: TalentGrowthMetric, period: TalentGrowthPeriod): string {
  if (!metric.eligible || metric.pct === null) return 'Sin base suficiente para comparar.';
  const pct = `${metric.pct >= 0 ? '+' : ''}${metric.pct.toFixed(1)}%`;
  const absolute = `${metric.absolute >= 0 ? '+' : ''}${metric.absolute.toLocaleString('es-ES')}`;
  const direction = directionFor(metric);
  if (direction === 'rising') return `Mejora ${pct} en ${period} días (${absolute}).`;
  if (direction === 'falling') return `Pierde ${pct}; revisar frecuencia, formato y distribución.`;
  return `Audiencia estable durante ${period} días (${absolute}).`;
}

function channelSignal(channel: TalentIntelligenceChannel): string {
  if (channel.platform === 'youtube') {
    if (channel.avgViews30d !== null && channel.uploads30d !== null) return `${formatCompact(channel.avgViews30d)} vistas/vídeo · ${channel.uploads30d} subidas/30d`;
    if (channel.recentViews30d !== null) return `${formatCompact(channel.recentViews30d)} vistas en 30d`;
  }
  if (channel.platform === 'twitch') {
    if (channel.avgCcv30d !== null) return `${formatCompact(channel.avgCcv30d)} espectadores medios`;
    if (channel.hoursLive30d !== null) return `${channel.hoursLive30d.toLocaleString('es-ES')} h en directo/30d`;
  }
  return 'Audiencia comparable';
}

function countExclusions(channels: readonly TalentIntelligenceChannel[], period: TalentGrowthPeriod): Record<string, number> {
  const result: Record<string, number> = {};
  for (const channel of channels) result[channel.growth[period].reason] = (result[channel.growth[period].reason] ?? 0) + 1;
  return result;
}

function platformLabel(platform: string): string { return PLATFORM_LABELS[platform] ?? platform; }
function platformColor(platform: string): string { return PLATFORM_COLORS[platform] ?? '#7d859e'; }
function shortDate(value: string): string { return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }
function formatMonth(value: string): string { return new Date(`${value}-01T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }); }
function formatSnapshotDate(value: string): string { return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }

function TrendTooltip({ active, payload, label, platform }: { readonly active?: boolean; readonly payload?: ReadonlyArray<{ readonly value?: number }>; readonly label?: string; readonly platform: string }): React.ReactElement | null {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-3 shadow-xl"><p className="mb-1 text-[10px] font-bold text-sp-admin-muted">{label ? shortDate(label) : ''}</p><p className="text-[11px] font-semibold" style={{ color: platformColor(platform) }}>{platformLabel(platform)}: {formatCompact(payload[0]?.value ?? 0)}</p></div>;
}
