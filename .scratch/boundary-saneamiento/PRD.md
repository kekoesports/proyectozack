Status: needs-triage

# PRD 2 — Boundary Saneamiento

## Problem Statement

El repo tiene 0 ocurrencias de `: any`/`as any`/`@ts-ignore` (limpio en eso), pero **107 ocurrencias de `as string`** y **40+ de `as Role`/`as Quarter`/`as CampaignStatus`/`as TalentStatus`** que casi siempre vienen de inputs externos sin validar:

- `formData.get('x') as string` — `FormData.get()` retorna `FormDataEntryValue | null`. Un input que envía `File` en lugar de string pasa el cast y peta en runtime. Bug real.
- `searchParams.quarter as Quarter` en API routes — query string sin validar, cualquier valor pasa.
- `process.env.DEV_ROLE_OVERRIDE as Role` en `src/server/trpc.ts` — env var sin validar, escapa al schema de `lib/env.ts`.
- `formData.get('redirectUrl') as string` en `giveaways/codes-actions.ts` — open redirect risk, sin allowlist de hosts.

El proyecto trabaja con **datos sensibles internos** (facturas, contratos, datos fiscales). Una validación laxa en bordes es vector directo de path traversal en file storage, prototype pollution via `Object.fromEntries`, secrets leak en error messages, y ataques temporales en comparación de tokens.

Existe ya `lib/schemas/` con muchos Zod schemas, `@t3-oss/env-nextjs` configurado en `lib/env.ts`, y `pgEnum` con constantes `as const` en `db/schema/`. La infraestructura está; lo que falta es **aplicarla consistentemente y añadir las primitivas de seguridad ausentes**.

## Solution

Refactor en dos capas:

**Capa 1 — Deep modules nuevos** (testeables en aislamiento, hidden complexity, simple interface):

1. `parseFormData<T>(formData, schema)` — wrapper Zod safeParse → `{ ok: true; data: T } | { ok: false; fieldErrors }`. Una utility, usada por todos los Server Actions. **Contrato: scalar-only.** Usa `Object.fromEntries(formData)` (last-wins en duplicados). Para campos array, el caller usa `formData.getAll(name)` arriba y construye el plain object antes de llamar.
2. `lib/log.ts` con `logRedacted` y `redactPII` — console wrapper que redacta automáticamente emails, phones, tokens, payment data (PAN con Luhn check), y valores exactos de env vars.
3. `validateUploadedFile(file, opts)` — magic bytes + MIME + size + extension check. Crítico para uploads de facturas y contratos.
4. `assertSafeRedirect(url, allowedHosts)` — URL parse + host allowlist. Throws en host no permitido.
5. `timingSafeEqual(a, b)` — wrapper sobre `crypto.timingSafeEqual` para comparar tokens (sign tokens, password hashes, etc.).

**No incluido — `assertSafePath`:** se evaluó y descartó. El stack usa `@vercel/blob` (object store, no filesystem). Ningún código de producción toca `fs.*` con input de usuario (verificado en grilling). Validación de blob keys (formato/longitud) cuando aplique se hace via Zod schema, no requiere primitiva separada.

**Capa 2 — Refactor por dominio vertical**, en orden de gravedad de seguridad (5 deep modules en Capa 1, no 6):

1. `auth/equipo` (creación de usuarios admin — máximo impacto si comprometido)
2. `talents` + `campanas` (CRUD core, datos comerciales)
3. `giveaways` (público facing, open redirect en `codes-actions`)
4. `targets`, `facturacion`, `tareas` (internos)
5. `trpc.ts` env vars + API routes (`api/contact`, `api/admin/search`)

Cada dominio = un PR independiente. Aplica los deep modules de Capa 1 a los Server Actions, API routes, y handlers del dominio. Añade los Zod schemas que falten en `lib/schemas/`. Migra a la convención de naming canónica de Zod (`const X = z.object(...); type X = z.infer<typeof X>;`) oportunistamente al tocar cada schema.

## User Stories

