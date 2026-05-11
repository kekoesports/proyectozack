import { requireAnyRole } from '@/lib/auth-guard';
import { getDashboardAlerts } from '@/lib/queries/alerts';
import { AdminSidebar } from '@/features/admin/_shared/components/AdminSidebar';
import { AdminHeader } from '@/features/admin/_shared/components/AdminHeader';
import { dismissAlertAction, dismissAllAlertsAction } from './actions';
import {
  DashboardIcon, TalentIcon, BrandIcon, GiveawayIcon, TeamIcon,
  TargetsIcon, TasksIcon, MyWeekIcon, InvoiceIcon, AnalyticsIcon,
  CaseIcon, CampaignIcon, BackupIcon, ContactIcon, LiveIcon,
} from '@/features/admin/_shared/components/SidebarIcons';
import type { ReactNode } from 'react';

type AdminLayoutProps = { children: ReactNode };

// ── Admin nav plano ────────────────────────────────────────────────────

const ADMIN_PRIMARY_NAV = [
  { href: '/admin',             label: 'Panel',       icon: <DashboardIcon /> },
  { href: '/admin/brands',      label: 'Marcas',      icon: <BrandIcon /> },
  { href: '/admin/talents',     label: 'Talentos',    icon: <TalentIcon />,   prefetch: false },
  { href: '/admin/campanas',    label: 'Tratos',      icon: <CampaignIcon />, prefetch: false },
  { href: '/admin/tareas',      label: 'Tareas',      icon: <TasksIcon /> },
  { href: '/admin/facturacion', label: 'Facturación', icon: <InvoiceIcon />,  prefetch: false },
  { href: '/admin/equipo',      label: 'Equipo',      icon: <TeamIcon /> },
] as const;

const ADMIN_MORE_NAV = [
  { href: '/admin/mi-semana', label: 'Mi semana',   icon: <MyWeekIcon /> },
  { href: '/admin/targets',         label: 'Creadores Target', icon: <TargetsIcon />, prefetch: false },
  { href: '/admin/prensa-targets',  label: 'Prensa Targets',   icon: <ContactIcon />, prefetch: false },
  { href: '/admin/live',            label: 'En directo',       icon: <LiveIcon />,     prefetch: false },
  { href: '/admin/giveaways',       label: 'Sorteos',          icon: <GiveawayIcon />, prefetch: false },
  { href: '/admin/noticias/imagenes', label: 'Imágenes noticias', icon: <CaseIcon />, prefetch: false },
  { href: '/admin/analytics', label: 'Analítica',   icon: <AnalyticsIcon />, prefetch: false },
  { href: '/admin/cases',     label: 'Casos',       icon: <CaseIcon />,   prefetch: false },
  { href: '/admin/backups',   label: 'Backups',     icon: <BackupIcon />, prefetch: false },
] as const;

// ── Staff nav restringido ──────────────────────────────────────────────

const STAFF_PRIMARY_NAV = [
  { href: '/admin/mi-semana', label: 'Mi semana', icon: <MyWeekIcon /> },
  { href: '/admin/brands',    label: 'Marcas',    icon: <BrandIcon /> },
  { href: '/admin/campanas',  label: 'Tratos',    icon: <CampaignIcon />, prefetch: false },
  { href: '/admin/tareas',    label: 'Tareas',    icon: <TasksIcon /> },
  { href: '/admin/equipo',    label: 'Equipo',    icon: <TeamIcon /> },
] as const;

const STAFF_MORE_NAV = [
  { href: '/admin/targets',         label: 'Creadores Target', icon: <TargetsIcon />, prefetch: false },
  { href: '/admin/prensa-targets',  label: 'Prensa Targets',   icon: <ContactIcon />, prefetch: false },
] as const;

// ──────────────────────────────────────────────────────────────────────

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.ReactElement> {
  const session    = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const isStaff    = session.user.role === 'staff';
  const isManager  = session.user.role === 'manager';
  const useStaffNav = isStaff && !isManager;

  // Cargar alertas para el badge de la campana — staff ve solo las suyas
  const { alerts, summary } = await getDashboardAlerts(
    isStaff
      ? { staffUserId: session.user.id, skipFinancial: true, currentUserId: session.user.id }
      : { currentUserId: session.user.id },
  );

  // Las 10 más relevantes para el dropdown (personales primero)
  const recentAlerts = alerts.slice(0, 10);
  const alertCount   = summary.total;

  return (
    <div className="min-h-screen bg-sp-admin-bg flex overflow-x-hidden">
      <AdminSidebar
        primaryNav={useStaffNav ? STAFF_PRIMARY_NAV : ADMIN_PRIMARY_NAV}
        groups={[]}
        moreNav={useStaffNav ? STAFF_MORE_NAV : ADMIN_MORE_NAV}
        userName={session.user.name}
        userRole={session.user.role ?? ''}
        userEmail={session.user.email}
        logoutHref="/api/auth/sign-out"
      />
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <AdminHeader
          alertCount={alertCount}
          recentAlerts={recentAlerts}
          onDismissAlert={dismissAlertAction}
          onDismissAllAlerts={dismissAllAlertsAction}
        />
        <main className="flex-1 p-4 md:p-5 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
