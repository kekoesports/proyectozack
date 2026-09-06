import { db } from '@/lib/db';
import { requireStudioAgency } from '@/lib/studio/access';
import { studioAgencyDashboard } from '@/lib/studio/agency';
import { studioStatus } from '@/lib/studio/templates';
import {
  StudioInviteForm,
  StudioReviewForm,
  StudioRevokeButton,
} from '@/features/studio/StudioAgencyForms';
import '@/app/studio/studio.css';
import '@/app/studio/studio-editor.css';
import '@/app/studio/studio-production.css';
import { studioAgencyRenders } from '@/lib/studio/render-review';
import { StudioExportReview } from '@/features/studio/StudioExportReview';
import { studioAgencyNarrations } from '@/lib/studio/narration-repository';
import { StudioNarrationApproval } from '@/features/studio/StudioNarrationApproval';
import { StudioAgencyRoster } from '@/features/studio/StudioAgencyRoster';
import '@/app/studio/studio-experience.css';
export default async function StudioAgencyPage() {
  await requireStudioAgency();
  const [data, renders, narrations] = await Promise.all([studioAgencyDashboard(db), studioAgencyRenders(db), studioAgencyNarrations(db)]);
  return (
    <div className="sp-studio studio-admin">
      <p className="studio-eyebrow">SOCIALPRO / CONTENT STUDIO</p>
      <h1 className="studio-page-title">Acompaña su siguiente paso.</h1>
      <p className="studio-lead">
        Tus usuarios y talentos del CRM, en el mismo espacio. Gestiona accesos,
        revisa guiones y montajes y autoriza costes. Publicar sigue siendo una decisión humana.
      </p>
      <div className="studio-editor-columns">
        <section className="studio-panel">
          <h2>Invitar a un creador</h2>
          <StudioInviteForm roster={data.roster} />
        </section>
        <section className="studio-panel">
          <h2>Accesos al portal</h2>
          {data.members.length ? (
            data.members.map((member) => (
              <div className="studio-row" key={member.id}>
                <strong>{member.name}</strong>
                <span>{member.active ? 'Activo' : 'Revocado'}</span>
                {member.active && <StudioRevokeButton id={member.id} />}
              </div>
            ))
          ) : (
            <p>Aún no hay creadores con acceso.</p>
          )}
        </section>
      </div>
      <StudioAgencyRoster roster={data.roster} />
      <div className="studio-section-title">
        <h2>Montajes para revisar</h2>
      </div>
      {narrations.map((job) => <section className="studio-panel" key={job.id}><p className="studio-eyebrow">NARRACIÓN · GUION V{job.projectRevision + 1}</p><h2>{job.title}</h2><p>{job.status}</p><pre className="studio-history">{job.text}</pre>{job.status === 'quoted' && job.creditsMilli !== null && <StudioNarrationApproval id={job.id} creditsMilli={job.creditsMilli} />}</section>)}
      <div className="studio-render-grid">{renders.map((render) => <article className="studio-panel" key={render.id}><p className="studio-eyebrow">{render.name} · MONTAJE {render.boardRevision + 1}</p><h2>{render.title}</h2><p>{render.status}</p>
        {render.assetId && <video controls preload="metadata" playsInline src={`/api/admin/studio/renders/${render.id}`} style={{ width: '100%', height: 340, objectFit: 'contain', background: '#141019' }} />}
        {render.status === 'ready' && <StudioExportReview id={render.id} />}
      </article>)}</div>
      <div className="studio-section-title">
        <h2>Proyectos de creadores</h2>
      </div>
      {data.projects.length ? (
        data.projects.map(({ project, name }) => (
          <section className="studio-panel" key={project.id}>
            <p className="studio-eyebrow">
              {name} / {project.platform} / V{project.revision + 1}
            </p>
            <h2>{project.title}</h2>
            <span className="studio-badge">{studioStatus(project.status)}</span>
            <p>{project.brief}</p>
            <pre className="studio-history">{project.script}</pre>
            <p>
              <strong>CTA:</strong> {project.cta}
            </p>
            {project.status === 'in_review' && (
              <StudioReviewForm id={project.id} revision={project.revision} />
            )}
          </section>
        ))
      ) : (
        <div className="studio-empty">
          <p>
            Los proyectos aparecerán aquí cuando un creador prepare su primer
            brief.
          </p>
        </div>
      )}
    </div>
  );
}
