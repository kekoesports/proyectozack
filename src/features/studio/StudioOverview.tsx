import Link from 'next/link';
import { ArrowUpRight, Clapperboard, FolderOpen, Layers, Lightbulb, ShieldCheck } from 'lucide-react';
import type { StudioProjectSummary } from './StudioProjectBrowser';

export function StudioOverview({ projects, assetCount }: { projects: StudioProjectSummary[]; assetCount: number }) {
  const review = projects.filter((project) => project.status === 'in_review').length;
  const approved = projects.filter((project) => project.status === 'approved').length;
  const working = projects.length - review - approved;
  const latest = projects[0];
  return <>
    <div className="studio-overview-grid" aria-label="Resumen de tu espacio">
      {[{ label: 'Piezas en marcha', value: working, icon: Clapperboard, href: '#studio-projects', note: 'Borradores y cambios' }, { label: 'En revisión', value: review, icon: Layers, href: '#studio-projects', note: 'Esperando a la agencia' }, { label: 'Guiones aprobados', value: approved, icon: ShieldCheck, href: '#studio-projects', note: 'No implica vídeo publicado' }, { label: 'Archivos propios', value: assetCount, icon: FolderOpen, href: '/studio/library', note: 'Tu biblioteca privada' }].map(({ label, value, icon: Icon, href, note }) => <Link href={href} key={label} className="studio-overview-card"><span><Icon size={18} />{label}<ArrowUpRight size={14} /></span><strong>{value}</strong><small>{note}</small></Link>)}
    </div>
    <div className="studio-action-grid">
      <Link className="studio-next-action" href={latest ? `/studio/projects/${latest.id}` : '/studio/create'}><span className="studio-eyebrow">TU SIGUIENTE PASO</span><h2>{latest ? 'Retoma donde lo dejaste.' : 'De una idea a tu primer vídeo.'}</h2><p>{latest?.title ?? 'Empieza con un objetivo, tu voz y una plantilla SocialPro.'}</p><span className="studio-action-link">{latest ? 'Abrir proyecto' : 'Crear una pieza'} <ArrowUpRight size={18} /></span></Link>
      <section className="studio-workflow-card" aria-label="Cómo crear contenido"><p className="studio-eyebrow">UN FLUJO, SIN PERDERTE</p><ol><li><Lightbulb size={18} /><span><strong>01 · Idea y guion</strong><small>Qué quieres contar y para quién</small></span></li><li><Clapperboard size={18} /><span><strong>02 · Escenas y montaje</strong><small>Tus clips, voz y motion graphics</small></span></li><li><ShieldCheck size={18} /><span><strong>03 · Revisa y descarga</strong><small>Comprueba la pieza antes de publicar</small></span></li></ol><Link href="/studio/templates">Explorar las plantillas <ArrowUpRight size={14} /></Link></section>
    </div>
  </>;
}
