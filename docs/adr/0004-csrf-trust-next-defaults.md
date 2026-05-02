# ADR 0004 — CSRF: confiar en las defensas nativas de Next.js

**Estado:** Accepted — 2026-05-02

## Context

Next.js 16 Server Actions incluyen protección CSRF nativa en dos capas:

1. **Validación de `Origin` header** — el runtime rechaza peticiones cuyo `Origin` no coincida con el host servido. Esto bloquea el vector CSRF clásico de formulario cross-origin.
2. **Action ID firmado (HMAC)** — cada Server Action recibe un ID opaco generado y firmado por el servidor en tiempo de build. Un atacante externo no puede conocer ni predecir ese ID.

Desarrolladores con experiencia en frameworks que no ofrecen CSRF nativo (Express sin middleware, Django sin `{% csrf_token %}`, Rails sin `protect_from_forgery`) tienden a proponer "añadir un token CSRF" como medida reflexiva. En Next.js 16 esa adición es redundante con las defensas ya presentes.

## Decision

**Confiar en los defaults de Next.js.** No se añade middleware CSRF, no se generan tokens manuales, no se establecen cookies `__Host-csrf`.

Obligación de mantenimiento: en cada upgrade major de Next.js, verificar en el changelog que las defensas CSRF siguen activas y no han cambiado de comportamiento. Esta verificación debe hacerse antes de mergear el PR de upgrade.

## Alternatives considered

### A) Añadir middleware CSRF custom con tokens

Generar tokens en servidor, almacenarlos en cookie `__Host-csrf`, validarlos en cada mutación.

Rechazado: redundante con la defensa nativa. Añade superficie de bug propia (rotación de tokens, sincronización con SPA, edge runtime). Costo de mantenimiento sin beneficio de seguridad measurable.

### B) Mezclar defensas nativas + tokens manuales en route handlers

Mantener Server Actions tal cual y añadir CSRF manual solo en `api/` route handlers.

Rechazado: los route handlers `POST` de este proyecto son invocados desde el mismo origen (admin panel) o desde webhooks autenticados con secret header — no son el vector de ataque que CSRF manual resolvería. La complejidad añadida no se justifica.

## Consequences

- **Dependencia de configuración de infraestructura.** La defensa de `Origin` header falla si un proxy intermedio descarta o reescribe ese header. Nunca configurar proxies (Vercel, Cloudflare, nginx) que eliminen `Origin` en peticiones hacia la app.
- **Scope limitado a Server Actions.** Las rutas `api/` convencionales (`src/app/api/`) no reciben la defensa del action ID firmado. Están protegidas por la validación de `Origin` + autenticación (`requireRole`). Si en el futuro se exponen rutas `api/` a clientes externos sin autenticación, revisar si aplica CSRF manual.
- **Auditoría en upgrades.** Documentado como tarea obligatoria en cada upgrade major de Next.js.
