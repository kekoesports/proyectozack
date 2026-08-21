# Handoff — Zack Agent OS: roadmap inicial completo

**Sesión:** 2026-08-21
**Estado:** seis PRs abiertos y encadenados. **Ninguna migración aplicada, ningún agente activo, nada desplegado.**

---

## 1. Los seis PRs

Se apilan: cada uno sale del anterior. **Mergear en orden y con merge commit, no
squash** — un squash reescribe los commits que las ramas de encima llevan dentro
y convierte cada merge siguiente en una cascada de conflictos.

| PR | Rama | Qué añade |
|---|---|---|
| [#308](https://github.com/kekoesports/proyectozack/pull/308) | `feat/agent-runtime-schema` | 16 enums, 10 tablas, migración 0124, repositorios, seed de 6 agentes |
| [#309](https://github.com/kekoesports/proyectozack/pull/309) | `feat/agent-runtime-core` | Tool registry tipado, política, presupuesto, redacción, proveedores, bucle |
| [#310](https://github.com/kekoesports/proyectozack/pull/310) | `feat/agent-worker` | Claim con `SKIP LOCKED`, leases, reintentos, scheduler, eventos, apagado |
| [#311](https://github.com/kekoesports/proyectozack/pull/311) | `feat/agent-admin-control-plane` | Permisos, 7 páginas, centro de aprobaciones |
| [#312](https://github.com/kekoesports/proyectozack/pull/312) | `feat/guardian-telemetry-foundation` | Health endpoints, ingestión firmada, collector del VPS |
| [#313](https://github.com/kekoesports/proyectozack/pull/313) | `feat/guardian-shadow` | Reglas deterministas, tools, informe, rutinas desactivadas |

Documento propio por PR en `docs/agent-os/pr{1..6}-*.md`. El blueprint sigue en
el [PR #304](https://github.com/kekoesports/proyectozack/pull/304), sin mergear.

---

## 2. Lo que hay que saber para retomarlo

**El CI de GitHub no corre en los PRs apilados.** `ci.yml` se dispara con
`pull_request: branches: [master]`, así que solo #308 tiene Lint/Build en verde.
Los demás los ejecutará cuando GitHub los reapunte a `master` al mergear el
anterior. Los cinco están verificados en local: `tsc`, `lint`, `jest --ci` y
`next build`.

**Las garantías de concurrencia siguen sin verificar.** No hay Postgres ni
Docker en esta máquina: dos workers reclamando filas distintas, el advisory lock
excluyendo de verdad y los UNIQUE bajo carrera están probados **como contrato
sobre el SQL**, no ejecutados. Es lo primero que hay que hacer contra una base
desechable antes de arrancar nada.

**El `when` de la migración se corrigió a mano** a `1787428487578`. Drizzle la
generó por debajo de 0122/0123 y el migrador la habría saltado en silencio.
Volver a comprobarlo en cada migración nueva.

---

## 3. Estado de activación

Todo apagado, y no cambia solo:

- `AGENTS_ENABLED` sin definir → el encolado falla en cerrado.
- Los seis agentes en `status=disabled`, `mode=shadow`.
- Cero rutinas activas; las de Guardian se siembran desactivadas.
- Worker sin desplegar; `infra/agents/` preparado.
- Collector sin instalar; requiere SSH.
- `AGENT_INTERNAL_TOKEN` y `AGENT_EVENT_HMAC_SECRET` sin configurar → los
  endpoints internos responden 503.

---

## 4. Qué decide una persona

1. **Revisar y mergear los seis PRs**, en orden y con merge commit.
2. **Aplicar la migración.** Mergear #308 a `master` la aplica sola en el
   siguiente deploy, porque `"build"` incluye `tsx scripts/migrate.ts`.
3. `npm run seed:agents` y `npm run seed:guardian-schedules` — pasos manuales.
4. **Verificar la concurrencia contra una base desechable.**
5. Generar los dos secretos (`openssl rand -hex 32`) y ponerlos en el proyecto.
6. Instalar el collector en el VPS (necesita SSH).
7. Desplegar el worker.
8. **Decidir activar Guardian**: `AGENTS_ENABLED=true` + `status='active'` +
   activar `guardian-daily`.

Los pasos 1-3 no activan nada. El 8 sí, y es el único irreversible en la
práctica.

---

## 5. Deuda conocida

- `stateJson` no se usa: reanudar tras una aprobación reejecuta desde el
  principio. Funciona, pero por casualidad.
- `recordAgentUsage` hace INSERT + UPDATE sin transacción; se arregla al migrar
  a `pg`.
- `getBudgetSnapshot` suma el mes entero en cada comprobación.
- Los umbrales de Guardian viven en código, no en `settings_json`.
- Crear memoria a mano no tiene formulario.
- Activar una rutina desde el panel no es un botón.

---

## 6. Siguiente trabajo

El roadmap inicial queda cubierto. Después, **solo cuando Guardian tenga datos
que digan que es fiable**: CRM Steward shadow → Deal Clerk drafts → Growth →
SEO → Dev → acciones con efecto, una por una.

Ninguno empieza antes de que Guardian salga de shadow con los siete criterios de
`src/lib/agents/guardian/definition.ts` cumplidos y medidos.
