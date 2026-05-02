Status: needs-triage

# 05 — Saneamiento `targets` + `facturacion` + `tareas` (internos)

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Aplicar los deep modules del issue 01 a los tres dominios internos restantes. Agrupados en un PR porque comparten patrones (FormData scalar-only + uploads de PDF + CSV import) y porque ninguno tiene superficie pública.

Alcance:

- `src/app/admin/(dashboard)/targets/`
- `src/app/admin/(dashboard)/facturacion/`
  - `import/` (CSV de facturas — cada fila por schema antes de DB, User Story 12 del PRD)
  - `issued-invoices-actions`
  - `invoices-actions`
  - uploads de PDF de factura → `validateUploadedFile` con magic bytes `%PDF-`.
- `src/app/admin/(dashboard)/tareas/`
  - `tareas/` raíz
  - `plantillas/` (cuidado con unique index en `crm_task_templates.title` — gotcha en CLAUDE.md).
- `src/app/marcas/(portal)/targets/` — portal de marcas (mismo patrón pero con auth de rol marca).

Por cada Server Action:

- `parseFormData(formData, Schema)` reemplaza casts.
- Uploads de factura PDF: `validateUploadedFile` con `allowedMimes: ['application/pdf']`, `allowedExts: ['.pdf']`, magic bytes `%PDF-`.
- CSV import facturas: cada fila por schema, filas inválidas acumuladas en error report.
- `as Quarter`/`as InvoiceStatus` reemplazado por `z.enum([...])`.
- Logs con NIF/IBAN/datos fiscales pasan por `logRedacted`.

Cuidado con la gotcha de `invoice_status`: incluye **`cobrada` Y `pagada`** (ambos = settled income). Si tocas el schema, mantén el set completo.

`campaigns.amountBrand/amountTalent` = presupuesto previsto, NO pagos reales. No mezclar al validar imports — pagos van por `invoices.campaignId` (gotcha CLAUDE.md).

## Acceptance criteria

- [ ] 0 ocurrencias de `as string`/`as Quarter`/`as InvoiceStatus` en los tres dominios.
- [ ] Uploads de PDF de factura pasan por `validateUploadedFile` con magic bytes `%PDF-`.
- [ ] CSV import de facturas: cada fila por schema antes de DB; report de errores por fila.
- [ ] `invoice_status` schema incluye `cobrada` Y `pagada` (no eliminar uno por accidente).
- [ ] Cada Server Action mutante: `requireRole` → `parseFormData` → mutation → `{ ok }`.
- [ ] Plantillas de tareas: idempotencia preservada con unique index en `title`.
- [ ] Portal de marcas (`app/marcas/(portal)/targets/`) usa el rol de marca apropiado en `requireRole`/`requireAnyRole`.
- [ ] Logs con datos fiscales (NIF, IBAN, importes) pasan por `logRedacted`.
- [ ] Tests existentes pasan, E2E de los tres dominios pasa.
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.

## Blocked by

- Issue 01 (deep modules + tests).