1. Como usuario que envía un formulario de admin, quiero que un input malicioso (e.g. File donde se espera string) sea rechazado con mensaje de error de campo en la UI, en lugar de crashear el servidor con un error 500 críptico.
2. Como agente Claude que escribe un nuevo Server Action, quiero usar `parseFormData(formData, MySchema)` y obtener directamente `{ ok, data }` o `{ ok: false, fieldErrors }`, sin tener que repetir el patrón `Object.fromEntries` + `safeParse` + `flatten`.
3. Como administrador que sube una factura PDF, quiero que el sistema rechace archivos que no sean PDF reales (verificación por magic bytes, no solo extensión `.pdf`), para que un atacante no pueda subir un script disfrazado.
4. Como administrador que crea un código de giveaway con redirect URL, quiero que el sistema rechace URLs a dominios no permitidos (allowlist de hosts), para evitar que el sistema sea usado como open-redirect en phishing.
5. Como usuario que firma un contrato vía link con token, quiero que la comparación del token use `timingSafeEqual`, para que no sea vulnerable a timing attacks que filtren el token caracter a caracter.
6. Como administrador que opera el sistema, quiero que los logs no contengan PII (mi email, los emails de marcas, tokens de sesión, números de cuenta), para no filtrar datos sensibles si los logs se exportan o exponen accidentalmente.
7. Como agente Claude debugging un crash en producción, quiero que los error messages no incluyan valores de env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`), para no exponer credenciales en stack traces.
8. Como sistema que almacena archivos en disco/blob, quiero que los paths se construyan via `assertSafePath` y nunca por concatenación directa con input de usuario, para evitar path traversal (`../../etc/passwd`).
9. Como agente Claude que añade un nuevo dominio CRM, quiero un patrón canónico documentado para Server Actions que valide inputs, llame `requireRole`, ejecute la mutación, y retorne `{ ok, data | fieldErrors }`, para no inventar variantes.
10. Como humano del equipo, quiero que cada PR de saneamiento sea por dominio (no un mega-PR), para revisar incrementalmente y poder mergear sin bloquear trabajo paralelo.
11. Como agente Claude que toca `process.env.X` en `trpc.ts`, quiero que la única forma legítima sea via `lib/env.ts` con Zod schema, para que TS me marque error si trato de leer una env var no declarada.
12. Como administrador que importa un CSV de facturas, quiero que cada fila pase por Zod schema antes de tocar la base de datos, para que un CSV malformado no corrompa el estado.
13. Como agente Claude que ve un `as Role` en el código, quiero que esté justificado con un comment WHY o sea claramente parte de un Zod parse, para no asumir que es legítimo cuando no lo es.
14. Como sistema que recibe webhooks externos (si se añaden), quiero que el body se parsee con Zod schema antes de cualquier lógica, igual que cualquier otro boundary.
15. Como humano auditando seguridad, quiero que cada deep module (parseFormData, validateUploadedFile, assertSafeRedirect, timingSafeEqual, redactPII) tenga tests que cubran inputs adversariales (boundary cases, inputs malformados, intentos de bypass), para confiar en que el saneamiento es real.

## Implementation Decisions

### Deep modules — interfaces

Las interfaces son lo que se compromete; las implementaciones internas pueden cambiar sin romper consumidores.

- **`parseFormData<T extends z.ZodTypeAny>(formData: FormData, schema: T): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: Record<string, string[]> }`** — sin throws. Contrato scalar-only: usa `Object.fromEntries(formData)` (last-wins en campos duplicados). Para campos array (e.g. checkbox múltiple), el caller usa `formData.getAll(name)` y compone el plain object manualmente antes de llamar a `parseFormData`. Esto mantiene la utility simple y predecible; campos array son raros en este repo y no justifican introspección de schema.
- **`logRedacted(level, message, ...args)` y `redactPII(value: unknown): unknown`** — `redactPII` es la función pura testeable; `logRedacted` la usa antes de `console[level]`. Patrones a redactar:
  - Email: regex `/[\w.+-]+@[\w-]+\.[\w.-]+/g` → `[REDACTED_EMAIL]`.
  - Teléfono internacional: regex E.164 + variantes españolas → `[REDACTED_PHONE]`.
  - JWT: regex `/eyJ[\w-]+\.[\w-]+\.[\w-]+/g` → `[REDACTED_JWT]`.
  - PAN (tarjeta): 13-19 dígitos consecutivos que pasen Luhn → `[REDACTED_PAN]`.
  - Valores de env vars: comparar exact-match contra `Object.values(env)` (no contra nombres de keys). Si el log contiene la string del `DATABASE_URL` o `BETTER_AUTH_SECRET`, se sustituye por `[REDACTED_ENV:<KEY_NAME>]`. Mecanismo: la utility importa `env` de `lib/env.ts` y construye un Map invertido `{ value → key }` al cargar el módulo.
  - **NO se redactan UUIDs.** En este repo los UUIDs son IDs públicos en URLs (talents, brands, campaigns). Redactarlos haría logs ilegibles para debugging. Si en el futuro se introducen UUIDs de tokens privados, esos se manejan via JWT regex o se loggean explícitamente como `[REDACTED]`.
- **`validateUploadedFile(file: File, opts: { maxBytes: number; allowedMimes: readonly string[]; allowedExts: readonly string[] }): { ok: true } | { ok: false; reason: string }`** — verifica MIME del File API, extensión, tamaño, y magic bytes para los formatos aceptados (PDF `%PDF-`, PNG, JPEG, etc.).
- **`assertSafeRedirect(url: string, allowedHosts: readonly string[]): URL`** — parsea con `new URL(url)`, verifica host. Throws `UnsafeRedirectError` si falla. Acepta `http://localhost` solo en `NODE_ENV === 'development'`.
- **`timingSafeEqual(a: string, b: string): boolean`** — convierte a Buffers, retorna `false` si longitudes difieren (sin comparar), si no usa `crypto.timingSafeEqual`.

