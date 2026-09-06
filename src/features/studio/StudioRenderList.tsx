'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ShieldCheck, Film } from 'lucide-react';
import type { createProductionRepository } from '@/lib/studio/production-repository';
type Render = Awaited<ReturnType<ReturnType<typeof createProductionRepository>['renders']>>[number];
const labels: Record<string, string> = { queued: 'En cola', rendering: 'Montando vídeo', ready: 'Listo para revisión', approved: 'Aprobado', failed: 'Exportación detenida', changes_requested: 'Cambios solicitados' };
export function StudioRenderList({ renders }: { renders: (Omit<Render, 'createdAt'> & { createdAt: string })[] }) {
  const router = useRouter();
  const hasPending = renders.some((r) => r.status === 'queued' || r.status === 'rendering');
  // Synchronize external worker state only while a job is active; bounded polling and cleanup on unmount.
  useEffect(() => {
    if (!hasPending) return;
    let attempts = 0;
    const timer = setInterval(() => { if (++attempts > 60) clearInterval(timer); else router.refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [hasPending, router]);
  return <section className="studio-render-list"><div className="studio-section-title"><h2>Revisión y exportaciones</h2><button className="studio-btn secondary" onClick={() => router.refresh()}><RefreshCw size={15} />Actualizar</button></div>
    <p>El MP4 conserva el montaje de su versión. Cambiar el guion no cambia un vídeo ya exportado. La agencia revisa el resultado antes de aprobarlo.</p>
    {!renders.length && <div className="studio-empty"><Film size={34} /><h3>Tu próxima pieza empieza aquí.</h3><p>Guarda escenas y exporta desde Montaje. Tu máster aprobado permanece intacto en la biblioteca.</p></div>}
    <div className="studio-render-grid">{renders.map((render) => <article className="studio-render-card" key={render.id}>
      {render.assetId ? <video controls playsInline preload="metadata" src={`/api/studio/assets/${render.assetId}`} aria-label={`Montaje ${render.boardRevision + 1}`} /> : <div className="studio-render-placeholder"><Film size={38} /><p>{labels[render.status] ?? render.status}</p></div>}
      <div><span className="studio-badge">{labels[render.status] ?? render.status}</span><h3>Montaje {render.boardRevision + 1} · guion v{render.projectRevision + 1}</h3><small>{new Date(render.createdAt).toLocaleString('es-ES')}</small>
        {render.failureCode && <p role="alert">{render.failureCode === 'trim_outside_source' ? 'La escena excede la duración del clip. Ajusta inicio y duración y guarda una nueva versión.' : 'No se ha obtenido un vídeo válido. Revisa el material y el trabajador antes de crear otra versión.'}</p>}
        {render.reviewNote && <p><ShieldCheck size={16} /> {render.reviewNote}</p>}
        {render.assetId && <a className="studio-btn secondary" href={`/api/studio/assets/${render.assetId}?download=1`}>Descargar {render.status === 'approved' ? 'aprobado' : 'para revisar'}</a>}
      </div>
    </article>)}</div>
  </section>;
}
