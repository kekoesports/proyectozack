Status: done

# 06 — ADR 0004 CSRF: confiar en Next defaults

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `docs/adr/0004-csrf-trust-next-defaults.md` documentando la decisión de no añadir middleware CSRF manual al confiar en las defensas nativas de Next.js 16 Server Actions (origin check + action ID firmado). Objetivo: que un futuro contribuidor con experiencia en frameworks sin CSRF nativo no proponga "añadir token CSRF" por reflejo.

Estructura ADR:

- **Context:** Next.js 16 Server Actions traen protección CSRF nativa: validación de `Origin` header contra el host servido + action ID firmado por el servidor (HMAC). Otros frameworks (Express, Rails sin defaults) requieren middleware CSRF manual.
- **Decision:** confiar en los defaults de Next. No añadir middleware CSRF, no generar tokens manualmente, no añadir cookies `__Host-csrf`. Auditar en cada upgrade de Next que la defensa siga activa.
- **Alternatives considered:**
  - A) Añadir middleware CSRF custom con tokens — rechazado: redundante con la defensa nativa, superficie de bug propia, costo de mantenimiento sin beneficio.
  - B) Mezclar ambos — rechazado: complejidad sin ganancia, double-submit pattern en route handlers que no lo necesitan.
- **Consequences:** la seguridad CSRF depende de no romper origin checks (no exponer Server Actions detrás de proxies que descarten/reescriban `Origin`). En cada upgrade major de Next, validar que la defensa sigue presente. Documentado en la skill (slice 02) como nota OWASP.

## Acceptance criteria

- [x] Archivo creado en `docs/adr/0004-csrf-trust-next-defaults.md`.
- [x] Estructura ADR con Context, Decision, Alternatives, Consequences.
- [x] Defensas nativas de Next descritas explícitamente (origin check, action ID firmado).
- [x] Estado `Accepted — 2026-05-02`.
- [x] Skill (slice 02) referencia este ADR en el pie de la sección OWASP.

## Blocked by

- None — can start immediately.
