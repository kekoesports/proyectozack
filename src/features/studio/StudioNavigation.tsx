'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Briefcase, Cable, CalendarDays, ChartNoAxesCombined, Clapperboard, FolderOpen, LayoutDashboard, Layers, Lightbulb, Menu, Settings2, UserRound, X } from 'lucide-react';

const groups = [
  { label: 'TU ESPACIO', links: [{ href: '/studio', label: 'Vista general', icon: LayoutDashboard }, { href: '/studio/create', label: 'Crear contenido', icon: Clapperboard }, { href: '/studio/templates', label: 'Plantillas', icon: Layers }, { href: '/studio/library', label: 'Biblioteca', icon: FolderOpen }] },
  { label: 'PLANIFICA Y CRECE', links: [{ href: '/studio/ideas', label: 'Ideas y guiones', icon: Lightbulb }, { href: '/studio/calendar', label: 'Calendario', icon: CalendarDays }, { href: '/studio/campaigns', label: 'Campañas', icon: Briefcase }, { href: '/studio/stats', label: 'Estadísticas', icon: ChartNoAxesCombined }] },
  { label: 'CONFIGURACIÓN', links: [{ href: '/studio/identity', label: 'Identidad y permisos', icon: UserRound }, { href: '/studio/connections', label: 'Mis redes', icon: Cable }, { href: '/studio/tools', label: 'Herramientas y costes', icon: Settings2 }] },
];

export function StudioNavigation({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  return <aside className="studio-sidebar">
    <div className="studio-mobile-brand"><Link href="/studio" className="studio-wordmark" aria-label="SocialPro Studio">SOCIAL<span>PRO</span><small>STUDIO / CREATORS</small></Link><button className="studio-menu-toggle" type="button" aria-expanded={open} aria-controls="studio-navigation" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}<span>{open ? 'Cerrar' : 'Menú'}</span></button></div>
    <nav id="studio-navigation" aria-label="Studio" data-open={open}>{groups.map((group) => <div className="studio-nav-group" key={group.label}><p>{group.label}</p>{group.links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} />{label}{active === href && <span className="studio-active-dot" />}</Link>)}</div>)}</nav>
    <div className="studio-sidebar-bottom"><span className="studio-eyebrow">CREATORS FIRST</span><p>Tu talento.<br />Tu siguiente paso.</p><a href="mailto:marketing@socialpro.es">Habla con tu agencia <ArrowUpRight size={14} /></a></div>
  </aside>;
}
