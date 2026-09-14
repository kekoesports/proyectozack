import Link from 'next/link';
import type { ChannelRanking } from '@/lib/queries/channel-ranking';
import type { ReactElement } from 'react';

const number = (value: number) => value.toLocaleString('es-ES');
const date = (value: string) => new Date(value.slice(0,10) + 'T12:00:00Z').toLocaleDateString('es-ES');
type Row = ChannelRanking['youtube'][number] | ChannelRanking['twitch'][number];

function Ranking({ title, metric, explanation, rows, coverage }: {
  readonly title: string; readonly metric: string; readonly explanation: string;
  readonly rows: readonly Row[]; readonly coverage: string;
}): ReactElement {
  const max = Math.max(1,...rows.map(row => row.value ?? 0));
  return <article className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-4">
    <div><h3 className="font-display text-2xl font-bold text-sp-admin-text">{title}</h3>
      <p className="text-sm font-semibold text-sp-admin-text">{metric}</p>
      <p className="text-xs text-sp-admin-muted mt-1">{explanation}</p>
      <p className="text-xs text-sp-admin-muted mt-2">{coverage}</p></div>
    {rows.length === 0 ? <p className="text-sm text-sp-admin-muted">Sin mediciones verificables recientes.</p> :
      <ol className="space-y-3">{rows.map((row,index) => <li key={'socialId' in row ? row.socialId : row.talentId}>
        <div className="flex items-start justify-between gap-3 text-sm">
          <Link href={`/admin/talents/${row.talentId}`} prefetch={false} className="font-semibold text-sp-admin-text hover:underline">
            <span className="text-sp-admin-muted mr-2">{index+1}.</span>{row.name}
          </Link>
          <span className="shrink-0 tabular-nums text-sp-admin-text">{number(row.value ?? 0)}</span>
        </div>
        <div aria-hidden="true" className="h-1.5 rounded-full bg-sp-admin-border mt-1.5 overflow-hidden">
          <div className="h-full rounded-full bg-sp-admin-accent" style={{width:`${100*(row.value ?? 0)/max}%`}} />
        </div>
        <div className="text-[11px] text-sp-admin-muted mt-1">Medido: {date(row.date)} · API de {title}
          {'uploads' in row && row.uploads !== null ? ` · ${number(row.uploads)} publicaciones en la muestra` : ''}</div>
        <details className="text-xs text-sp-admin-muted mt-1">
          <summary className="cursor-pointer">Ver evolución registrada ({row.history.length} mediciones)</summary>
          <div className="max-h-40 overflow-y-auto mt-2 rounded border border-sp-admin-border">
            <table className="w-full text-left"><caption className="sr-only">Evolución de {metric} de {row.name}</caption>
              <thead><tr><th className="p-2">Fecha</th><th className="p-2 text-right">{metric}</th></tr></thead>
              <tbody>{row.history.map(point => <tr key={point.date}><td className="px-2 py-1">{date(point.date)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{point.value === null ? 'Sin datos' : number(point.value)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </li>)}</ol>}
  </article>;
}

export function ChannelRankingPanel({data}:{readonly data:ChannelRanking}): ReactElement {
  return <section className="space-y-4" aria-labelledby="channel-performance-title">
    <div><h2 id="channel-performance-title" className="font-display text-3xl font-bold text-sp-admin-text">Rendimiento por plataforma</h2>
      <p className="text-sm text-sp-admin-muted mt-1">Compara cada red con su propia métrica. Datos registrados desde {date(data.since)}; consulta del {date(data.checkedAt)}.</p></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Ranking title="YouTube" metric="Visualizaciones medias por vídeo" rows={data.youtube}
        explanation="Media de visualizaciones de la muestra de vídeos publicados en los 30 días anteriores a cada medición. No son visualizaciones generadas exclusivamente durante ese periodo."
        coverage={`${data.youtubeWithViews} de ${data.youtubeChannels} canales medidos tienen esta métrica. Se muestran hasta 12.`} />
      <Ranking title="Twitch" metric="Seguidores" rows={data.twitch}
        explanation="Último recuento obtenido de Twitch. Los seguidores no equivalen a espectadores de media. Todavía no hay cobertura verificada de espectadores medios de 30 días."
        coverage={`${data.twitchChannels} canales con datos de API recientes. Se muestran hasta 12.`} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{['Kick','Instagram'].map(platform =>
      <article key={platform} className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h3 className="font-display text-xl font-bold text-sp-admin-text">{platform}</h3>
        <p className="text-sm text-sp-admin-muted mt-2">Sin métricas conectadas y verificadas para este ranking.</p>
        <p className="text-xs text-sp-admin-muted mt-1">{platform === 'Kick' ? 'Pendiente conectar el acceso oficial de Kick.' : 'Pendiente acceso a estadísticas de las cuentas profesionales correspondientes; entrar en Meta no concede las estadísticas de todos los creadores.'}</p>
      </article>)}</div>
    <p className="text-xs text-sp-admin-muted">Se excluyen registros sin fuente identificada y perfiles archivados. Las fechas se muestran por canal: una medición antigua no se presenta como actual. Puedes abrir cada perfil o desplegar su historial.</p>
  </section>;
}
