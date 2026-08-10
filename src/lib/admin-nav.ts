import type { Role } from '@/lib/auth-guard';
import { hasPermission, type Module, type Action } from '@/lib/permissions';

export type AdminNavKey =
  | 'panel'
  | 'brands'
  | 'talents'
  | 'campanas'
  | 'tareas'
  | 'facturacion'
  | 'finanzas'
  | 'equipo'
  | 'mi-semana'
  | 'targets'
  | 'prensa-targets'
  | 'live'
  | 'giveaways'
  | 'alertas'
  | 'noticias'
  | 'estadisticas'
  | 'analytics'
  | 'cases'
  | 'asistente'
  | 'contratos'
  | 'entregables'
  | 'backups';

export type AdminNavDef = {
  readonly key: AdminNavKey;
  readonly href: string;
  readonly label: string;
  readonly prefetch?: boolean;
  /** Module gate; null = any authenticated CRM role that reaches the layout. */
  readonly module: Module | null;
  readonly action?: Action;
  /** Extra allow-list (e.g. asistente). When set, module is ignored. */
  readonly roles?: readonly Role[];
  readonly section: 'primary' | 'more';
};

/**
 * Canonical admin nav catalogue. Layout attaches icons; filtering is pure.
 * Module gates mirror the page-level requirePermission used by each route.
 */
export const ADMIN_NAV_CATALOGUE: readonly AdminNavDef[] = [
  // primary
  { key: 'panel',       href: '/admin',                 label: 'Panel',            module: 'dashboard',      section: 'primary' },
  { key: 'brands',      href: '/admin/brands',          label: 'Marcas',           module: 'campanas',       section: 'primary' },
  { key: 'talents',     href: '/admin/talents',         label: 'Talentos',         module: 'talentos',       section: 'primary', prefetch: false },
  { key: 'campanas',    href: '/admin/campanas',        label: 'Tratos',           module: 'campanas',       section: 'primary', prefetch: false },
  { key: 'tareas',      href: '/admin/tareas',          label: 'Tareas',           module: 'tareas',         section: 'primary' },
  { key: 'facturacion', href: '/admin/facturacion',     label: 'Facturación',      module: 'facturacion',    section: 'primary', prefetch: false },
  { key: 'finanzas',    href: '/admin/finanzas/resumen',label: 'Finanzas',         module: 'facturacion',    section: 'primary', prefetch: false },
  { key: 'equipo',      href: '/admin/equipo',          label: 'Equipo',           module: 'equipo',         section: 'primary' },
  // more
  { key: 'mi-semana',       href: '/admin/mi-semana',       label: 'Mi semana',         module: 'tareas',          section: 'more' },
  { key: 'targets',         href: '/admin/targets',         label: 'Creadores Target',  module: 'targets',         section: 'more', prefetch: false },
  { key: 'prensa-targets',  href: '/admin/prensa-targets',  label: 'Prensa Targets',    module: 'prensa_targets',  section: 'more', prefetch: false },
  { key: 'live',            href: '/admin/live',            label: 'En directo',        module: 'talentos',        section: 'more', prefetch: false },
  { key: 'giveaways',       href: '/admin/giveaways',       label: 'Sorteos',           module: 'sorteos',         section: 'more', prefetch: false },
  {
    key: 'alertas',
    href: '/admin/alertas',
    label: 'Alertas',
    module: null,
    roles: ['admin', 'admin_limited_tasks', 'manager', 'editor', 'ops'],
    section: 'more',
    prefetch: false,
  },
  { key: 'noticias',     href: '/admin/noticias',     label: 'Noticias',      module: 'noticias',  section: 'more', prefetch: false },
  { key: 'estadisticas', href: '/admin/estadisticas', label: 'Estadísticas',  module: 'noticias',  section: 'more', prefetch: false },
  { key: 'analytics',    href: '/admin/analytics',    label: 'Analítica',     module: 'analytics', section: 'more', prefetch: false },
  { key: 'cases',        href: '/admin/cases',        label: 'Casos',         module: 'campanas',  section: 'more', prefetch: false },
  {
    key: 'asistente',
    href: '/admin/asistente',
    label: 'Asistente IA',
    module: null,
    roles: ['admin', 'admin_limited_tasks', 'manager', 'finance', 'analyst', 'ops', 'talent_manager', 'editor'],
    section: 'more',
    prefetch: false,
  },
  { key: 'contratos',   href: '/admin/contratos',   label: 'Contratos',   module: 'contratos', section: 'more', prefetch: false },
  { key: 'entregables', href: '/admin/entregables', label: 'Entregables', module: 'campanas',  section: 'more', prefetch: false },
  { key: 'backups',     href: '/admin/backups',     label: 'Backups',     module: 'ajustes',   section: 'more', prefetch: false },
] as const;

/** @pure */
export function canAccessNavItem(role: Role | null | undefined, item: AdminNavDef): boolean {
  if (!role) return false;
  if (item.roles) return item.roles.includes(role);
  if (!item.module) return true;
  return hasPermission(role, item.module, item.action ?? 'read');
}

export type FilteredNavItem = {
  readonly key: AdminNavKey;
  readonly href: string;
  readonly label: string;
  readonly prefetch?: boolean;
};

/**
 * Permission-filtered nav for a role.
 * Staff gets "Mi semana" promoted to primary first (UX home).
 *
 * @pure
 */
export function navForRole(role: Role | null | undefined): {
  readonly primary: readonly FilteredNavItem[];
  readonly more: readonly FilteredNavItem[];
} {
  const allowed = ADMIN_NAV_CATALOGUE.filter((item) => canAccessNavItem(role, item));

  const toItem = (item: AdminNavDef): FilteredNavItem => ({
    key: item.key,
    href: item.href,
    label: item.label,
    ...(item.prefetch === false ? { prefetch: false } : {}),
  });

  let primary = allowed.filter((i) => i.section === 'primary').map(toItem);
  let more = allowed.filter((i) => i.section === 'more').map(toItem);

  // Staff home is mi-semana — promote it and drop Panel (they bounce without useful KPIs).
  if (role === 'staff') {
    const miSemana = more.find((i) => i.key === 'mi-semana');
    more = more.filter((i) => i.key !== 'mi-semana');
    primary = primary.filter((i) => i.key !== 'panel');
    if (miSemana) {
      primary = [miSemana, ...primary];
    }
  }

  return { primary, more };
}

export type QuickActionDef = {
  readonly label: string;
  readonly href: string;
  readonly emoji: string;
  readonly module: Module;
  readonly action: Action;
};

export const QUICK_ACTION_CATALOGUE: readonly QuickActionDef[] = [
  { label: 'Nueva tarea',   href: '/admin/tareas',      emoji: '✓', module: 'tareas',      action: 'write' },
  { label: 'Nueva marca',   href: '/admin/brands',      emoji: '🏢', module: 'campanas',    action: 'write' },
  { label: 'Nueva factura', href: '/admin/facturacion', emoji: '€', module: 'facturacion', action: 'write' },
  { label: 'Nuevo talento', href: '/admin/talents',     emoji: '⭐', module: 'talentos',    action: 'write' },
] as const;

/** @pure */
export function quickActionsForRole(role: Role | null | undefined): readonly QuickActionDef[] {
  if (!role) return [];
  return QUICK_ACTION_CATALOGUE.filter((a) => hasPermission(role, a.module, a.action));
}
