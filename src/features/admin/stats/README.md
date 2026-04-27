# Feature · admin/stats

> Stats por talent (admin view). Distinto de `talent-stats-public/` que
> sirve `/stats/[token]`.

## Routes

- `/admin/stats` — listado/ranking.
- `/admin/talents/[id]/stats` — stats del talent.

## Componentes

- `RankingTable.tsx` — tabla ranking de talents.
- `StatsTable.tsx` — tabla de snapshots.
- `GeoEditor.tsx` — editor de top GEOs.
- `ShareLinkPanel.tsx` — generar link público token-based.
- `StatsExportPanel.tsx` — export.
- `StatsImportPanel.tsx` — import.

## Server vs Client

- **Client**: editores e import/export.
- **Server**: tablas.

## Dependencias clave

- `@/lib/queries/stats`, `talents`.
- `@/lib/statsImport`.
