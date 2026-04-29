# Feature · contact

> Formulario público de contacto + formulario de candidatura de creadores.
> Ambos hablan con `app/api/contact/route.ts` y `app/api/creator-apply/route.ts`.

## Routes que sirve

- `/contacto` — formulario para marcas (ContactSection)
- `/para-creadores` — formulario para creadores (CreatorApplyForm)

## Entry points

- `components/ContactSection.tsx` — formulario completo para marcas (también
  embebido en home).
- `components/CreatorApplyForm.tsx` — formulario de candidatura.

## Schemas

- `schemas/contact.ts` — Zod schema validado en `app/api/contact/route.ts`.
- `schemas/creator-apply.ts` — Zod schema validado en
  `app/api/creator-apply/route.ts`.

> Por ahora los schemas viven en `src/lib/schemas/`. Si la feature crece,
> se moverán aquí.

## Server vs Client

- **Client** (`'use client'`): ambos (status machine, validación cliente,
  envío fetch).

## Dependencias clave

- `@/lib/schemas/contact`, `@/lib/schemas/creator-apply`.
- `react-hook-form` + `@hookform/resolvers`.
