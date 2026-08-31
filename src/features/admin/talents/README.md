# Feature · admin/talents

> Gestión de talents en el CRM. Tarjetas, tabla, perfiles e inteligencia
> comparativa de audiencia y contenido.

## Routes

- `/admin/talents` — tarjetas, tabla y estadísticas de cartera
- `/admin/talents/[id]` — perfil con tabs
- `/admin/talents/[id]/stats`, `/negocio`, `/files`
- `/admin/talents/fotos` — gestión de fotos

## Componentes

- `InfluencerCardsView.tsx` — vista de cards.
- `RosterSpreadsheet.tsx` — vista spreadsheet editable.
- `TalentIntelligenceDashboard.tsx` — tendencias 30/90/365 días, diagnóstico,
  mejor mes y contenido destacado.
- `TalentProfileTabs.tsx` — tabs del perfil.
- `TalentStatsByPlatform.tsx` — stats por plataforma.
- `TalentGeoFiles.tsx` — archivos GEO.
- `TalentBusinessForm.tsx` — formulario negocio.
- `TalentCampaignsTab.tsx` — tab de campañas del talent.
- `TalentPhotoCard.tsx` — card de foto.

## Server vs Client

- **Client** la mayoría (filtros, drawer y panel estadístico).
- **Server**: TalentPhotoCard.

## Inteligencia y sincronización

- `talent_channel_snapshots` guarda una foto diaria comparable por canal.
- `talent_content_performance` guarda el rendimiento público de vídeos.
- `/api/cron/snapshot-metrics` actualiza YouTube a diario y conserva la
  compatibilidad con el histórico anterior. Twitch se completa cuando sus
  credenciales vuelven a estar operativas.
- Instagram, TikTok y Kick muestran la audiencia declarada en el perfil hasta
  disponer de una API de métricas autorizada.
- La importación masiva se retiró de la navegación del roster; el código legado
  no se ha eliminado para que una recuperación sea reversible.

## Archivos a partir (>300 LOC)

- `InfluencerImport.tsx` (897) — legado no enlazado desde el roster.
- `RosterSpreadsheet.tsx` (488).
- `InfluencerCardsView.tsx` (309).

## Dependencias clave

- `@/lib/queries/talents`, `talentBusiness`, `stats`.
- `@/lib/parsers/*` para CSV.
