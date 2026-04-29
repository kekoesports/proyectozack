# Feature · admin/files

> Tabla `files` genérica para adjuntos polimórficos (talents, campaigns,
> invoices). Componentes embedidos en cada feature consumidora.

## Componentes

- `FilesList.tsx` — listado de archivos.
- `FileUploadButton.tsx` — botón de upload (Vercel Blob).

## Server vs Client

- **Client**: FileUploadButton.
- **Server**: FilesList.

## Dependencias clave

- `@/lib/queries/files`.
- `@/lib/storage` — Vercel Blob upload helpers.
