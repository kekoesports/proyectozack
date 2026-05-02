Status: needs-triage

# 06 — Saneamiento `trpc.ts` env + API routes restantes

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Cerrar los dos boundaries que no son Server Actions: el bypass de env vars en `src/server/trpc.ts` y los route handlers públicos.

Alcance:

- **`src/server/trpc.ts`** — eliminar `process.env.DEV_ROLE_OVERRIDE as Role`. Añadir `DEV_ROLE_OVERRIDE` a `lib/env.ts` con `z.enum(['admin','manager','staff']).optional()`. Consumir vía `import { env }`. Hard rule 6 prohíbe `process.env.X` directo fuera de `lib/env.ts`.
- **`src/app/api/contact/route.ts`** — body por Zod schema antes de cualquier lógica. `parseFormData` no aplica aquí (es JSON body, no FormData) — usar el patrón equivalente: `Schema.safeParse(await request.json())` retornando 400 con fieldErrors si falla.
- **`src/app/api/admin/search/route.ts`** — `requireAnyRole` al inicio, query params por schema. Visibility filter para staff (gotcha en CLAUDE.md, ya implementado — solo verificar que no se rompe).
- **Cualquier otro route handler restante** que mute o reciba input externo. Auditar `src/app/api/**` y aplicar el patrón.

Patrón route handler:

```
1. requireRole/requireAnyRole (si muta o lee data privada)
2. Schema.safeParse(input) — body, query, headers
3. Si !ok, return Response(JSON, 400)
4. Lógica
5. Return Response(JSON, 200)
```

Logs en route handlers pasan por `logRedacted`.

## Acceptance criteria

- [ ] 0 ocurrencias de `process.env.X` en `src/**` fuera de `lib/env.ts`.
- [ ] `DEV_ROLE_OVERRIDE` declarado en `lib/env.ts` con `z.enum(['admin','manager','staff']).optional()` y consumido vía `env.DEV_ROLE_OVERRIDE` en `trpc.ts`.
- [ ] `api/contact/route.ts` valida body con Zod antes de cualquier acceso, retorna 400 con fieldErrors si falla.
- [ ] `api/admin/search/route.ts` empieza con `requireAnyRole` y valida query params; visibility filter para staff intacto.
- [ ] Auditoría completa de `src/app/api/**`: todo route handler que muta tiene `requireRole` + Zod parse.
- [ ] Logs en route handlers pasan por `logRedacted`.
- [ ] Tests existentes (`contact-route.test.ts`) pasan; E2E que toca estas rutas pasa.
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.

## Blocked by

- Issue 01 (deep modules + tests).
