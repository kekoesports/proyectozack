# Feature · marketing-site

> Sitio público de marketing. Home, secciones de la landing, y wrappers
> que componen otras features (talents-public, cases) en la home.

## Routes que sirve

- `/` — home (`src/app/page.tsx`)
- Secciones reutilizadas en otras landings públicas (`/nosotros`, `/servicios`, `/metodologia`).

## Entry points

- `components/Hero.tsx` — hero principal con auras parallax + gradient typography.
- `components/Marquee.tsx` — banda animada de logos/keywords.
- `components/BrandsCarousel.tsx` — carrusel de marcas colaboradoras.
- `components/TalentSection.tsx` — wrapper de la home que monta `TalentGrid` (importado de `talents-public`).
- `components/CasesSection.tsx` — wrapper que monta `CaseCard` (importado de `cases`).
- `components/PortfolioSection.tsx`, `PortfolioGrid.tsx` — bloque portfolio.
- `components/MetricsSection.tsx`, `ServicesSection.tsx`, `CollabsSection.tsx`,
  `AboutSection.tsx`, `AboutCard.tsx`, `TeamGrid.tsx`, `TeamCard.tsx`,
  `CtaSection.tsx`, `FaqSection.tsx`.

## Server vs Client

- **Server** (default): wrappers de sección (`TalentSection`, `CasesSection`,
  `BrandsCarousel`, `PortfolioSection`, `AboutSection`, `TeamGrid`, etc.)
- **Client** (`'use client'`): componentes con motion/state — `Hero`, `Marquee`,
  `MetricsSection` (counters), `ServicesSection` (tabs), `CtaSection`, `FaqSection`.

## Dependencias clave

- `@/lib/queries/content` — getBrands, getCollaborators, getTeam.
- `@/lib/queries/portfolio` — getPortfolioItems.
- `@/features/talents-public/components/*` — TalentGrid/Card/Modal.
- `@/features/cases/components/CaseCard`.
- `motion/react` — animaciones.
