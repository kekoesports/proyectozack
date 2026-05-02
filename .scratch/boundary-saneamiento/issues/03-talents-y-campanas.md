Status: needs-triage

# 03 — Saneamiento `talents` + `campanas` (CRUD core, datos comerciales)

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Aplicar los deep modules del issue 01 al CRUD core de talents y campañas. Es el dominio con más Server Actions y mayor superficie de boundaries (FormData, file uploads, query params en sub-páginas). PR único — los dos sub-dominios comparten utilities y schemas suficientes como para revisarse juntos.

Alcance:

- `src/app/admin/(dashboard)/talents/` — incluye sub-rutas:
  - `import/` (CSV import — cada fila por Zod schema antes de DB, ver User Story 12 del PRD)
  - `[id]/stats/` (uploads de GEO stats → `validateUploadedFile`)
  - `[id]/files/` (adjuntos polimórficos → `validateUploadedFile`)
  - `[id]/negocio/` (datos comerciales/fiscales sensibles)
  - `fotos/` (upload de fotos → `validateUploadedFile`)
- `src/app/admin/(dashboard)/campanas/` — incluye sub-rutas:
  - `[id]/files/` (adjuntos)
  - `plantillas/`
  - contracts (uploads de contrato PDF → `validateUploadedFile` con magic bytes `%PDF-`)

Patrón canónico (PRD § "Server Action canonical pattern"). Por cada Server Action:

- `parseFormData(formData, Schema)` reemplaza `formData.get('x') as string`.
- `as TalentStatus`/`as CampaignStatus` reemplazado por `z.enum([...])` (constantes ya existen en `db/schema/`).
- `searchParams.x as Quarter` (en route handlers o page params) reemplazado por Zod schema.
- Uploads (GEO stats, contratos, files polimórficos) pasan por `validateUploadedFile`.
- CSV import: cada fila por schema antes de tocar DB (User Story 12).
- Logs con datos comerciales/contacto pasan por `logRedacted`.

Schemas: auditar `src/lib/schemas/` primero. `talentSchema`, `campaignSchema`, `taskSchema` existentes — reusar/extender. Migrar oportunistamente a convención canónica los schemas tocados.

## Acceptance criteria

- [ ] 0 ocurrencias de `as string`/`as TalentStatus`/`as CampaignStatus`/`as Quarter` en `app/admin/(dashboard)/talents/**` y `app/admin/(dashboard)/campanas/**`.
- [ ] Cada Server Action mutante: `requireRole` → `parseFormData` → mutation → `{ ok }`.
- [ ] Uploads (GEO stats, contratos, files polimórficos, fotos) pasan por `validateUploadedFile` con magic bytes apropiados (PDF, PNG, JPEG).
- [ ] CSV import: cada fila pasada por schema antes de DB; filas inválidas se rechazan con error de fila acumulado.
- [ ] Schemas en `lib/schemas/` — sección en PR description con reusados/extendidos/nuevos.
- [ ] Logs con email/teléfono/datos fiscales pasan por `logRedacted`.
- [ ] Tests existentes (`queries-talents.test.ts`, etc.) pasan sin modificar.
- [ ] E2E de talents y campanas pasa.
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.
- [ ] Cuidado especial con `talentSocials.platform` (claves cortas `yt`/`tw`) vs `talentMetricSnapshots.platform` (nombres completos `youtube`/`twitch`) — no unificar por accidente al hacer schemas (gotcha documentado en CLAUDE.md).

## Blocked by

- Issue 01 (deep modules + tests).
