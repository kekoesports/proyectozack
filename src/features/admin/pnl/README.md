# Feature · admin/pnl

> P&L mensual con KPIs, breakdown por categoría, top brands/talents.
> Export CSV BOM UTF-8 + separador `;` (compat Excel ES).

## Routes

- `/admin/pl` — vista principal.
- `/admin/pl/export` — handler de export.

## Componentes

- `PnLOverviewCards.tsx` — 8 KPI cards.
- `PnLBreakdownTable.tsx` — tabla mensual.
- `PnLCategoryList.tsx` — top categorías de gasto.
- `PnLFilters.tsx` — filtros sticky.

## Server vs Client

- **Server**: todos.

## Dependencias clave

- `@/lib/queries/pnl` — `getPnL`, `getTopBrandsByGrossInvoiced`, `getTopTalentsByGrossInvoiced`.
- `@/lib/exports/pnl-csv`.
