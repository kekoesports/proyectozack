# Feature · admin/invoices

> Facturación ampliada: empresa, categoría, IA específica, métodos
> (banco/crypto), archivos (factura + extracto via Vercel Blob).
> Incluye flujo de import con mapeo de columnas.

## Routes

- `/admin/facturacion` — listado.
- `/admin/facturacion/import` — import inbox.
- `/admin/facturacion/exports` — exports fiscales.

## Componentes

- `InvoicesManager.tsx` — orquestador (tabla + filtros + drawer).
- `InvoiceDrawer.tsx` — drawer de edición.
- `InvoiceCategoryField.tsx` — autocomplete + sub-select condicional IA.
- `InvoiceFileFields.tsx` — campos de upload (factura + extracto).
- `ImportInbox.tsx` — flujo de import (upload + parse + map + commit).
- `ColumnMappingModal.tsx` — mapeo de columnas import.
- `FiscalExports.tsx` — exports fiscales por empresa.

## Archivos a partir (>300 LOC)

- `ImportInbox.tsx` (524) — split list/detail/actions.
- `InvoicesManager.tsx` (310) — split table/filters/drawer.

## Server vs Client

- **Client**: todos (forms, drawers, file uploads).

## Dependencias clave

- `@/lib/queries/invoices`, `invoiceImports`, `invoiceImportTemplates`.
- `@/lib/parsers/pdfHeuristics`.
- `@/lib/storage` — Vercel Blob.
