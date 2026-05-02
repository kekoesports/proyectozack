Status: done

# 01 — Hard rules `.claude/rules/typescript.md`

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `.claude/rules/typescript.md` con las 15 hard rules definidas en el PRD. Archivo siempre-on cargado en cada sesión vía referencia desde `CLAUDE.md` (el link se añade en slice 07). Formato corto, accionable, sin ejemplos de código (los ejemplos van en la skill del slice 02).

Estructura por bloques:

- **Tipado (1-3):** prohibido `any`/`@ts-ignore`/`@ts-nocheck`; `@ts-expect-error` solo con comment-pattern apuntando a issue local; prohibido `as Type` salvo `as const`/`as unknown`/narrowing; tipos derivados de Zod via `z.infer`.
- **Inputs externos / boundary (4-6):** boundary inputs siempre via Zod (FormData, searchParams, JSON, cookies, headers, file uploads, webhooks, localStorage/sessionStorage; excepción `InferSelectModel` de Drizzle); pattern `safeParse(Object.fromEntries(formData))` retornando `{ ok, fieldErrors }`; env vars solo via `lib/env.ts`.
- **Auth / data (7-8):** `requireRole`/`requireAnyRole` al inicio de Server Actions y route handlers que mutan; `assertCanDelete` antes de delete; Drizzle ORM only, raw `sql` con input usuario prohibido.
- **Output / UI (9-10):** `dangerouslySetInnerHTML` con sanitizer + comment; logs nunca PII/env values/payment data.
- **React patterns (11-14):** `useEffect` requiere comment WHY; state hierarchy URL > Context > React Query > Zustand (Redux prohibido); HTTP solo `fetch` o tRPC client; forms RHF + Zod resolver.
- **Verificación (15):** antes de declarar trabajo hecho, `npx tsc --noEmit && npm run lint` verde.

Texto exacto de cada regla en el PRD (sección "Las 15 hard rules"). No reformular salvo erratas.

## Acceptance criteria

- [x] Archivo creado en `.claude/rules/typescript.md`.
- [x] 15 reglas presentes con la numeración del PRD.
- [x] ~60 líneas (45), sin ejemplos de código (los ejemplos viven en la skill).
- [x] `markdownlint` pasa verde (config añadida en `.markdownlint.json` — MD013/MD029 deshabilitados).
- [x] El archivo se lee correctamente desde la raíz del repo (paths relativos, sin enlaces rotos).
- [x] Comprobación visual: no contradice `CLAUDE.md` (se complementan — CLAUDE.md cubre Drizzle/followers/sort; typescript.md cubre tipado/boundary/security).

## Blocked by

- None — can start immediately.