### Schema discovery y reuso

Antes de crear cualquier nuevo Zod schema, auditar `src/lib/schemas/` por dominio. Reusar/extender schemas existentes. Solo crear nuevo si no hay equivalente. Cada PR de dominio incluye sección "Schemas tocados" con: existentes reusados, existentes extendidos, nuevos creados.

### Convención de naming Zod

Schemas nuevos: `const Name = z.object({ ... }); type Name = z.infer<typeof Name>;` (mismo identificador, shadowed). Schemas existentes (`taskSchema`, `TaskFormInput`) se migran oportunistamente en cada PR de dominio que los toca, no en un PR cross-cutting separado.

### Server Action canonical pattern

Cada Server Action sigue este shape:

```
1. requireRole/requireAnyRole (o assertCanDelete si delete)
2. parseFormData(formData, MySchema) → { ok, data | fieldErrors }
3. Si !ok, return early con fieldErrors
4. Llamar query/mutation interna (que asume data ya validada)
5. Retornar { ok: true, data: result } o { ok: true, redirect: '/path' }
```

Sin try/catch envolviendo todo (deja que Next captura). Excepción: errores esperados de DB (constraint violations) que se mapean a fieldErrors específicos.

### Orden de saneamiento por gravedad

Cada bullet = un PR independiente:

1. **Deep modules + tests** (sin tocar dominios todavía). Pre-trabajo. Mergeable solo, no bloquea nada.
2. **`auth/equipo`** — crear usuarios admin, cambiar roles. Server Actions en `app/admin/(dashboard)/equipo/` y `app/admin/(dashboard)/equipo/fotos/`.
3. **`talents` + `campanas`** — CRUD core. Server Actions en `app/admin/(dashboard)/talents/` (incluye `import/`, `[id]/stats/`, `[id]/files/`, `[id]/negocio/`, `fotos/`) y `app/admin/(dashboard)/campanas/` (incluye `[id]/files/`, `plantillas/`, contracts).
4. **`giveaways`** — público facing. Server Actions en `app/admin/(dashboard)/giveaways/` (incluye `codes-actions.ts` con `assertSafeRedirect` aplicado, y `winners-actions.ts`).
5. **`targets`, `facturacion`, `tareas`** — internos. Incluye `app/admin/(dashboard)/targets/`, `facturacion/import/`, `facturacion/issued-invoices-actions`, `facturacion/invoices-actions`, `tareas/` y `tareas/plantillas/`. También `app/marcas/(portal)/targets/`.
6. **`trpc.ts` env + API routes restantes** — añadir `DEV_ROLE_OVERRIDE` a `lib/env.ts` con `z.enum(['admin','manager','staff']).optional()`. Sanear `api/contact`, `api/admin/search`, y cualquier route handler restante.
7. **`firmar/[token]` sign-action** — aplicar `timingSafeEqual` a la comparación del token.

Cada PR incluye: refactor de Server Actions, schemas en `lib/schemas/` (reusados/extendidos/nuevos), tests existentes pasando, no regresiones en E2E del dominio.

### Cosas que NO cambian en este PRD

- `tsconfig.json` (ya estricto al máximo).
- `eslint.config.mjs` (es PRD 3).
- Drizzle schema (no se añaden columnas, solo se valida lo existente).
- Auth flow (`requireRole` ya implementado, solo se garantiza que se llame).

## Testing Decisions

### Filosofía

Tests cubren **comportamiento externo observable**, no implementación. Un test debe seguir pasando si se reescribe el cuerpo de la función pero el contrato de input/output queda igual.

### Deep modules — todos con tests aislados

Los 5 deep modules son la base de seguridad del sistema. Todos se testean con énfasis en **inputs adversariales**, no solo happy path.

