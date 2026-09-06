import { notFound } from 'next/navigation';
import { requireCreator } from '@/lib/studio/access';
import { StudioId, StudioProjectInput } from '@/lib/schemas/studio';
import { studioStatus } from '@/lib/studio/templates';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioProjectEditor } from '@/features/studio/StudioProjectEditor';
import { StudioSubmit } from '@/features/studio/StudioSubmit';
import { StudioAssetUpload } from '@/features/studio/StudioAssetUpload';
import { env } from '@/lib/env';
import { StudioWorkbench } from '@/features/studio/StudioWorkbench';
import { StudioTimeline } from '@/features/studio/StudioTimeline';
import { StudioChat } from '@/features/studio/StudioChat';
import { StudioRenderList } from '@/features/studio/StudioRenderList';
import { StudioNarration } from '@/features/studio/StudioNarration';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { member, repository, production, narrations: narrationRepository } = await requireCreator();
  const id = StudioId.safeParse((await params).id);
  if (!id.success) notFound();
  const project = await repository.project(id.data);
  if (!project) notFound();
  const input = StudioProjectInput.safeParse(project);
  if (!input.success) notFound();
  const [profile, narrations] = await Promise.all([repository.profile(), narrationRepository.list(project.id)]);
  const [reviews, versions, assets, board, renders, turns] = await Promise.all([
    repository.reviews(project.id),
    repository.versions(project.id),
    repository.assets(),
    production.board(project.id), production.renders(project.id), production.turns(project.id),
  ]);
  return (
    <StudioShell name={member.name} active="/studio">
      <p className="studio-eyebrow">
        {project.platform} / VERSIÓN {project.revision + 1}
      </p>
      <h1 className="studio-page-title">{project.title}</h1>
      <div className="studio-project-toolbar">
        <span className="studio-badge">{studioStatus(project.status)}</span>
        {['draft', 'changes_requested'].includes(project.status) && (
          <StudioSubmit id={project.id} revision={project.revision} />
        )}
      </div>
      {reviews.map((review, index) => (
        <div className="studio-review-note" key={index}>
          <strong>
            {studioStatus(review.decision)} · v{review.revision + 1}
          </strong>
          <p>{review.comment}</p>
        </div>
      ))}
      <StudioWorkbench script={<div key="script"><StudioProjectEditor
        key={`${project.id}:${project.revision}`}
        project={{ ...input.data, id: project.id, revision: project.revision }}
      /><StudioNarration projectId={project.id} revision={project.revision} enabled={env.STUDIO_HIGGSFIELD_ENABLED} voiceName={profile?.higgsfieldVoice?.name ?? null} jobs={narrations.map((j) => ({ id: j.id, status: j.status, projectRevision: j.projectRevision, creditsMilli: j.creditsMilli, assetId: j.assetId }))} /></div>} montage={<StudioTimeline key={`${project.id}:${board?.revision ?? -1}`} projectId={project.id} projectRevision={project.revision} board={board} assets={assets} renderEnabled={env.STUDIO_RENDER_ENABLED} />}
        review={<StudioRenderList key="review" renders={renders.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />}
        chat={<StudioChat key="chat" projectId={project.id} revision={project.revision} turns={turns.map((t) => ({ id: t.id, prompt: t.prompt, response: t.response, proposal: t.proposal, engine: t.engine, status: t.status, projectRevision: t.projectRevision }))} aiReady={Boolean(env.AI_GATEWAY_API_KEY)} />} />
      <div className="studio-section-title">
        <h2>Material para esta pieza</h2>
      </div>
      <StudioAssetUpload projectId={project.id} />
      <div className="studio-panel">
        {assets
          .filter((asset) => asset.projectId === project.id)
          .map((asset) => (
            <a
              className="studio-row"
              href={`/api/studio/assets/${asset.id}`}
              target="_blank"
              rel="noreferrer"
              key={asset.id}
            >
              {asset.name}
              <span>{asset.contentType}</span>
            </a>
          ))}
      </div>
      <details className="studio-panel">
        <summary>Historial de guion · {versions.length} versiones</summary>
        {versions.map((version) => {
          const snapshot = StudioProjectInput.safeParse(version.document);
          return (
            <article key={version.revision}>
              <h3>Versión {version.revision + 1}</h3>
              <p>{version.createdAt.toLocaleString('es-ES')}</p>
              {snapshot.success && (
                <pre className="studio-history">
                  {snapshot.data.script || snapshot.data.brief}
                </pre>
              )}
            </article>
          );
        })}
      </details>
    </StudioShell>
  );
}
