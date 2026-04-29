# Feature · giveaways

> Hub de giveaways y sorteos públicos. Engloba la página `/giveaways`,
> `/sorteos`, y carruseles reutilizados en otras superficies.

## Routes que sirve

- `/giveaways` — hub principal
- `/sorteos` — listado alternativo

## Entry points

- `components/GiveawaysHub.tsx` — orquestador del hub.
- `components/GiveawayHubCard.tsx` — card grande de giveaway destacado.
- `components/GiveawayCarousel.tsx`, `CreatorCarousel.tsx`.
- `components/GiveawaySection.tsx`, `FeaturedCodesSection.tsx`.
- `components/HeroSection.tsx` — hero específico de la hub.
- `components/CodeCard.tsx` — card de código promocional.
- `components/SorteoCard.tsx` — variante card para `/sorteos`.
- `components/StatsBar.tsx`, `RecentWinners.tsx`, `TopWinners.tsx`.
- `components/FiltersBar.tsx`, `CategorySortBar.tsx`.
- Sidebars: `BrandsSidebar.tsx`, `CreatorsSidebar.tsx`, `GiveawaySidebarPanel.tsx`.

## Server vs Client

- **Client** (`'use client'`): casi todo (filtros, carruseles, sidebars con estado).
- **Server**: `GiveawaysHub` (orquesta y pasa props).

## Dependencias clave

- `@/lib/queries/giveaways*`, `@/lib/queries/giveawayWinners`.
- `@/types/giveaway`.
