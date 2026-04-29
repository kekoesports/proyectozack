# lib/services — External integrations

> Wrappers tipados sobre APIs externas. Cada archivo expone funciones
> de alto nivel; la complejidad HTTP/auth queda encapsulada.

## Archivos

| Archivo | Propósito |
|---|---|
| `youtube.ts` | búsqueda y enriquecimiento de canales YouTube (admin/targets) |

## Reglas

- **Errores tipados** — devolver `{ ok: true, data }` / `{ ok: false, error }`.
- **Timeouts explícitos** — fetch con `AbortSignal.timeout(...)`.
- **Sin estado en el módulo** — funciones puras.
- **Logs con bracket tag** — `console.error('[youtube] ...', err)`.
- Reutilizan `lib/utils/` para parsing común.
