# Feature · talent-stats-public

> Vista pública por token de stats de un talent. Se comparte como link
> con marcas sin acceso al portal. NO es admin, NO es brand-portal —
> es un flujo público con autorización por token.

## Routes que sirve

- `/stats/[token]`

## Entry points

- `components/StatsView.tsx` — orquestador de la vista pública.
- `components/KpiCards.tsx` — tarjetas de KPIs.
- `components/StatsTableRow.tsx` — fila de tabla de stats.

## Server vs Client

- **Server**: StatsView, KpiCards, StatsTableRow.

## Dependencias clave

- `@/lib/queries/stats` — getStatsByToken().
- `@/types/talent`.
