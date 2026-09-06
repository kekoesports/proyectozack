'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined } from 'lucide-react';
import { studioLatestChannels, studioMetricDelta, studioMetricSeries, studioPlatformName, type StudioMetricPoint } from '@/lib/studio/analytics';

const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('es-ES');
const shortDate = (date: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export function StudioMetricChart({ points, today }: { points: StudioMetricPoint[]; today: string }) {
  const id = useId();
  const channels = studioLatestChannels(points);
  const [selected, setSelected] = useState(channels[0]?.socialId ?? 0);
  const [days, setDays] = useState(30);
  const [hovered, setHovered] = useState<number | null>(null);
  const series = studioMetricSeries(points, selected, days, today);
  const latest = series.at(-1);
  const active = (hovered === null ? latest : series[hovered]) ?? latest;
  const delta = studioMetricDelta(series);
  const values = series.flatMap((point) => point.followers === null ? [] : [point.followers]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const floor = Math.max(0, min - Math.max(1, (max - min) * .18));
  const ceil = max + Math.max(1, (max - min) * .18);
  const from = Date.parse(series[0]?.date ?? today);
  const to = Date.parse(series.at(-1)?.date ?? today);
  const x = (date: string) => 54 + (Date.parse(date) - from) / Math.max(86_400_000, to - from) * 662;
  const y = (value: number) => 194 - (value - floor) / (ceil - floor) * 154;
  const path = series.map((point, index) => point.followers === null ? '' : `${index === 0 || series[index - 1]?.followers === null ? 'M' : 'L'}${x(point.date)},${y(point.followers)}`).join(' ');

  return <section className="studio-analytics-panel" aria-labelledby={`${id}-title`}>
    <div className="studio-analytics-heading">
      <div><p className="studio-eyebrow">TU AUDIENCIA / HISTORIAL CRM</p><h2 id={`${id}-title`}>Cada paso cuenta.</h2></div>
      <div className="studio-segmented" role="group" aria-label="Periodo de estadísticas">
        {[7, 30, 90].map((period) => <button type="button" key={period} aria-pressed={days === period} onClick={() => { setDays(period); setHovered(null); }}>{period} días</button>)}
      </div>
    </div>
    {channels.length ? <>
      <div className="studio-channel-tabs" role="group" aria-label="Canal del gráfico">
        {channels.map((channel) => <button type="button" key={channel.socialId} aria-pressed={selected === channel.socialId} onClick={() => { setSelected(channel.socialId); setHovered(null); }}>
          <span className="studio-channel-dot" />{studioPlatformName(channel.platform)}<small>Canal {channel.socialId}</small>
        </button>)}
      </div>
      <div className="studio-chart-summary">
        <div><strong>{number(active?.followers)}</strong><span>seguidores · {active ? shortDate(active.date) : 'sin observaciones en este periodo'}</span></div>
        {delta ? <span className={`studio-delta ${delta.absolute < 0 ? 'negative' : ''}`}>
          {delta.absolute < 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          {delta.absolute > 0 ? '+' : ''}{number(delta.absolute)} {delta.percent !== null ? `(${delta.percent.toFixed(1)} %)` : ''}
          <small>entre la primera y última observación</small>
        </span> : <small>Sin dos observaciones comparables no calculamos crecimiento.</small>}
      </div>
      {values.length > 1 ? <div className="studio-chart-scroll">
        <svg className="studio-history-chart" viewBox="0 0 750 230" role="img" aria-label={`Evolución de seguidores en ${days} días. Consulta los valores exactos en la tabla inferior.`}>
          {[0, 1, 2, 3].map((line) => <g key={line}><line x1="54" x2="716" y1={40 + line * 51.3} y2={40 + line * 51.3} stroke="#eeebee" strokeDasharray="3 5" /><text x="46" y={44 + line * 51.3} textAnchor="end" fill="#6b6571" fontSize="11">{new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(ceil - line / 3 * (ceil - floor))}</text></g>)}
          <path d={path} fill="none" stroke="#c42880" strokeWidth="3" strokeLinejoin="round" />
          {series.map((point, index) => point.followers === null ? null : <circle key={point.date} cx={x(point.date)} cy={y(point.followers)} r={hovered === index ? 6 : 3.5} fill="#c42880" stroke="white" strokeWidth="2" onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(null)}><title>{`${shortDate(point.date)}: ${number(point.followers)} seguidores`}</title></circle>)}
          <text x="54" y="220" fill="#6b6571" fontSize="11">{series[0] ? shortDate(series[0].date) : ''}</text><text x="716" y="220" textAnchor="end" fill="#6b6571" fontSize="11">{latest ? shortDate(latest.date) : ''}</text>
        </svg>
      </div> : <div className="studio-chart-no-data"><ChartNoAxesCombined size={32} /><strong>{values.length ? 'Ya hay un punto de partida.' : 'Este periodo aún no tiene datos.'}</strong><p>{values.length ? 'El gráfico aparecerá cuando tengamos otra observación.' : 'Prueba 90 días o revisa las fuentes de tus redes.'}</p></div>}
      <div className="studio-chart-footnote"><span>{series.length} observaciones · Máximo 90 días disponibles</span><span>Views 30 días: {number(latest?.views)}</span></div>
      {latest && <p className="studio-source-note">Última fuente: {latest.source} · {latest.date}. Contadores registrados por el CRM, no alcance único ni tiempo real.</p>}
      {series.length > 0 && <details className="studio-data-table"><summary>Ver datos y fuentes del gráfico</summary><div><table><caption>Observaciones del canal seleccionado</caption><thead><tr><th>Fecha</th><th>Seguidores</th><th>Views 30 días</th><th>Fuente</th></tr></thead><tbody>{series.toReversed().map((point) => <tr key={point.date}><td>{point.date}</td><td>{number(point.followers)}</td><td>{number(point.views)}</td><td>{point.source}</td></tr>)}</tbody></table></div></details>}
    </> : <div className="studio-chart-no-data"><ChartNoAxesCombined size={38} /><strong>Datos reales. Cuando existan.</strong><p>Aún no hay observaciones del CRM para tu talento. Tus gráficas aparecerán aquí al disponer de una fuente verificada; no dibujamos resultados ficticios.</p><Link className="studio-secondary" href="/studio/connections">Revisar mis redes <ArrowUpRight size={16} /></Link></div>}
  </section>;
}
