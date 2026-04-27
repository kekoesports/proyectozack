# Feature · brand-portal

> Portal privado de marcas (`/marcas/(portal)/**`). Acceso con rol `brand`
> (Better Auth + `requireRole('brand', '/marcas/login')`).

## Routes que sirve

- `/marcas/(portal)/` — dashboard
- `/marcas/(portal)/talentos` — catálogo público filtrable
- `/marcas/(portal)/talentos/[slug]` — ficha + modal de propuesta
- `/marcas/(portal)/comparar` — comparación side-by-side
- `/marcas/(portal)/propuestas` — propuestas enviadas
- `/marcas/(portal)/facturas` — facturas
- `/marcas/(portal)/targets` — outreach targets vista marca

## Entry points

- `components/BrandTalentCard.tsx` — card del catálogo brand.
- `components/BrandTalentFichaClient.tsx` — wrapper client de la ficha.
- `components/EmptyState.tsx` — empty state con tema brand-portal.
- `components/FilterChips.tsx` — chips de filtros.
- `components/ProposalModal.tsx` — modal para enviar propuesta.
- `components/BrandTargetsSpreadsheet.tsx` — vista de targets (spreadsheet).

## Server vs Client

- **Client**: BrandTalentFichaClient, FilterChips, ProposalModal, BrandTargetsSpreadsheet.
- **Server**: BrandTalentCard, EmptyState.

## Dependencias clave

- `@/lib/auth-guard` — requireRole('brand').
- `@/lib/queries/talents`, `@/lib/queries/brands`, `@/lib/queries/targets`.
- `@/lib/schemas/proposal`.
