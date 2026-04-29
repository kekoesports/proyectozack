# Feature · admin/equipo

> Gestión de staff (`staff_users`) y fotos del equipo público.

## Routes

- `/admin/equipo` — listado.
- `/admin/equipo/fotos` — gestión de fotos del equipo público.

## Componentes

- `InviteStaffForm.tsx` — invitar a un staff.
- `UploadForm.tsx` — upload de fotos.

## Server vs Client

- **Client**: ambos.

## Dependencias clave

- `@/lib/queries/staffUsers`.
- `@/lib/storage`.
