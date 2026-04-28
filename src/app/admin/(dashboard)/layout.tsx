import { requireAnyRole } from '@/lib/auth-guard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  DashboardIcon,
  TalentIcon,
  BrandIcon,
  GiveawayIcon,
  TeamIcon,
  TargetsIcon,
  StatsIcon,
  TasksIcon,
  MyWeekIcon,
  InvoiceIcon,
  AnalyticsIcon,
  CaseIcon,
  DealsIcon,
} from '@/components/admin/SidebarIcons';
import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
}

const ADMIN_PRIMARY_NAV = [
  { href: '/admin',             label: 'Panel',        icon: <DashboardIcon /> },
  { href: '/admin/brands',      label: 'Marcas',       icon: <BrandIcon /> },
  { href: '/admin/talents',     label: 'Talentos',     icon: <TalentIcon />,   prefetch: false },
  { href: '/admin/campanas',    label: 'Tratos',       icon: <DealsIcon />,    prefetch: false },
  { href: '/admin/tareas',      label: 'Tareas',       icon: <TasksIcon /> },
  { href: '/admin/facturacion', label: 'Facturación',  icon: <InvoiceIcon />,  prefetch: false },
  { href: '/admin/stats',       label: 'Estadísticas', icon: <StatsIcon />,    prefetch: false },
  { href: '/admin/equipo',      label: 'Equipo',       icon: <TeamIcon /> },
] as const;

const ADMIN_MORE_NAV = [
  { href: '/admin/mi-semana', label: 'Mi semana',  icon: <MyWeekIcon /> },
  { href: '/admin/targets',   label: 'Prospección', icon: <TargetsIcon />, prefetch: false },
  { href: '/admin/giveaways', label: 'Sorteos',     icon: <GiveawayIcon />, prefetch: false },
  { href: '/admin/analytics', label: 'Analítica',   icon: <AnalyticsIcon />, prefetch: false },
  { href: '/admin/cases',     label: 'Casos',       icon: <CaseIcon />,     prefetch: false },
] as const;

const STAFF_PRIMARY_NAV = [
  { href: '/admin/mi-semana', label: 'Mi semana',  icon: <MyWeekIcon /> },
  { href: '/admin/tareas',    label: 'Tareas',      icon: <TasksIcon /> },
  { href: '/admin/brands',    label: 'Marcas',      icon: <BrandIcon /> },
  { href: '/admin/campanas',  label: 'Tratos',      icon: <DealsIcon />,    prefetch: false },
  { href: '/admin/equipo',    label: 'Equipo',      icon: <TeamIcon /> },
] as const;

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';
  const primaryNav = isStaff ? STAFF_PRIMARY_NAV : ADMIN_PRIMARY_NAV;
  const moreNav = isStaff ? [] : ADMIN_MORE_NAV;

  return (
    <div className="min-h-screen bg-sp-admin-bg flex overflow-x-hidden">
      <AdminSidebar
        primaryNav={primaryNav}
        moreNav={moreNav}
        userName={session.user.name}
        userRole={session.user.role ?? ''}
        userEmail={session.user.email}
        logoutHref="/api/auth/sign-out"
      />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-5 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
