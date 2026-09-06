import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Layers, Coins } from 'lucide-react';
import { requireCreator } from '@/lib/studio/access';
import { STUDIO_MOTION_DESIGNS } from '@/lib/studio/motion-catalog';
import { StudioShell } from '@/features/studio/StudioShell';

export default async function TemplatesPage() {
  const { member, repository } = await requireCreator();
  const projects = await repository.projects();
  return <StudioShell name={member.name} active="/studio/templates">
    <p className="studio-eyebrow">SOCIALPRO / MOTION COLLECTION 01</p>
    <h1 className="studio-page-title">Tu contenido.<br />Una firma propia.</h1>
    <p className="studio-lead">Diseños editables, ritmo controlado y material que ya es tuyo. Construye una pieza sin volver a generar tu cara o tu voz.</p>
    <div className="studio-motion-benefits"><span><Layers size={16} />Diseños versionados</span><span><ShieldCheck size={16} />Material privado</span><span><Coins size={16} />0 créditos Higgsfield en montaje</span></div>
    <div className="studio-motion-gallery">{STUDIO_MOTION_DESIGNS.map((design, index) => <article key={design.id}>
      <div className={`studio-motion-poster ${index === 1 ? 'paper' : ''}`}>
        <small>SOCIALPRO / STUDIO <span>0{index + 1}</span></small>
        <div><span className="studio-motion-kicker">{design.label}</span><h2>{design.title}</h2><i />
          {design.id === 'steps-v1' ? <ol>{design.body.split('\n').map((line) => <li key={line}>{line}</li>)}</ol>
            : <p className={design.id === 'contact-v1' ? 'contact' : ''}>{design.body}</p>}</div>
        <footer>PEOPLE / STORIES / WORK</footer>
      </div><div className="studio-motion-caption"><h3>{design.name}</h3><p>{design.description}</p><small>HTML animado → HyperFrames → MP4 · v1</small></div>
    </article>)}</div>
    <p className="studio-motion-note">Los ejemplos muestran el estilo. En Montaje puedes previsualizar la animación con tu texto y comprobar el MP4 final. El procesamiento utiliza recursos del servidor.</p>
    <section className="studio-panel"><h2>Llévalo a una pieza.</h2><p>Abre un proyecto → Montaje → Plantillas SocialPro. Las secuencias se añaden al final; nada se sobrescribe automáticamente.</p>
      {projects.slice(0, 6).map((project) => <Link className="studio-row" href={`/studio/projects/${project.id}`} key={project.id}>{project.title}<ArrowUpRight size={16} /></Link>)}
      <Link className="studio-btn" href="/studio/create">Crear una pieza nueva <ArrowUpRight size={16} /></Link>
    </section>
  </StudioShell>;
}
