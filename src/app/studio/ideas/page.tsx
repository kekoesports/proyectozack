import Link from "next/link";
import { requireCreator } from "@/lib/studio/access";
import { StudioShell } from "@/features/studio/StudioShell";
import { STUDIO_TEMPLATES } from "@/lib/studio/templates";
export default async function IdeasPage() {
  const { member, repository } = await requireCreator();
  const projects = (await repository.projects()).filter(
    (project) => project.status === "draft",
  );
  return (
    <StudioShell name={member.name} active="/studio/ideas">
      <p className="studio-eyebrow">CREATORS FIRST</p>
      <h1 className="studio-page-title">
        Algo que merece
        <br />
        ser contado.
      </h1>
      <p className="studio-lead">
        Puntos de partida editoriales para gaming y creadores. Sin tendencias
        inventadas.
      </p>
      <div className="studio-project-grid">
        {projects.map((project) => (
          <article className="studio-panel" key={project.id}>
            <p className="studio-eyebrow">
              {project.platform} / BORRADOR PARA REVISAR
            </p>
            <h2>{project.title}</h2>
            <p>{project.script.split(/\n\s*\n/)[0]}</p>
            <Link
              className="studio-secondary"
              href={`/studio/projects/${project.id}`}
            >
              Abrir brief, guion y CTA →
            </Link>
          </article>
        ))}
      </div>
      <div className="studio-section-title">
        <h2>Otros puntos de partida</h2>
      </div>
      <div className="studio-project-grid">
        {STUDIO_TEMPLATES.map((template) => (
          <article className="studio-panel" key={template.id}>
            <p className="studio-eyebrow">{template.label}</p>
            <h2>{template.hook}</h2>
            <p>{template.description}</p>
            <ol>
              {template.structure.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <Link href="/studio/create" className="studio-secondary">
              Llevar a un proyecto →
            </Link>
          </article>
        ))}
      </div>
      <div className="studio-panel">
        <h2>Tu criterio importa.</h2>
        <p>
          Estas ideas son guías de SocialPro, no recomendaciones basadas todavía
          en tus estadísticas. El análisis personalizado, las tendencias y el
          calendario se incorporarán cuando sus fuentes estén conectadas y
          verificadas.
        </p>
      </div>
    </StudioShell>
  );
}
