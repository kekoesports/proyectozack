import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Layers, Coins } from 'lucide-react';
import { requireCreator } from '@/lib/studio/access';
import { STUDIO_MOTION_EXAMPLES } from '@/lib/studio/motion-examples';
import { StudioTemplateGallery } from '@/features/studio/StudioTemplateGallery';
import { StudioShell } from '@/features/studio/StudioShell';

export default async function TemplatesPage() {
  const { member, repository } = await requireCreator();
  const projects = await repository.projects();
  return <StudioShell name={member.name} active="/studio/templates">
    <p className="studio-eyebrow">SOCIALPRO / MOTION COLLECTION 02</p>
    <h1 className="studio-page-title">Tu contenido.<br />Una firma propia.</h1>
    <p className="studio-lead">Diseños editables, ritmo controlado y material que ya es tuyo. Construye una pieza sin volver a generar tu cara o tu voz.</p>
    <div className="studio-motion-benefits"><span><Layers size={16} />Diseños versionados</span><span><ShieldCheck size={16} />Material privado</span><span><Coins size={16} />0 créditos Higgsfield en montaje</span></div>
    <StudioTemplateGallery />
    <p className="studio-motion-note">Las portadas son fotogramas del diseño real. Pulsa «Ver» para reproducir la animación. El logo se incluye en la exportación; las plantillas antiguas de tus proyectos se conservan.</p>
    <section className="studio-panel" id="ejemplos"><p className="studio-eyebrow">PRUEBAS REALES / 0 CRÉDITOS DE GENERACIÓN</p><h2>Del diseño al vídeo.</h2>
      <p>Tres MP4 generados con HyperFrames y FFmpeg. Ejemplos editoriales sin voz ni música; no utilizan caras, datos de clientes ni métricas inventadas.</p>
      <div className="studio-example-grid">{STUDIO_MOTION_EXAMPLES.map((example) => <article key={example.id}>
        <video controls playsInline preload="none" poster={`/motion/collection-02/${example.designs[0]}.jpg`} src={`/motion/collection-02/${example.id}.mp4`} aria-label={example.name} />
        <h3>{example.name}</h3><p>{example.description} {example.designs.length * 5} segundos · 720p.</p>
        <a className="studio-btn secondary" href={`/motion/collection-02/${example.id}.mp4`} download>Descargar ejemplo</a>
      </article>)}</div>
      <p className="studio-motion-note">Puedes añadir estas secuencias desde Montaje. También puedes combinar cartelas con tus clips, imágenes completas y una narración subida. Este montaje no genera voz, sincronización labial ni un avatar nuevo. El servidor sí consume recursos al exportar.</p>
    </section>
    <section className="studio-panel"><h2>Llévalo a una pieza.</h2><p>Abre un proyecto → Montaje → Plantillas SocialPro. Las secuencias se añaden al final; nada se sobrescribe automáticamente.</p>
      {projects.slice(0, 6).map((project) => <Link className="studio-row" href={`/studio/projects/${project.id}`} key={project.id}>{project.title}<ArrowUpRight size={16} /></Link>)}
      <Link className="studio-btn" href="/studio/create">Crear una pieza nueva <ArrowUpRight size={16} /></Link>
    </section>
  </StudioShell>;
}
