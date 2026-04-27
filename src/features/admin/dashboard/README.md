# Feature · admin/dashboard

> Widgets accionables del dashboard admin (`/admin/`). Cada widget muestra
> datos reales del CRM (no mocks). Manager/staff ven solo lo permitido.

## Routes

- `/admin/` — landing del CRM
- `/admin/mi-semana` — vista personal con tareas y follow-ups

## Componentes

- `ActiveCampaignsWidget.tsx` — campañas activas.
- `AlertsWidget.tsx` — alertas operativas.
- `PendingPaymentsWidget.tsx` — pagos pendientes.
- `RevenueMonthWidget.tsx` — ingresos del mes.
- `RevenueTrendChart.tsx` — chart de tendencia (recharts).
- `StaleStatsWidget.tsx` — stats sin actualizar.
- `UpcomingFollowupsWidget.tsx` — próximos follow-ups.
- `UrgentTasksWidget.tsx` — tareas urgentes.

## Server vs Client

- **Server**: todos excepto `RevenueTrendChart` (recharts).

## Dependencias clave

- `@/lib/queries/dashboard`, `pnl`, `crmTasks`, `crmBrands`.
