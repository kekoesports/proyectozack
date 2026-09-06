import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { requireCreator } from '@/lib/studio/access';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioReference } from '@/features/studio/StudioReference';
import { StudioOverview } from '@/features/studio/StudioOverview';
import { StudioProjectBrowser } from '@/features/studio/StudioProjectBrowser';
import { StudioMetricChart } from '@/features/studio/StudioMetricChart';
import { StudioDepthCard } from '@/features/studio/StudioDepthCard';

export default async function StudioHome() {
  const { member, repository } = await requireCreator();
  const [projects, dashboard, profile, assets] = await Promise.all([repository.projects(), repository.dashboard(), repository.profile(), repository.assets()]);
  return <StudioShell name={member.name} active="/studio">
    <div className="studio-welcome"><div><p className="studio-eyebrow">SOCIALPRO / CREATOR STUDIO</p><h1>Vamos a crear, {member.name}.</h1></div><Link className="studio-secondary" href="/studio/calendar">Ver mi calendario <ArrowUpRight size={16} /></Link></div>
    <StudioOverview projects={projects} assetCount={assets.length} />
    <div className="studio-dashboard-insights"><StudioMetricChart points={dashboard.snapshots} today={new Date().toISOString().slice(0, 10)} /><StudioDepthCard /></div>
    <div className="studio-section-title" id="studio-projects"><div><p className="studio-eyebrow">DEL BRIEF A LA PIEZA</p><h2>Mi contenido</h2></div><Link href="/studio/create"><Plus size={16} />Nuevo proyecto</Link></div>
    <StudioProjectBrowser projects={projects.map(({ id, title, template, platform, revision, status }) => ({ id, title, template, platform, revision, status }))} />
    {profile && <><div className="studio-section-title"><div><p className="studio-eyebrow">TU PUNTO DE PARTIDA</p><h2>Una identidad que reconoces.</h2></div></div><StudioReference profile={profile} assets={assets} /></>}
    <div className="studio-section-title"><div><p className="studio-eyebrow">CON TU AGENCIA</p><h2>Mis entregables</h2></div><Link href="/studio/campaigns">Ver campañas <ArrowUpRight size={16} /></Link></div>
    <div className="studio-panel">{dashboard.tasks.length ? dashboard.tasks.map((task) => <div className="studio-row" key={task.id}><strong>{task.title}</strong><span>{task.type.replaceAll('_', ' ')}</span><span>{task.status.replaceAll('_', ' ')}</span></div>) : <p>No tienes entregables asignados. Cuando la agencia te incluya en una campaña, los verás aquí.</p>}</div>
  </StudioShell>;
}
