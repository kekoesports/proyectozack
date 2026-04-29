# Feature · auth

> Páginas de login y onboarding de auth (admin + brand). La lógica de Better
> Auth vive en `src/lib/auth.ts`; aquí solo van componentes UI propios de
> los flujos.

## Routes que sirve

- `/admin/login`
- `/marcas/login`

## Entry points

- _Pendiente: en la migración inicial puede no tener componentes propios
  (las páginas son thin)._

## Server vs Client

- N/A todavía.

## Dependencias clave

- `@/lib/auth` — Better Auth client + server.
