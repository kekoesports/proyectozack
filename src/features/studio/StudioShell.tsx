import Link from 'next/link';
import { Plus, ShieldCheck } from 'lucide-react';
import { StudioSignOut } from './StudioSignOut';
import { StudioNavigation } from './StudioNavigation';
import { requireCreator } from '@/lib/studio/access';
import { StudioWorkspaceProvider } from './StudioWorkspaceContext';
import { leaveStudioWorkspace } from '@/app/studio/workspace-actions';

export async function StudioShell({ name, active, children }: { name: string; active: string; children: React.ReactNode }) {
  const { member, agencyTalentId } = await requireCreator();
  return <StudioWorkspaceProvider talentId={member.talentId}><div className="studio-shell">
    <a className="studio-skip-link" href="#studio-main">Saltar al contenido</a>
    <StudioNavigation key={active} active={active} />
    <div className="studio-workspace"><header className="studio-topbar"><span className="studio-private-label"><ShieldCheck size={15} /> ESPACIO PRIVADO</span><div className="studio-account"><Link className="studio-topbar-create" href="/studio/create"><Plus size={16} />Crear</Link><span className="studio-avatar" aria-hidden="true">{name.slice(0, 1)}</span><span className="studio-account-name">{name}</span><StudioSignOut /></div></header>
      {agencyTalentId !== undefined && <aside className="studio-agency-context"><div><strong>Editando para {member.name}</strong><span>Modo agencia · actúas con tu propia cuenta. No se publica ni se gasta en vídeo automáticamente.</span></div><form action={leaveStudioWorkspace}><button className="studio-secondary">Volver a la agencia</button></form></aside>}
      <main id="studio-main" className="studio-main" tabIndex={-1}>{children}</main></div>
  </div></StudioWorkspaceProvider>;
}
