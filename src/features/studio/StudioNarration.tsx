'use client';
import { useStudioWorkspace } from './StudioWorkspaceContext';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AudioLines } from 'lucide-react';
import { requestStudioNarration } from '@/app/studio/narration-actions';
import type { createNarrationRepository } from '@/lib/studio/narration-repository';
type Narration = Awaited<ReturnType<ReturnType<typeof createNarrationRepository>['list']>>[number];
const labels: Record<string, string> = { quote_requested: 'Coste solicitado', quoting: 'Consultando coste', quoted: 'Esperando autorización de agencia', approved: 'Gasto autorizado', submitting: 'Generando · no repetir', complete: 'Narración lista para escuchar', failed: 'Solicitud detenida', uncertain: 'Comprobar proveedor antes de repetir' };
export function StudioNarration({ projectId, revision, enabled, voiceName, jobs }: {
  projectId: string; revision: number; enabled: boolean; voiceName: string | null; jobs: Omit<Narration, 'quotedAt'>[];
}) {
  const workspace = useStudioWorkspace();
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [notice, setNotice] = useState('');
  const working = jobs.some((j) => ['quote_requested', 'quoting', 'approved', 'submitting'].includes(j.status));
  // Reflect asynchronous provider-worker progress; no calls to the provider from the browser.
  useEffect(() => { if (!working) return; let attempts = 0; const timer = setInterval(() => { if (++attempts > 60) clearInterval(timer); else router.refresh(); }, 5000); return () => clearInterval(timer); }, [working, router]);
  return <section className="studio-panel"><p className="studio-eyebrow">NARRACIÓN / HIGGSFIELD</p><h2><AudioLines size={22} /> Tu voz, con control de gasto.</h2>
    <p>{voiceName ? `Voz vinculada: ${voiceName}.` : 'Todavía no hay una voz de proveedor vinculada a esta identidad.'} Se narra el guion guardado, no la llamada a la acción separada si no está dentro del texto.</p>
    <p>Consultar el coste no genera audio. La agencia debe autorizar el importe y la versión en el CRM. Después escucha y revisa pronunciación y ritmo antes de utilizarla.</p>
    <button className="studio-btn secondary" disabled={pending || !enabled || !voiceName || working} onClick={() => startTransition(async () => {
      try { const result = await requestStudioNarration({ id: projectId, revision }, workspace); setNotice(result.ok ? 'Solicitud guardada. El coste aparecerá cuando lo consulte el trabajador.' : result.error); router.refresh(); } catch { setNotice('Actualiza para comprobar el estado.'); }
    })}>Consultar coste del guion · sin generar</button>
    <p role="status">{notice}</p>{jobs.map((job) => <div className="studio-row" key={job.id}><div><strong>{labels[job.status] ?? job.status}</strong><p>Guion v{job.projectRevision + 1}{job.creditsMilli !== null ? ` · ${job.creditsMilli / 1000} créditos` : ''}</p>
      {job.assetId && <audio controls preload="metadata" src={`/api/studio/assets/${job.assetId}`} aria-label="Narración generada para revisar" />}</div></div>)}
  </section>;
}
