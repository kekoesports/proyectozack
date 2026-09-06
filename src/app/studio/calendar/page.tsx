import { requireCreator } from '@/lib/studio/access';
import { createProductionRepository } from '@/lib/studio/production-repository';
import { db } from '@/lib/db';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioPlanCard } from '@/features/studio/StudioPlanCard';
export default async function CalendarPage() {
  const { member, repository, session } = await requireCreator();
  const [projects, schedule] = await Promise.all([repository.projects(), createProductionRepository(db, session.user.id).schedule()]);
  return <StudioShell name={member.name} active="/studio/calendar"><p className="studio-eyebrow">PLANIFICACIÓN EDITORIAL</p><h1 className="studio-page-title">Una idea. Su momento.</h1><p className="studio-lead">Organiza Reels, TikToks y Shorts. El mismo tema puede adaptarse a cada red; cada pieza mantiene su guion y revisión.</p>
    <div className="studio-metric-grid"><article><small>PIEZAS PREPARADAS</small><strong>{projects.length}</strong><p>Proyectos de tu espacio</p></article><article><small>CON FECHA EDITORIAL</small><strong>{schedule.length}</strong><p>No implica aprobación ni envío</p></article><article><small>PUBLICACIÓN</small><strong>Manual</strong><p>Revisión humana antes de subir</p></article></div>
    <div className="studio-calendar-grid">{projects.map((project) => { const date = schedule.find((s) => s.projectId === project.id)?.scheduledAt.toISOString() ?? null;
      return <StudioPlanCard key={`${project.id}:${date}`} project={project} scheduledAt={date} />; })}</div>
    {!projects.length && <p className="studio-empty">Crea tu primera pieza para asignarle una fecha.</p>}
  </StudioShell>;
}
