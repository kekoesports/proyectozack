# Feature · admin/brands

> CRM de marcas: brands + contactos + follow-ups + invitaciones a portal.

## Routes

- `/admin/brands` — listado + detalle integrado.

## Componentes

- `BrandsCrmManager.tsx` — orquestador principal (tabs + drawer + tabla).
- `BrandsTabs.tsx` — tabs (brands / contactos / follow-ups).
- `BrandFormDrawer.tsx` — drawer de creación/edición de marca.
- `BrandContactForm.tsx` — formulario de contacto.
- `BrandFollowupForm.tsx` — formulario de follow-up.
- `BrandCampaignsTab.tsx` — tab de campañas asociadas.
- `invite-form.tsx` — formulario de invitación al portal.

## Archivos a partir (>300 LOC)

- `BrandsCrmManager.tsx` (899) — split por tabs + drawer.

## Server vs Client

- **Client**: todos (forms, drawers, tabs).

## Dependencias clave

- `@/lib/queries/crmBrands`, `brands`, `brandUsers`.
- `@/lib/permissions`.
