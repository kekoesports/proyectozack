import Link from 'next/link';
import { Plus, ShieldCheck } from 'lucide-react';
import { StudioSignOut } from './StudioSignOut';
import { StudioNavigation } from './StudioNavigation';

export function StudioShell({ name, active, children }: { name: string; active: string; children: React.ReactNode }) {
  return <div className="studio-shell">
    <a className="studio-skip-link" href="#studio-main">Saltar al contenido</a>
    <StudioNavigation key={active} active={active} />
    <div className="studio-workspace"><header className="studio-topbar"><span className="studio-private-label"><ShieldCheck size={15} /> ESPACIO PRIVADO</span><div className="studio-account"><Link className="studio-topbar-create" href="/studio/create"><Plus size={16} />Crear</Link><span className="studio-avatar" aria-hidden="true">{name.slice(0, 1)}</span><span className="studio-account-name">{name}</span><StudioSignOut /></div></header><main id="studio-main" className="studio-main" tabIndex={-1}>{children}</main></div>
  </div>;
}
