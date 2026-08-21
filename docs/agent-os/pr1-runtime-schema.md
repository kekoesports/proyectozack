---
summary: 'PR 1 de Zack Agent OS: schema persistente, migración 0124, repositorios, seed y rollback.'
read_when:
  - Reviewing or applying the agent runtime migration
  - Seeding agent definitions
  - Turning the agent runtime on or off
---

# PR 1 — Schema y dominio del runtime de agentes

Primera entrega de código de Zack Agent OS. Añade la fundación persistente: 16
enums, 10 tablas, repositorios, un seed idempotente y siete variables de
entorno con defaults seguros.

**No ejecuta agentes.** No hay worker, ni scheduler, ni tools, ni turnos de
modelo. Eso llega en PR 2 y PR 3. Aplicar esta migración no cambia el
comportamiento de nada de lo que hoy funciona.

El blueprint completo —arquitectura, modelo de datos, políticas y roadmap—
vive en el PR #304 (`docs/zack-agent-os-blueprint`) junto con ADR-0006. Este
documento cubre solo lo que aporta este PR.

## Qué se crea

| Tabla | Para qué |
|---|---|
| `agent_definitions` | Configuración operativa por agente: kill switch, modo, límites, presupuesto |
| `agent_runs` | Cola y estado de cada ejecución; leases, reintentos, checkpoints |
| `agent_run_steps` | Timeline auditable, una fila por paso |
| `agent_tool_calls` | Qué pidió el modelo y qué se ejecutó realmente |
| `agent_approvals` | Autorización humana exacta, caducable y de un solo uso |
| `agent_schedules` | Rutinas; nacen desactivadas |
| `agent_events` | Inbox durable de señales externas, deduplicada |
| `agent_memories` | Memoria curada con scope, fuente, verificación y caducidad |
| `agent_usage_ledger` | Ledger append-only de consumo; base del presupuesto |
| `agent_worker_heartbeats` | Salud del worker sin depender de logs |

Ficheros: `src/db/schema/agent*.ts`, `src/lib/agents/*`,
`src/lib/queries/agents/*`, `src/types/agent.ts`,
`scripts/seed-agent-definitions.ts`, `drizzle/0124_agent_runtime_schema.sql`.

## Desviaciones del data-model, y por qué

Tres, todas para eliminar redundancia o corregir un enunciado que no se
sostiene literalmente:

1. **`agent_events` no lleva `run_id`.** La relación evento → ejecución vive en
   `agent_runs.source_event_id`, con índice propio, y así admite varias
   ejecuciones por evento. Mantener las dos direcciones obligaba a un ciclo de
   imports entre módulos de schema sin aportar información nueva.

2. **`agent_tool_calls` no lleva `approval_id`.** El propio data-model la
   marcaba como "se añade después". `agent_approvals.tool_call_id` tiene un
   UNIQUE y basta para leer la relación desde el lado correcto.

3. **`UNIQUE (action_hash, status)` → índice parcial.** Tal cual estaba escrito
   prohibiría dos rechazos con el mismo hash, que es legítimo. Lo que hay que
   impedir son dos **pendientes** equivalentes, y eso es exactamente
   `UNIQUE (action_hash) WHERE status = 'pending'`.

4. **`agent_approvals.tool_call_id` es UNIQUE a secas.** El data-model decía
   "una aprobación **activa** por call". Tal como queda, una vez que una
   aprobación caduca no se puede pedir otra para esa misma llamada: hay que
   registrar una llamada nueva. Es deliberado —una tool call es una propuesta
   concreta en un momento concreto, y reabrirla a posteriori difumina qué se
   estaba aprobando— pero conviene tenerlo presente al escribir el reintento en
   PR 3.

Añadido no previsto: `agent_usage_ledger.pricing_unknown`. El data-model pedía
no inventar coste cuando no hay tarifa; sin una columna que lo marque, un 0
"por desconocido" y un 0 real son indistinguibles al sumar el presupuesto.

### Alcance de `action_hash`

