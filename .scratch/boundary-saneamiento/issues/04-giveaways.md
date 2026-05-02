Status: needs-triage

# 04 — Saneamiento `giveaways` (público facing, open-redirect en `codes-actions`)

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Aplicar los deep modules del issue 01 al dominio `giveaways`. Trato separado del bloque "internos" porque es el único módulo público facing y porque tiene un open-redirect identificado en el PRD: `formData.get('redirectUrl') as string` en `codes-actions.ts` sin allowlist de hosts.

Alcance:

- `src/app/admin/(dashboard)/giveaways/`
  - `codes-actions.ts` — aplicar `assertSafeRedirect(redirectUrl, allowedHosts)` antes de cualquier persistencia o redirect del valor.
  - `winners-actions.ts`
  - resto de Server Actions del dominio.

`allowedHosts`: definir como constante exportada (e.g. `src/lib/security/allowed-redirect-hosts.ts`) — incluye `NEXT_PUBLIC_SITE_URL` host como mínimo, y cualquier dominio explícitamente autorizado por producto. NO leer de DB ni de input.

Por cada Server Action del dominio:

- `parseFormData(formData, Schema)` reemplaza casts directos.
- `assertSafeRedirect` aplicado donde se acepta URL externa.
- Logs con datos de usuarios participantes (emails, IPs si se loguean) pasan por `logRedacted`.

## Acceptance criteria

- [ ] 0 ocurrencias de `as string` en `app/admin/(dashboard)/giveaways/**`.
- [ ] `codes-actions.ts` llama `assertSafeRedirect(redirectUrl, ALLOWED_HOSTS)` antes de persistir o redirigir; URLs fuera de allowlist se rechazan con `fieldErrors.redirectUrl`.
- [ ] Constante `ALLOWED_HOSTS` definida en módulo aparte y referenciable desde otros dominios futuros.
- [ ] Tests adversariales nuevos para `codes-actions`: `https://attacker.com@trusted.com`, `javascript:alert(1)`, host fuera de allowlist, URL relativa, URL con port no estándar.
- [ ] Cada Server Action mutante: `requireRole` → `parseFormData` → mutation → `{ ok }`.
- [ ] Logs no exponen emails/IPs de participantes (pasan por `logRedacted`).
- [ ] E2E de giveaways pasa.
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.

## Blocked by

- Issue 01 (deep modules + tests).
