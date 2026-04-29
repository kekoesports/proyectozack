# Feature · admin/targets

> Outreach a targets (Twitch + YouTube). Listas con búsqueda, diagnóstico,
> empty states. Distinto del módulo Campañas (que ya están firmadas).

## Routes

- `/admin/targets` — spreadsheet principal.

## Componentes

- `TargetsSpreadsheet.tsx` — tabla editable.
- `TargetsDiagnostics.tsx` — panel de diagnóstico de calidad.
- `TargetsEmptyState.tsx` — empty state específico.
- `TwitchSearch.tsx` — búsqueda en Twitch.
- `YouTubeSearch.tsx` — búsqueda en YouTube.
- `ThSortable.tsx` — th ordenable reutilizable dentro de la feature.
- `targets-constants.ts` — constantes de la feature (no es componente).
- `export-csv.ts` — utilidad de export CSV (no es componente).

## Archivos a partir (>300 LOC)

- `TargetsSpreadsheet.tsx` (618) — split header/rows/cells/toolbar.
- `YouTubeSearch.tsx` (524) — split form/results/preview.

## Server vs Client

- **Client**: TargetsSpreadsheet, TwitchSearch, YouTubeSearch, TargetsDiagnostics.
- **Server**: TargetsEmptyState, ThSortable.

## Dependencias clave

- `@/lib/queries/targets`.
- `@/lib/services/youtube`.