`agent_approvals_pending_hash_uq` es **global, no por ejecución**. La decisión
que va con él: `action_hash` es el SHA-256 del JSON canónico de la acción —tool,
versión e input— y **no incluye el id del run**. Dos ejecuciones distintas que
proponen exactamente el mismo envío no abren dos solicitudes que un humano
podría firmar por separado; la segunda choca contra el índice.

`createApprovalRequest` absorbe ese choque con `onConflictDoNothing` sobre el
índice parcial y devuelve `agent_approval_duplicate`, en vez de dejar salir un
`duplicate key` crudo sin código estable. PR 2, que es quien calcula el hash,
debe respetar este alcance: si le añadiera el run id, el índice no dispararía
nunca y dejaría de proteger nada.

## Variables de entorno

Todas opcionales y con default seguro. Sin tocar nada, el sistema queda
apagado.

```env
AGENTS_ENABLED=false
AGENT_INTERNAL_TOKEN=
AGENT_EVENT_HMAC_SECRET=
AGENT_GLOBAL_MONTHLY_BUDGET_MICROS=10000000
AGENT_WORKER_POLL_MS=2000
AGENT_LEASE_SECONDS=60
AGENT_MAX_CONCURRENCY=1
```

`AGENTS_ENABLED` sigue el patrón de `PAYROLL_OCR_ENABLED`: solo la cadena
exacta `'true'` enciende el runtime. Se evalúa **en cada encolado**, no al
arrancar el proceso, así que apagarlo detiene el sistema sin desplegar.

Los dos secretos son opcionales a propósito: la app arranca sin ellos y los
endpoints internos que llegan en PR 3-5 responden 503 en su ausencia, igual que
`AUTOMATION_API_TOKEN`. Ninguno hace falta para este PR.

## Preflight

```bash
npx drizzle-kit check
npx tsc --noEmit
npm run lint
npm run test:agents
```

Y el canario de drift de snapshots, que sobre esta rama debe responder "No
schema changes, nothing to migrate":

```bash
npx drizzle-kit generate --name=canario
```

El `when` de la entrada 0124 en `drizzle/meta/_journal.json` se subió a mano a
`1787428487578`, un milisegundo por encima de 0123. `drizzle-kit` la generó con
un `when` **anterior** al de 0122 y 0123, y el migrador la habría saltado en
silencio dando el deploy por bueno. Lo vigila
`drizzle-journal-monotonic.test.ts`.

## Pruebas

En CI no hay Postgres: `jest.setup.ts` apunta `DATABASE_URL` a un host de
mentira y no existe ningún fixture de base de datos en el repositorio. Los
tests de constraints son por tanto **de contrato sobre el SQL**, no de
ejecución, y la lógica que sí puede probarse de verdad se escribió como
funciones puras (`src/lib/agents/`) precisamente para poder probarla sin base
de datos.

| Fichero | Cubre |
|---|---|
| `agent-schema-constraints.test.ts` | Migración aditiva, cero DROP, índices parciales, CHECKs, defaults, no toca `ai_assistant_*` |
| `agent-run-repository.test.ts` | Kill switch, agente desactivado, idempotencia de encolado |
| `agent-event-dedupe.test.ts` | Determinismo y unicidad de `event_key`, dedupe del ingestor |
| `agent-approval-state.test.ts` | Máquina de estados, hash exacto, caducidad, doble clic, un solo uso |
| `agent-memory-scope.test.ts` | Scope en las dos direcciones, sensibilidad restringida, visibilidad en prompt |
| `agent-seed-catalog.test.ts` | Seis agentes disabled+shadow, límites válidos, seed idempotente que no pisa decisiones humanas |

```bash
npm run test:agents
```

Lo que estos tests **no** cubren, y hay que verificar contra una base real
antes de PR 3: que Postgres acepta cada CHECK con datos reales, el claim
concurrente con `FOR UPDATE SKIP LOCKED` y la recuperación de leases.

## Aplicar la migración

