# Feature · admin/campaigns

> Módulo Campañas/Tratos. Une marca + influencer + contacto + responsable
> + pagos + comisiones + archivos. EUR-only (decisión #2 del CRM redesign).

## Routes

- `/admin/campanas` — listado.
- `/admin/campanas/[id]` — detalle con tabs.
- `/admin/campanas/[id]/files` — archivos.

## Componentes

- `CampaignsList.tsx` — listado.
- `CampaignFilters.tsx` — filtros.
- `CampaignDetailTabs.tsx` — tabs del detalle.
- `CampaignDrawer.tsx` — drawer de creación/edición.
- `CampaignSummaryCard.tsx` — card resumen.
- `CampaignFiles.tsx` — bloque de archivos.
- `CampaignPayments.tsx` — pagos (vinculados a invoices).

## Archivos a partir (>300 LOC)

- `CampaignDrawer.tsx` (474) — split por tabs (info/files/payments).

## Server vs Client

- **Client** la mayoría.
- **Server**: CampaignSummaryCard.

## Dependencias clave

- `@/lib/queries/campaigns`, `invoices`, `talents`, `crmBrands`.
- Cálculos: `commissionAmount = amountBrand - amountTalent` (no SQL generated).
