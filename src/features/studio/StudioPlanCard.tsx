'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { scheduleStudioProject } from '@/app/studio/production-actions';
function localInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export function StudioPlanCard({ project, scheduledAt }: { project: { id: string; title: string; platform: string }; scheduledAt: string | null }) {
  const [date, setDate] = useState(localInput(scheduledAt));
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <article className="studio-calendar-card"><span className="studio-badge">{project.platform} · {scheduledAt ? 'Planificado' : 'Sin fecha'}</span><h2><Link href={`/studio/projects/${project.id}`}>{project.title}</Link></h2><p>Una fecha editorial no es una publicación automática.</p>
    <form onSubmit={(event) => { event.preventDefault(); startTransition(async () => {
      try { const result = await scheduleStudioProject({ projectId: project.id, scheduledAt: new Date(date).toISOString() }); setMessage(result.ok ? 'Fecha guardada. No se ha publicado nada.' : result.error); router.refresh(); } catch { setMessage('Revisa la fecha e inténtalo de nuevo.'); }
    }); }}><label htmlFor={`date-${project.id}`}>Fecha y hora · zona de tu dispositivo</label><input type="datetime-local" id={`date-${project.id}`} value={date} onChange={(e) => setDate(e.target.value)} required /><button className="studio-btn secondary" disabled={pending}><CalendarDays size={16} />Guardar fecha</button></form><p role="status">{message}</p>
  </article>;
}
