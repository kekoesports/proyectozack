import Link from 'next/link';
import type { createChannelRepository } from '@/lib/studio/channel-repository';
type Channel = Awaited<ReturnType<ReturnType<typeof createChannelRepository>['list']>>[number];
export function StudioChannelMetrics({ channels }: { channels: Channel[] }) {
  return <section><div className="studio-section-title"><h2>Tu mapa de redes</h2><Link className="studio-btn secondary" href="/studio/connections">Gestionar fuentes ↗</Link></div>
    <div className="studio-metric-grid">{['instagram', 'tiktok', 'youtube'].map((platform) => {
      const channel = channels.find((c) => c.platform === platform);
      const latest = channel?.observations[0];
      const history = channel?.observations.toReversed().filter((o) => o.followers !== null) ?? [];
      const values = history.flatMap((o) => o.followers !== null ? [o.followers] : []);
      const min = Math.min(...values), max = Math.max(...values);
      return <article key={platform}><span className="studio-eyebrow">{platform.toUpperCase()}</span><h3>{channel ? `@${channel.handle}` : 'Sin perfil indicado'}</h3>
        <strong>{latest?.followers === null || latest?.followers === undefined ? '—' : latest.followers.toLocaleString('es-ES')}</strong><small>Seguidores · {latest ? 'contador público' : 'sin datos verificados'}</small>
        {history.length > 1 ? <svg viewBox="0 0 280 100" role="img" aria-label="Evolución de seguidores según consultas guardadas"><polyline fill="none" stroke="#de6559" strokeWidth="3" points={values.map((n, i) => `${i / (values.length - 1) * 280},${85 - (n - min) / Math.max(1, max - min) * 70}`).join(' ')} /></svg>
          : <div className="studio-metric-empty">{latest ? 'Se necesitan dos consultas para mostrar evolución.' : 'Conecta una fuente para ver la evolución.'}</div>}
        {latest ? <><p>Vistas acumuladas del canal: {latest.lifetimeViews?.toLocaleString('es-ES') ?? 'No disponible'}</p><small>No son vistas de los últimos 30 días ni solo Shorts. Seguidores públicos redondeados por YouTube.</small><p><a href={latest.sourceUrl} target="_blank" rel="noreferrer">Fuente oficial ↗</a></p><small>Consulta: {new Date(latest.collectedAt).toLocaleString('es-ES')}</small></> : <small>Retención, alcance y guardados: pendientes de acceso oficial. Ausencia de datos no significa cero.</small>}
      </article>;
    })}</div>
  </section>;
}
