# Handoff — Zack Agent OS PR 1: schema del runtime

**Sesión:** 2026-08-21
**Estado al cerrar:** PR 1 terminado y abierto. Migración **no aplicada** a ninguna base. Nada activado.

---

## 1. Qué se ha hecho

Rama `feat/agent-runtime-schema`, creada desde `origin/master` (`1d5dfe42`).

Primera entrega de código de Zack Agent OS, siguiendo el blueprint del PR #304
(`docs/zack-agent-os-blueprint`) y el encargo de
`docs/agent-os/claude-work-prompt.md`.

| Bloque | Ficheros |
|---|---|
| Schema | `src/db/schema/agentEnums.ts` + 10 tablas `agent*.ts` |
| Migración | `drizzle/0124_agent_runtime_schema.sql` (aditiva, cero DROP) |
| Dominio puro | `src/lib/agents/{keys,catalog,approval-state,memory-scope,runtime-flags,errors}.ts` |
| Repositorios | `src/lib/queries/agents/*.ts` (9 ficheros) |
| Tipos | `src/types/agent.ts` |
| Seed | `scripts/seed-agent-definitions.ts` + `npm run seed:agents` |
| Env | 7 variables nuevas en `src/lib/env.ts`, todas con default seguro |
| Tests | 6 suites, 94 tests → `npm run test:agents` |
| Doc | `docs/agent-os/pr1-runtime-schema.md` |

Detalle completo, desviaciones del data-model y rollback:
`docs/agent-os/pr1-runtime-schema.md`.

---

## 2. Lo que hay que saber antes de seguir

**El `when` de la migración se corrigió a mano.** `drizzle-kit` generó 0124 con
un `when` anterior al de 0122 y 0123; el migrador la habría saltado en silencio
y el deploy habría salido verde sin aplicarla. Se subió a `1787428487578`. Al
generar la migración de PR 2, **volver a comprobarlo** — lo vigila
`drizzle-journal-monotonic.test.ts`, pero el suelo real está en la base
(`drizzle.__drizzle_migrations`), no en el journal.

**En CI no hay Postgres.** Los tests de constraints son de contrato sobre el
SQL; la lógica que sí se prueba de verdad vive en funciones puras en
`src/lib/agents/`. Antes de PR 3 hay que verificar contra una base real: que
Postgres acepta cada CHECK con datos, el claim concurrente y la recuperación de
leases.

**Master sigue en Neon/Vercel.** La rama `infra/vps-portability` (driver `pg`,
storage abstraction, Docker) no está mergeada. Los repositorios de agentes no
usan nada exclusivo de Neon: cuando `src/lib/db.ts` cambie de driver, el
runtime no necesita rediseño. El claim de PR 3 sí querrá transacción
interactiva — hoy eso es `getTransactionalDb()`.

---

## 3. Estado de activación

Todo apagado, y esto no cambia solo:

- `AGENTS_ENABLED` sin definir → el encolado falla en cerrado.
- Los seis agentes se siembran en `status=disabled`, `mode=shadow`.
- Ninguna rutina se crea: `agent_schedules` queda vacía.
- No hay worker todavía.
- `/admin/asistente` intacto: la migración no toca `ai_assistant_*`.

---

## 4. Pendiente de decisión humana

1. Revisar y mergear el PR de este trabajo.
2. Decidir cuándo aplicar la migración (`npm run migrate` + `npm run seed:agents`)
   y contra qué base. **No se ha aplicado en ningún sitio.**
3. Revisar y mergear el PR #304 del blueprint, que aporta la documentación de
   arquitectura a la que este código hace referencia.

---

## 5. Siguiente paso

PR 2 — `feat/agent-runtime-core`: tipos, errores, JSON canónico, redacción,
policy engine, presupuesto, hash de aprobación, tool registry y executor,
interfaz de proveedor con `NullProvider`, adaptador de Gemini y wrappers de las
tools de solo lectura que ya existen.

Gate antes de empezarlo (`docs/agent-os/handoff.md` del blueprint):
`drizzle-kit check` limpio, migración probada, sin DROP inesperado, seed
idempotente, agentes disabled/shadow, chat intacto y rollback funcional
documentado. Todo cumplido salvo "migración probada contra una base", que
depende de la decisión del punto 4.2.
