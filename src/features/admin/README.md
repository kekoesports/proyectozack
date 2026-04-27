# Feature · admin

> CRM operativo interno (`/admin/(dashboard)/**`). Acceso con roles
> `admin | manager | staff` (`requireAnyRole`). Visibilidad por entidad
> aplicada en queries (ver `src/lib/permissions.ts`).

## Sub-features

| Sub-feature | Path | Routes principales |
|---|---|---|
| `_shared/` | primitivos admin (StateBadge, EditDrawer, KpiCard, FilterBar, Skeleton, AlertList, AdminHeader, AdminSidebar, GlobalSearch, useEditDrawer, Avatar, MetricsChart, SidebarIcons, EmptyState) | — |
| `dashboard/` | widgets del dashboard | `/admin/` |
| `talents/` | gestión de talents | `/admin/talents/**` |
| `brands/` | CRM de marcas + contactos + follow-ups | `/admin/brands/**` |
| `campaigns/` | campañas/tratos | `/admin/campanas/**` |
| `invoices/` | facturación + import + export | `/admin/facturacion/**` |
| `pnl/` | P&L mensual | `/admin/pl/**` |
| `tasks/` | tareas + plantillas recurrentes | `/admin/tareas/**` |
| `targets/` | outreach (Twitch/YouTube) | `/admin/targets/**` |
| `files/` | archivos genéricos polimórficos | embebido |
| `equipo/` | gestión de staff + fotos | `/admin/equipo/**` |
| `stats/` | stats por talent (admin view) | `/admin/stats/**` |
| `analytics/` | growth reports | `/admin/analytics/**` |

## Convención

- Componentes admin-only viven en su sub-feature.
- Primitivos admin compartidos van en `_shared/components/`.
- Los routes en `app/admin/(dashboard)/**/page.tsx` deben ser thin shells
  (≤ 60 LOC) que importan datos vía queries y delegan al componente principal.

## Dependencias clave

- `@/lib/auth-guard` — requireAnyRole(['admin','manager','staff']).
- `@/lib/permissions` — canSeeAll, canDelete, assertCanDelete.
- `@/lib/queries/*` — todas las queries admin (ver `// ── Admin ──` separator).