No se ha aplicado a mano en ninguna base. Con un matiz que conviene saber: el
deploy de preview de Vercel ejecuta `npm run build`, que incluye
`tsx scripts/migrate.ts`; ese script **salta** las migraciones cuando
`VERCEL_ENV === 'preview'` salvo que el proyecto defina
`RUN_MIGRATIONS_IN_PREVIEW=true`. Si importa que la branch de preview siga sin
las tablas, confírmalo en el log del deployment buscando
`Skipping database migrations in Vercel Preview deployment.`

Y en `master` la migración se aplica **sola** en el siguiente deploy, porque
`"build"` la incluye. Es el flujo normal del repositorio; la migración es
aditiva, pero merece saberse antes de pulsar merge.

Cuando se decida aplicarla a mano:

```bash
npm run migrate          # aplica lo pendiente contra DATABASE_URL
npm run seed:agents      # siembra los seis agentes en disabled + shadow
```

Verificar en la base, no en el deploy —un deploy verde no prueba que la
migración se aplicara:

```sql
select tablename from pg_tables where tablename like 'agent_%';
select slug, status, mode from agent_definitions order by slug;
select count(*) from agent_schedules where enabled = true;  -- debe ser 0
```

El seed es idempotente y **no revierte decisiones humanas**: `status` y `mode`
solo se escriben al insertar. Si alguien activa Guardian, volver a sembrar no
lo apaga por detrás.

## Rollback

Funcional, no destructivo. No hace falta borrar ninguna tabla:

```env
AGENTS_ENABLED=false
```

```sql
update agent_definitions set status = 'disabled';
update agent_schedules set enabled = false;
```

Y detener el worker cuando exista. Las diez tablas pueden quedarse donde están
sin afectar al CRM, a la web ni a n8n: nada fuera de `src/lib/agents/` y
`src/lib/queries/agents/` las consulta.

Un rollback destructivo de schema **no se ejecuta en producción**. Si hiciera
falta revertir el código, basta con revertir el PR: las tablas huérfanas no
tienen coste operativo y borrarlas destruiría la auditoría de lo que hubiera
pasado hasta entonces.

## Deudas que hereda PR 3

Tres cosas de este schema condicionan código que aún no está escrito. Se anotan
aquí para que no se redescubran desde un error de Postgres:

1. **El claim necesita `AND attempt < max_attempts` en el `WHERE`.** El CHECK
   `agent_runs_attempt_ck` exige `attempt <= max_attempts`, y el claim que
   propone `architecture.md` §2.3 hace `attempt = attempt + 1` sin tope. En el
   cuarto intento de una ejecución con `max_attempts = 3`, ese `UPDATE` reventaría
   contra el CHECK en vez de mandarla a dead-letter.

2. **`recordAgentUsage` hace INSERT y luego UPDATE sin transacción.** En `master`
   `db` es `neon-http`, que no las tiene. Si falla entre medias, el ledger queda
   por delante de los contadores de `agent_runs` y el presupuesto cuenta de
   menos. Hoy no lo llama nadie; al conectarlo en PR 3 debe pasar por
   `getTransactionalDb()` (o por el pool `pg`, si para entonces ya se migró el
   driver).

3. **Ninguna transición de estado de `agent_runs` está escrita todavía.** Los
   CHECKs `agent_runs_running_lease_ck` y `agent_runs_terminal_completed_ck`
   obligan a que el worker escriba lease y `completed_at` **en el mismo `UPDATE`**
   que cambia el estado, no en una segunda pasada.

## Qué sigue

PR 2 (`feat/agent-runtime-core`): tipos, errores, JSON canónico, redacción,
policy engine, presupuesto, hash de aprobación, tool registry y executor,
interfaz de proveedor con `NullProvider` y adaptadores de las tools de solo
lectura que ya existen.

No se empieza hasta que este PR esté revisado y su gate cumplido —
`drizzle-kit check` limpio, sin DROP, seed idempotente, agentes disabled y
`/admin/asistente` intacto.
