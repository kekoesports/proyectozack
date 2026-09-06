'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { studioStatus, studioTemplate } from '@/lib/studio/templates';
import { studioPlatformName } from '@/lib/studio/analytics';

export type StudioProjectSummary = { id: string; title: string; template: string; platform: string; revision: number; status: string };

export function StudioProjectBrowser({ projects }: { projects: StudioProjectSummary[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const visible = projects.filter((project) => (status === 'all' || project.status === status) && project.title.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <section aria-label="Proyectos de contenido">
    <div className="studio-project-filters">
      <label className="studio-search"><Search size={17} /><input aria-label="Buscar mis proyectos" placeholder="Encuentra tu próxima pieza…" value={search} onChange={(event) => setSearch(event.target.value)} type="search" /></label>
      <label className="studio-filter"><SlidersHorizontal size={16} /><span className="studio-sr-only">Filtrar por estado</span><select aria-label="Estado del proyecto" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="draft">Borradores</option><option value="in_review">En revisión</option><option value="changes_requested">Cambios solicitados</option><option value="approved">Guiones aprobados</option></select></label>
      <small aria-live="polite">{visible.length} {visible.length === 1 ? 'proyecto' : 'proyectos'}</small>
    </div>
    {visible.length ? <div className="studio-project-grid">{visible.map((project) => <Link className="studio-project" href={`/studio/projects/${project.id}`} key={project.id}>
      <div className={`studio-project-cover studio-cover-${project.template}`}><span>{studioTemplate(project.template).label}</span><strong>{project.title}</strong><ArrowUpRight size={26} /></div>
      <div className="studio-project-meta"><span>{studioPlatformName(project.platform)} · v{project.revision + 1}</span><span className="studio-badge" data-status={project.status}>{studioStatus(project.status)}</span></div>
    </Link>)}</div> : <div className="studio-empty"><h3>{projects.length ? 'No encontramos esa pieza.' : 'Tu primera idea tiene sitio aquí.'}</h3><p>{projects.length ? 'Cambia el texto o el estado para ver otros proyectos.' : 'Elige una plantilla, prepara el guion y añade tus clips. Tú y el equipo autorizado controláis cada versión.'}</p>{projects.length ? <button className="studio-secondary" type="button" onClick={() => { setSearch(''); setStatus('all'); }}>Limpiar filtros</button> : <Link href="/studio/create">Crear mi primer proyecto →</Link>}</div>}
  </section>;
}
