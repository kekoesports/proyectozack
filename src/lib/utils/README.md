# lib/utils — Pure utility functions

> Pequeñas funciones puras sin dependencias de DB, auth o estado externo.
> Reutilizables desde server, client, tests, y scripts.

## Archivos

| Archivo | Propósito |
|---|---|
| `cn.ts` | `cn(...)` — combinador clsx + tailwind-merge (shadcn). |
| `format.ts` | `formatNumber`, `formatEUR`, `formatDate`, etc. |
| `date.ts` | utilidades de fechas (parsing, comparaciones). |
| `week.ts` | helpers de semana ISO (rollover de tareas, weekLabel). |
| `gradient.ts` | `gradientStyle()` — produce el `linear-gradient(...)` de marca. |
| `animation.ts` | constantes de easing y duraciones (motion). |
| `text.ts` | helpers de strings (slugify, truncate). |
| `hash.ts` | hashing utilitario (no crypto-grade, ver `lib/storage` para crypto). |
| `platform.ts` | mapeo entre `talentSocials.platform` (yt/tw) y nombres completos. |
| `import-utils.ts` | helpers de import CSV (parse rows, mapping). |
| `statsImport.ts` | normalizadores de stats al importar. |
| `breadcrumbs.ts` | `buildBreadcrumbJsonLd()` — JSON-LD para SEO. |
| `constants.ts` | constantes globales sin contexto (NAV_LINKS, FILTERS, etc.). |
| `use-visibility-failsafe.ts` | hook React: garantiza render incluso si IntersectionObserver no dispara. |

## Reglas

- **Sin side effects.** No DB, no fetch, no `localStorage`.
- **Sin imports de `features/` o `components/`.**
- **Sí pueden importar entre sí.**
- Cada exportado con TSDoc `@returns` y al menos un `@example`.
