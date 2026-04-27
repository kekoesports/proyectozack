# Feature · admin/_shared

> Primitivos UI admin-only (no globales) y chrome del panel admin.
> No promover a `components/ui/` global porque acoplan tokens
> `sp-admin-*` y enums admin (StateBadge, EditDrawer, KpiCard).

## Componentes

### Chrome admin

- `AdminHeader.tsx` — topbar con búsqueda global.
- `AdminSidebar.tsx` — sidebar con grupos (CRM / Operaciones / Finanzas / Más).
- `SidebarIcons.tsx` — set de iconos del sidebar.
- `Avatar.tsx` — avatar con fallback iniciales.

### Primitivos admin

- `StateBadge.tsx` — badge de estado coloreado (status enum).
- `EditDrawer.tsx` + `useEditDrawer.ts` — drawer lateral genérico.
- `KpiCard.tsx` — card de KPI con título + valor + delta.
- `FilterBar.tsx` — barra de filtros sticky.
- `AlertList.tsx` — lista de alertas.
- `Skeleton.tsx` — skeleton genérico admin.
- `EmptyState.tsx` — empty state admin (variante distinta a brand-portal).
- `MetricsChart.tsx` — chart genérico de métricas.

### Búsqueda

- `GlobalSearch.tsx` — popover de búsqueda global con Cmd/Ctrl+K.

## Server vs Client

- **Client**: AdminHeader, AdminSidebar (mobile menu), GlobalSearch,
  EditDrawer, FilterBar, AlertList interactiva, MetricsChart.
- **Server**: StateBadge, KpiCard, EmptyState, Skeleton, Avatar, SidebarIcons.

## Dependencias clave

- `@/lib/auth-guard`, `@/lib/permissions`.
- `recharts` — MetricsChart, charts del dashboard.
