# lib/queries — Data layer (Drizzle)

> Capa de acceso a datos. **Cross-cutting**: la misma query la consumen
> distintas features (marketing-site, brand-portal, admin/*). Por eso
> NO se co-localiza en `features/`.

## Archivos por dominio

### Públicos / marketing

| Archivo | Exports clave |
|---|---|
| `talents.ts` | `getTalents`, `getTalentBySlug` |
| `cases.ts` | `getCaseStudies`, `getCaseBySlug` |
| `content.ts` | `getBrands`, `getCollaborators`, `getTeam` |
| `portfolio.ts` | `getPortfolioItems` |
| `posts.ts` | `getBlogPosts`, `getBlogPostBySlug` |
| `stats.ts` | `getStatsByToken` (vista pública) |
| `agencyCreators.ts` | datos de creators para `/[creatorSlug]` |
| `creatorCodes.ts`, `giveaways.ts`, `giveawaysHub.ts`, `giveawayWinners.ts` | giveaways |

### Admin CRM

| Archivo | Exports clave |
|---|---|
| `crmBrands.ts` | brands + contactos + follow-ups |
| `crmTasks.ts` | tareas + rollover |
| `taskTemplates.ts` | plantillas recurrentes |
| `campaigns.ts` | campañas/tratos |
| `invoices.ts`, `invoiceImports.ts`, `invoiceImportTemplates.ts`, `invoiceParserTemplates.ts` | facturación |
| `pnl.ts` | P&L mensual |
| `targets.ts` | outreach |
| `dashboard.ts` | widgets dashboard |
| `analytics.ts` | growth reports |
| `files.ts` | archivos polimórficos |
| `staffUsers.ts`, `brandUsers.ts` | gestión de usuarios |
| `talentBusiness.ts` | datos de negocio del talent |
| `search.ts` | búsqueda global ILIKE |

## Convenciones

- **Public queries** filtran `visibility = 'public'`.
- **Admin queries** (`getAll*`) skip ese filtro y aplican `permissions.ts`.
- Single-item lookups: wrap en `cache()` de React.
- Order: siempre `sortOrder ASC` cuando aplica.
- Return: `row ?? undefined`. Nunca `null`.
- Explicit return types en cada función exportada.
- Separator `// ── Admin ──` cuando un archivo combina queries públicas y admin.

## TSDoc obligatorio

Cada query exportada debe llevar:

```ts
/**
 * Devuelve talents públicos ordenados por sortOrder ASC.
 *
 * @cache wrapped in React `cache()` for request dedupe.
 * @visibility public (filters `visibility = 'public'`).
 * @returns array (puede ser vacío). Nunca null.
 */
```
