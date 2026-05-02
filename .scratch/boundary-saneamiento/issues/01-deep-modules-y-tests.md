Status: needs-triage

# 01 — Deep modules + tests (pre-trabajo, no toca dominios)

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Crear los 5 deep modules de Capa 1 con sus tests aislados. Pre-trabajo: este PR es mergeable solo y no toca ningún dominio. Bloquea los issues 02-07. No añade dependencias externas — todo con `crypto`/`url` de Node y `zod` ya instalado.

Módulos a crear (interfaces exactas en PRD § "Deep modules — interfaces"):

1. **`src/lib/forms/parseFormData.ts`** — `parseFormData<T extends z.ZodTypeAny>(formData: FormData, schema: T): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: Record<string, string[]> }`. Scalar-only via `Object.fromEntries` (last-wins). Para campos array el caller usa `formData.getAll(name)` y compone el plain object antes de llamar.
2. **`src/lib/log.ts`** — `logRedacted(level, message, ...args)` y `redactPII(value: unknown): unknown`. Patrones: email, teléfono E.164/ES, JWT, PAN con Luhn, valores exactos de `env` (Map invertido `value → key` cargado al importar `lib/env.ts`). NO redactar UUIDs (son IDs públicos).
3. **`src/lib/files/validateUploadedFile.ts`** — `validateUploadedFile(file, { maxBytes, allowedMimes, allowedExts }): { ok: true } | { ok: false; reason: string }`. MIME + extensión + tamaño + magic bytes (PDF `%PDF-`, PNG, JPEG, etc.).
4. **`src/lib/security/assertSafeRedirect.ts`** — `assertSafeRedirect(url: string, allowedHosts: readonly string[]): URL`. Throws `UnsafeRedirectError` en host fuera de allowlist. `http://localhost` solo en `NODE_ENV === 'development'`.
5. **`src/lib/security/timingSafeEqual.ts`** — `timingSafeEqual(a: string, b: string): boolean`. Buffers + early-return en longitudes distintas (sin comparar) + `crypto.timingSafeEqual`.

Tests con énfasis en inputs adversariales (PRD § "Deep modules — todos con tests aislados"). Fuzz tests adicionales con `fast-check` para `assertSafeRedirect` y `validateUploadedFile` siguiendo el patrón de `src/__tests__/fuzz/`.

**No incluido:** `assertSafePath` (descartado en el PRD — el stack usa `@vercel/blob`, no filesystem).

## Acceptance criteria

- [ ] 5 archivos creados en las rutas exactas listadas, exportando las firmas exactas del PRD.
- [ ] `parseFormData` documenta en JSDoc el contrato scalar-only y el patrón `formData.getAll` para arrays.
- [ ] `redactPII` importa `env` de `lib/env.ts` y construye el Map invertido al cargar el módulo (no en cada llamada).
- [ ] `validateUploadedFile` verifica magic bytes para al menos PDF, PNG, JPEG (los formatos que reciben facturas/contratos/GEO stats).
- [ ] `assertSafeRedirect` rechaza `javascript:` y `data:` schemes, URLs con userinfo, y URLs cuyo host no está en la allowlist.
- [ ] `timingSafeEqual` retorna `false` sin comparar cuando las longitudes difieren.
- [ ] Tests unitarios con 90%+ branch coverage en los 5 módulos.
- [ ] Tests adversariales explícitos: File donde se espera string en `parseFormData`; PDF falso (`.pdf` con bytes JPEG) en `validateUploadedFile`; `https://attacker.com@trusted.com` en `assertSafeRedirect`; strings unicode multi-byte en `timingSafeEqual`; emails/JWTs/PAN/env values embebidos en strings en `redactPII`.
- [ ] Fuzz tests con `fast-check` para `assertSafeRedirect` y `validateUploadedFile`.
- [ ] `npm test` verde, `npx tsc --noEmit` verde, `npm run lint` verde.
- [ ] No se añaden dependencias nuevas al `package.json`.

## Blocked by

- None — can start immediately. (PRD 1 / typescript-strict skill ya completo.)
