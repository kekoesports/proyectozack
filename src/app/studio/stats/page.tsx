import { requireCreator } from '@/lib/studio/access';
import { StudioShell } from '@/features/studio/StudioShell';
import { db } from '@/lib/db';
import { createChannelRepository } from '@/lib/studio/channel-repository';
import { StudioChannelMetrics } from '@/features/studio/StudioChannelMetrics';
import { StudioMetricChart } from '@/features/studio/StudioMetricChart';
import { studioPlatformName } from '@/lib/studio/analytics';

export default async function StatsPage() {
  const { member, repository, session } = await requireCreator();
  const [channels, { snapshots, content }] = await Promise.all([createChannelRepository(db, session.user.id).list(), repository.dashboard()]);
  const maxViews = Math.max(1, ...content.map((item) => item.views));
  return <StudioShell name={member.name} active="/studio/stats">
    <p className="studio-eyebrow">DATOS, NO SUPOSICIONES</p><h1 className="studio-page-title">Entiende tu contenido.</h1><p className="studio-lead">Compara la evolución de cada canal y detecta qué piezas destacan. Con fecha y fuente, sin mezclar audiencia, alcance y visualizaciones.</p>
    <StudioMetricChart points={snapshots} today={new Date().toISOString().slice(0, 10)} />
    <StudioChannelMetrics channels={channels} />
    <div className="studio-section-title"><div><p className="studio-eyebrow">ÚLTIMAS 12 PUBLICACIONES SINCRONIZADAS</p><h2>El contenido, en perspectiva.</h2></div></div>
    <section className="studio-panel">{content.length ? <div className="studio-content-ranking">{content.toSorted((a, b) => b.views - a.views).map((item, index) => <article key={item.id}><span className="studio-rank-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3><p>{studioPlatformName(item.platform)} · Publicado {item.publishedAt.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}</p><div className="studio-ranking-track" aria-hidden="true"><span style={{ width: `${item.views / maxViews * 100}%` }} /></div><small>Actualizado {item.syncedAt.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}</small></div><strong>{item.views.toLocaleString('es-ES')}<small>visualizaciones</small></strong></article>)}</div> : <div className="studio-chart-no-data"><h2>La siguiente decisión empieza con datos.</h2><p>Cuando se sincronicen tus publicaciones, compararemos sus visualizaciones aquí. No son resultados de una campaña ni una muestra completa de tus redes.</p></div>}</section>
    <p className="studio-muted">Las fuentes conservan su interpretación original. Las visualizaciones de plataformas distintas no equivalen a personas únicas, conversiones ni ingresos.</p>
  </StudioShell>;
}