- **`parseFormData`** — happy path con schema válido; FormData con campos faltantes → `{ ok: false, fieldErrors: { campo: [...mensaje] } }`; FormData con tipos incorrectos (e.g. campo numérico que llega como string) → coerción Zod aplicada o error apropiado; FormData con campos duplicados (verificar last-wins documentado); FormData con valores `File` donde se espera string.
- **`redactPII`** — emails, phones internacionales y españoles, JWTs, números de tarjeta (Luhn válido vs inválido), valores exactos de env (mock de `env` con valores conocidos, verificar que aparecen redactados con su key name); nested objects y arrays; null/undefined/circular refs (no debe colgar); strings que contienen patrones embebidos (`"el email es foo@bar.com"` → `"el email es [REDACTED_EMAIL]"`); inputs que NO deben redactarse (UUIDs de IDs públicos siguen visibles).
- **`validateUploadedFile`** — PDF real con `%PDF-` magic bytes; PDF falso (`.pdf` extension pero contenido no-PDF); MIME mismatch (declarado `image/png` pero magic bytes JPEG); tamaño 0; tamaño > maxBytes; extensión vacía; nombre con caracteres especiales (`../`, null bytes); File API edge cases (no `.type`, no `.size`).
- **`assertSafeRedirect`** — URL en allowlist (passes); URL no en allowlist (throws); URL con userinfo (`https://attacker.com@trusted.com`); URL relativa; URL con encoded characters; URL con port no estándar; `javascript:` y `data:` schemes (rechazados); IP literal en allowlist; IPv6.
- **`timingSafeEqual`** — strings idénticos (true); diferentes mismo length (false); diferentes longitudes (false sin comparar); empty strings (true); strings con caracteres unicode multi-byte; strings extremadamente largos.

### Prior art en el repo

- `src/__tests__/server/queries-talents.test.ts` (4 `as` casts en mocks — patrón de test existente para queries)
- `src/__tests__/server/format.test.ts` — test puro de funciones utility, similar a lo que aplica para `parseFormData`/`redactPII`
- `src/__tests__/fuzz/` — ya existe carpeta de fuzz tests con `fast-check`. Los deep modules de seguridad (`assertSafeRedirect`, `validateUploadedFile`) merecen fuzz tests adicionales con `fast-check` que generen inputs adversariales aleatorios.
- `src/__tests__/server/contact-route.test.ts` — patrón de test para Server Actions que reciben FormData. Replicable para los Server Actions saneados.

### Refactor por dominio — qué se testea

Cada PR de dominio NO añade tests unitarios para cada Server Action refactorizado (eso explotaría el coste). En su lugar:

- Tests existentes del dominio deben seguir pasando sin modificar (verifica que el refactor no rompió comportamiento).
- Si un Server Action no tenía test y se está añadiendo lógica de seguridad nueva (e.g. `assertSafeRedirect` en `giveaways/codes-actions`), añadir un test que verifique el caso adversarial.
- E2E (playwright) del dominio debe pasar — verifica que la UI de validación muestra los `fieldErrors` correctamente.

### Coverage targets

- Deep modules: 90%+ branch coverage. Son código de seguridad; no aceptamos branches sin test.
- Server Actions saneados: sin requirement nuevo de coverage. Confiamos en E2E + tests existentes + tipo del schema.

## Out of Scope

- Activación de ESLint type-aware estricto (PRD 3, depende de este).
- Cambios al ORM o al schema de DB.
- Refactor del flow de auth (`requireRole` se asume correcto, solo se garantiza su uso).
- Migración masiva de naming Zod en schemas no tocados (oportunista, no cross-cutting).
- Adición de logger estructurado completo (Pino/Winston). `lib/log.ts` es un wrapper simple sobre `console` con redacción; logger estructurado puede venir después como mejora.
- Rate limiting estructural en Server Actions sensibles. Reconocido como gap de seguridad C; queda para PRD futuro con infra de rate limiter.
- CSRF: Next 16 Server Actions tienen protección por defecto. No se añade lógica adicional. La confianza queda documentada en `docs/adr/0004-csrf-trust-next-defaults.md` (creado en PRD 1).
- Cambios a `middleware.ts` / `proxy.ts`.
- Nuevas dependencias externas. Todo se construye con primitivas de Node `crypto`, `path`, `url` y `zod` ya instalado.

## Further Notes

- Bloqueado por PRD 1 (necesita la skill `typescript-strict` documentando los patrones que aquí se aplican).
- Bloquea PRD 3 (ESLint estricto solo se activa cuando este PRD esté completo, sin allowlist progresivo).
- Estimación: 4-7 días concentrados. Deep modules + tests (5 modules) = 1-2 días. Saneamiento por dominio = 0.5-1 día por dominio (7 dominios). Trabajo paralelizable entre humano y agente.
- Si durante el saneamiento aparecen schemas de DB que requieren cambios (e.g. una columna que debe ser NOT NULL pero el code permite null), abrir issue separada en `.scratch/`. NO meter migrations en este PRD.
- El refactor por dominio es buen candidato para que cada PR sea revisado por el humano (Luis) al final, dado que la fase de implementación se delega a Claude Code (per feedback del usuario).
- ADR 0001 documenta el patrón Zod safeParse decidido. Este PRD lo aplica.
