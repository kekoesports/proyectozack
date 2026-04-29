# Feature · admin/talents

> Gestión de talents en el CRM. Cards, perfiles con tabs (Stats/GEO/Negocio/
> Histórico), import masivo CSV.

## Routes

- `/admin/talents` — listado (cards/spreadsheet)
- `/admin/talents/[id]` — perfil con tabs
- `/admin/talents/[id]/stats`, `/negocio`, `/files`
- `/admin/talents/import` — import CSV con mapeo
- `/admin/talents/fotos` — gestión de fotos

## Componentes

- `InfluencerCardsView.tsx` — vista de cards.
- `RosterSpreadsheet.tsx` — vista spreadsheet editable.
- `InfluencerImport.tsx` — flujo de import CSV (parser + mapeo + preview + upload).
- `TalentProfileTabs.tsx` — tabs del perfil.
- `TalentStatsByPlatform.tsx` — stats por plataforma.
- `TalentGeoFiles.tsx` — archivos GEO.
- `TalentBusinessForm.tsx` — formulario negocio.
- `TalentCampaignsTab.tsx` — tab de campañas del talent.
- `TalentPhotoCard.tsx` — card de foto.

## Server vs Client

- **Client** la mayoría (filtros, drawer, import wizard).
- **Server**: TalentPhotoCard.

## Archivos a partir (>300 LOC)

- `InfluencerImport.tsx` (897) — split por fases del wizard.
- `RosterSpreadsheet.tsx` (488).
- `InfluencerCardsView.tsx` (309).

## Dependencias clave

- `@/lib/queries/talents`, `talentBusiness`, `stats`.
- `@/lib/parsers/*` para CSV.
