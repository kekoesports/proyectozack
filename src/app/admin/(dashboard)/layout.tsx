import { requireAnyRole } from '@/lib/auth-guard';
import { AdminSidebar, type NavGroup } from '@/features/admin/_shared/components/AdminSidebar';
import { AdminHeader } from '@/features/admin/_shared/components/AdminHeader';
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
  ChartIcon,
  CampaignIcon,
  SettingsIcon,
} from '@/features/admin/_shared/components/SidebarIcons';
import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
}

const ADMIN_PRIMARY_NAV = [
  { href: '/admin', label: 'Panel', icon: <DashboardIcon /> },
] as const;

const ADMIN_GROUPS: readonly NavGroup[] = [
  {
    key: 'crm',
    label: 'CRM',
    items: [
      { href: '/admin/brands', label: 'Marcas', icon: <BrandIcon /> },
      { href: '/admin/campanas', label: 'Campañas', icon: <CampaignIcon />, prefetch: false },
      { href: '/admin/talents', label: 'Talentos', icon: <TalentIcon />, prefetch: false },
      { href: '/admin/targets', label: 'Outreach', icon: <TargetsIcon />, prefetch: false },
    ],
  },
  {
    key: 'ops',
    label: 'Operaciones',
    items: [
      { href: '/admin/tareas', label: 'Tareas', icon: <TasksIcon /> },
      { href: '/admin/mi-semana', label: 'Mi semana', icon: <MyWeekIcon /> },
      { href: '/admin/equipo', label: 'Equipo', icon: <TeamIcon /> },
    ],
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    items: [
      { href: '/admin/facturacion', label: 'Facturación', icon: <InvoiceIcon />, prefetch: false },
      { href: '/admin/pl', label: 'P&L', icon: <ChartIcon />, prefetch: false },
    ],
  },
];

const ADMIN_MORE_NAV = [
  { href: '/admin/tareas/plantillas', label: 'Plantillas', icon: <SettingsIcon /> },
  { href: '/admin/giveaways', label: 'Sorteos', icon: <GiveawayIcon />, prefetch: false },
  { href: '/admin/cases', label: 'Casos', icon: <CaseIcon />, prefetch: false },
  { href: '/admin/analytics', label: 'Analítica', icon: <AnalyticsIcon />, prefetch: false },
  { href: '/admin/stats', label: 'Tendencias', icon: <StatsIcon />, prefetch: false },
] as const;

const STAFF_PRIMARY_NAV = [
  { href: '/admin/mi-semana', label: 'Mi semana', icon: <MyWeekIcon /> },
] as const;

const STAFF_GROUPS: readonly NavGroup[] = [
  {
    key: 'crm',
    label: 'CRM',
    items: [
      { href: '/admin/brands', label: 'Marcas', icon: <BrandIcon /> },
      { href: '/admin/campanas', label: 'Campañas', icon: <CampaignIcon />, prefetch: false },
      { href: '/admin/targets', label: 'Outreach', icon: <TargetsIcon />, prefetch: false },
    ],
  },
  {
    key: 'ops',
    label: 'Operaciones',
    items: [
      { href: '/admin/tareas', label: 'Tareas', icon: <TasksIcon /> },
      { href: '/admin/equipo', label: 'Equipo', icon: <TeamIcon /> },
    ],
  },
];

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';
  const isManager = session.user.role === 'manager';
  // manager gets the same full nav as admin; only staff gets the restricted nav
  const useStaffNav = isStaff && !isManager;
  const primaryNav = useStaffNav ? STAFF_PRIMARY_NAV : ADMIN_PRIMARY_NAV;
  const groups = useStaffNav ? STAFF_GROUPS : ADMIN_GROUPS;
  const moreNav = useStaffNav ? [] : ADMIN_MORE_NAV;

  return (
    <div className="min-h-screen bg-sp-admin-bg flex overflow-x-hidden">
      <AdminSidebar
        primaryNav={primaryNav}
        groups={groups}
        moreNav={moreNav}
        userName={session.user.name}
        userRole={session.user.role ?? ''}
        userEmail={session.user.email}
        logoutHref="/api/auth/sign-out"
      />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
