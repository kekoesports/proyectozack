# Feature · talents-public

> Vista pública del roster de talents. Cards reutilizables que consumen
> `TalentWithRelations` y se montan en home (vía `marketing-site`) y en
> `/talentos`.

## Routes que sirve

- `/talentos` — listado público
- `/talentos/[slug]` — ficha pública
- También consumido por `features/marketing-site` en la home

## Entry points

- `components/TalentCard.tsx` — card individual.
- `components/TalentGrid.tsx` — grilla con filtros locales (client-side).
- `components/TalentModal.tsx` — modal de detalle.

## Server vs Client

- **Client** (`'use client'`): TalentGrid (filtros), TalentModal (estado abierto/cerrado).
- **Server**: TalentCard puro (recibe props).

## Dependencias clave

- `@/lib/queries/talents` — getTalents() / getTalentBySlug().
- `@/types` — TalentWithRelations.
- `@/components/ui/SocialIcon`, `StatusBadge`.
