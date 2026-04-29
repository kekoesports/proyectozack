# Feature · cases

> Casos de éxito (case studies). Card reutilizable que consume la home
> (vía `marketing-site`) y la página dedicada.

## Routes que sirve

- `/casos` — listado
- `/casos/[slug]` — case detail
- Reutilizado por `features/marketing-site/components/CasesSection`

## Entry points

- `components/CaseCard.tsx` — card de caso individual.

## Server vs Client

- **Server**: CaseCard.

## Dependencias clave

- `@/lib/queries/cases` — getCaseStudies(), getCaseBySlug().
- `@/types` — CaseStudyWithRelations.
