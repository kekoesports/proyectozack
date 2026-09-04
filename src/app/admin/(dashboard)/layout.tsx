import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { requireAnyRole } from '@/lib/auth-guard';
import { getDashboardAlerts, getActiveTrackerCompletedAlerts } from '@/lib/queries/alerts';
import { AdminSidebar } from '@/features/admin/_shared/components/AdminSidebar';
import type { AdminSidebarBranding } from '@/features/admin/_shared/components/AdminSidebar';
import { AdminHeader } from '@/features/admin/_shared/components/AdminHeader';
import { CompletedDealsModal } from '@/features/admin/_shared/components/CompletedDealsModal';
import { dismissAlertAction, dismissAllAlertsAction } from './actions';
import { navForRole, quickActionsForRole, type AdminNavKey } from '@/lib/admin-nav';
import { getKekoPilotPanelConfig } from '@/lib/kekopilot-panel-config';
import { isKekoPilotAppHost } from '@/lib/kekopilot-host';
import {
  DashboardIcon, TalentIcon, BrandIcon, GiveawayIcon, TeamIcon,
  TargetsIcon, TasksIcon, MyWeekIcon, InvoiceIcon, AnalyticsIcon,
  CaseIcon, CampaignIcon, BackupIcon, ContactIcon, LiveIcon, NewsIcon, ChartIcon, AiIcon,
  ContractIcon, DealsIcon,
  SettingsIcon,
} from '@/features/admin/_shared/components/SidebarIcons';
import type { ReactNode } from 'react';

type AdminLayoutProps = { children: ReactNode };

async function isKekoPilotRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  return isKekoPilotAppHost(requestHost);
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await isKekoPilotRequest())) {
    return {};
  }

  return {
    title: {
      default: 'KekoPilot Panel',
      template: '%s | KekoPilot',
    },
  };
}

const NAV_ICONS: Record<AdminNavKey, React.ReactNode> = {
  panel: <DashboardIcon />,
  brands: <BrandIcon />,
  talents: <TalentIcon />,
  campanas: <CampaignIcon />,
  'automation-drafts': <DealsIcon />,
  leads: <ContactIcon />,
  tareas: <TasksIcon />,
  facturacion: <InvoiceIcon />,
  finanzas: <ChartIcon />,
  equipo: <TeamIcon />,
  'mi-semana': <MyWeekIcon />,
  targets: <TargetsIcon />,
  'prensa-targets': <ContactIcon />,
  'partner-leads': <TargetsIcon />,
  live: <LiveIcon />,
  giveaways: <GiveawayIcon />,
  alertas: <NewsIcon />,
  noticias: <NewsIcon />,
  estadisticas: <AnalyticsIcon />,
  analytics: <AnalyticsIcon />,
  cases: <CaseIcon />,
  asistente: <AiIcon />,
  contratos: <ContractIcon />,
  entregables: <DealsIcon />,
  backups: <BackupIcon />,
  // Reutiliza el icono del asistente: Agent OS es su evolución, y darle uno
  // nuevo sugeriría que son cosas distintas cuando comparten origen.
  agents: <AiIcon />,
  seguridad: <SettingsIcon />,
};

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.ReactElement> {
  const isKekoPilotPromise = isKekoPilotRequest();
  const session = await requireAnyRole(
    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'editor', 'finance', 'analyst', 'ops', 'talent_manager'],
    '/admin/login',
  );
  const isKekoPilot = await isKekoPilotPromise;
  const panelConfig = isKekoPilot ? getKekoPilotPanelConfig() : null;
  const sidebarBranding = panelConfig
    ? {
        productName: panelConfig.branding.productName,
        homeHref: '/',
        loginHref: '/login',
        logoPath: panelConfig.branding.logoPath ?? '/kekopilot/icon.svg',
        wordmark: false,
      } satisfies AdminSidebarBranding
    : null;
  const isStaff = session.user.role === 'staff';

  const { primary, more } = navForRole(session.user.role);
  const primaryNav = primary.map((item) => ({
    href: item.href,
    label: item.label,
    icon: NAV_ICONS[item.key],
    ...(item.prefetch === false ? { prefetch: false as const } : {}),
  }));
  const leadNav = more.filter((item) => item.submenu === 'leads').map((item) => ({
    href: item.href,
    label: item.label,
    icon: NAV_ICONS[item.key],
    ...(item.prefetch === false ? { prefetch: false as const } : {}),
  }));
  const moreNav = more.filter((item) => item.submenu === undefined).map((item) => ({
    href: item.href,
    label: item.label,
    icon: NAV_ICONS[item.key],
    ...(item.group ? { group: item.group } : {}),
    ...(item.prefetch === false ? { prefetch: false as const } : {}),
  }));

  // Tracker-completed pop-up: admin/manager only (agency-wide ops signal).
  const completedTrackerAlerts =
    session.user.role === 'admin' ||
    session.user.role === 'manager' ||
    session.user.role === 'admin_limited_tasks'
      ? await getActiveTrackerCompletedAlerts()
      : [];

  const { alerts, summary } = await getDashboardAlerts(
    isStaff
      ? { staffUserId: session.user.id, skipFinancial: true, currentUserId: session.user.id }
      : { currentUserId: session.user.id },
  );

  const recentAlerts = alerts.slice(0, 10);
  const alertCount = summary.total;
  const todayLabel = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="h-screen bg-sp-admin-bg flex overflow-hidden">
      <AdminSidebar
        {...(sidebarBranding ? { branding: sidebarBranding } : {})}
        primaryNav={primaryNav}
        leadNav={leadNav}
        groups={[]}
        moreNav={moreNav}
        userName={session.user.name}
        userRole={session.user.role ?? ''}
        userEmail={session.user.email}
        logoutHref="/api/auth/sign-out"
      />
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 overflow-hidden">
        <AdminHeader
          todayLabel={todayLabel}
          alertCount={alertCount}
          recentAlerts={recentAlerts}
          onDismissAlert={dismissAlertAction}
          onDismissAllAlerts={dismissAllAlertsAction}
          userRole={session.user.role ?? undefined}
          quickActions={quickActionsForRole(session.user.role).map((a) => ({
            label: a.label,
            href: a.href,
            emoji: a.emoji,
          }))}
        />
        <main className="flex-1 p-4 md:p-5 overflow-auto">{children}</main>
      </div>
      <CompletedDealsModal alerts={completedTrackerAlerts} />
    </div>
  );
}
