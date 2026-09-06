import Link from 'next/link';
import { Clapperboard, ChartNoAxesCombined, Lightbulb, CalendarDays, ShieldCheck } from 'lucide-react';
import { requireStudioAgency } from '@/lib/studio/access';
import { studioAgencyWorkspaces } from '@/lib/studio/agency';
import { db } from '@/lib/db';
import { StudioWorkspacePicker } from '@/features/studio/StudioWorkspacePicker';
import { StudioSignOut } from '@/features/studio/StudioSignOut';

export default async function StudioWorkspacesPage() {
  const session = await requireStudioAgency();
  const roster = await studioAgencyWorkspaces(db);
  return <div className="studio-entry">
    <a className="studio-skip-link" href="#studio-main">Saltar al contenido</a>
    <header className="studio-entry-header"><Link href="/studio" className="studio-wordmark">SOCIAL<span>PRO</span><small>CREATOR STUDIO</small></Link><div className="studio-account"><span className="studio-account-name">{session.user.name}</span><StudioSignOut /></div></header>
    <main id="studio-main" tabIndex={-1}>
      <section className="studio-entry-hero"><div><p className="studio-eyebrow">SOCIALPRO / CREATOR STUDIO</p><h1>Del talento<br />al siguiente vídeo.</h1><p>Un espacio para crear, planificar y crecer. Elige un creador y continúa con sus proyectos, sus contenidos y sus datos.</p><a className="studio-button" href="#creator-workspaces">Elegir espacio de creación</a></div><div className="studio-entry-modules" aria-label="Dentro de cada espacio"><article><Clapperboard /><strong>Creación y montaje</strong><span>Guion, escenas, plantillas y revisión.</span></article><article><Lightbulb /><strong>Ideas y campañas</strong><span>Contenido con intención para cada red.</span></article><article><ChartNoAxesCombined /><strong>Estadísticas</strong><span>Datos disponibles y su procedencia.</span></article><article><CalendarDays /><strong>Calendario</strong><span>Organiza lo siguiente que vas a contar.</span></article></div></section>
      <StudioWorkspacePicker roster={roster} />
      <p className="studio-entry-note"><ShieldCheck size={16} /> Acceso de agencia con tu propia cuenta. Cada creador conserva su espacio privado; elegirlo no cambia sus permisos.</p>
    </main>
  </div>;
}
