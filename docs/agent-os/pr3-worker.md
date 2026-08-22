---
summary: 'PR 3 de Zack Agent OS: worker con leases, reintentos, scheduler, procesador de eventos y apagado ordenado.'
read_when:
  - Deploying or operating the agent worker
  - Changing the queue, leases, retries or schedules
  - Debugging a stuck or duplicated run
---

# PR 3 — Worker, leases, reintentos y scheduler

Tercera entrega de Zack Agent OS. El motor de PR 2 ya podía ejecutar; ahora hay
algo que lo ejecuta.

**Sigue sin correr en ningún sitio.** El worker está escrito, empaquetado y
probado, pero no desplegado, y con `AGENTS_ENABLED` distinto de `'true'` arranca
sin procesar nada. Los seis agentes siguen en `disabled` y no hay ninguna rutina
activa.

Sale de la rama de PR 2 (#309).

## Qué añade

```text
src/worker/agent-worker.ts        punto de entrada del proceso
src/lib/agents/worker/
├── worker.ts                     el bucle
├── claim.ts                      FOR UPDATE SKIP LOCKED + recuperación de leases
├── lease.ts                      heartbeat, propiedad y liberación
├── execute-run.ts                costura entre el bucle de PR 2 y la base
├── persistence.ts                todo el acceso a datos del runtime
├── finish-run.ts                 cierre en un solo UPDATE
├── retry-policy.ts               reintentar / dead-letter / fallar / revisar
├── scheduler.ts                  advisory lock, catch-up y materialización
├── event-processor.ts            señales externas → ejecuciones
├── shutdown.ts                   SIGTERM, drenaje y liberación de leases
└── cron.ts                       cron de 5 campos con zona horaria

infra/agents/                     compose, Dockerfile y plantilla de variables
```

Tres scripts nuevos: `agents:worker`, `agents:worker:once`,
`agents:schedules:tick`.

## Decisiones

### Dos mecanismos contra los duplicados, no uno

El scheduler toma un **advisory lock** global para que solo un worker corra el
tick, y además cada ventana tiene **clave de idempotencia**
(`schedule:<slug>:<ISO>`) con el UNIQUE de `agent_runs` detrás.

No es redundancia: el lock evita el trabajo repetido, la clave evita el daño. Un
worker que muere con el lock tomado, o un reinicio a mitad de tick, dejan el
primero inservible; entonces la clave es lo único que queda.

### Ninguna política de catch-up recupera "todo"

`skip` materializa solo la ventana actual, `latest` solo la última perdida y
`all_limited` hasta `maxCatchUpRuns`. Un worker que vuelve tras una semana caído
con "recuperarlo todo" se comería el presupuesto del mes en minutos.

### Perder el lease significa dejar de escribir

El heartbeat renueva cada cuarto de lease. Si una renovación falla —incluso por
un error de red, donde no sabemos si lo conservamos— se trata como pérdida: es
la interpretación que no duplica trabajo. A partir de ahí el worker no escribe
nada más, y `finishAgentRun` lo comprueba otra vez con un `WHERE lease_owner`.

### El cierre de una ejecución es un solo UPDATE

Los CHECK de `agent_runs` no admiten el estado intermedio: `running` sin lease
o un estado terminal sin `completed_at` no son filas válidas ni por un instante.
Escribirlo en dos pasadas revienta la constraint.

### El apagado suelta los leases

Un contenedor tiene ~10 s antes del SIGKILL. Sin `dumb-init` como PID 1, Node ni
siquiera recibe la señal; sin drenaje, cada despliegue dejaría las ejecuciones
en curso congeladas hasta que venciera el lease.

### El rol de un run sin sesión es el más pequeño que sirva

Un run de rutina necesita un rol para que el RBAC del CRM decida y no puede
heredarlo de nadie: por defecto `analyst`, con override en
`settings_json.systemRole`, y `admin` fuera de esa lista.

Los runs con `triggered_by_user_id` **también** usan el rol de sistema en esta
fase. Podría parecer que deberían heredar el de su autor, pero el worker no
tiene su sesión: solo un id en una fila, y derivar permisos de eso sería creerse
un dato en lugar de una sesión autenticada. El efecto es que un run manual tiene
menos permisos de los que tendría su autor, no más. PR 4, que sí tiene sesión,
lo resolverá bien.

### Cron propio en vez de una dependencia

El subconjunto que hace falta —`*`, listas, rangos, pasos— son 150 líneas. Lo
difícil no es parsear sino el horario de verano, y eso no lo decide la librería
sino nosotros:

- Una hora local que **no existe** (madrugada de marzo) hace que la ventana se
  salte ese día, en vez de inventarse otra hora.
- Una hora que **existe dos veces** (madrugada de octubre) resuelve siempre al
  mismo instante, así que no se ejecuta dos veces.
- `30 8 * * *` significa las 08:30 **de Madrid** todo el año, no un instante UTC
  fijo que se desplace en marzo.

Hay un test para cada uno de los tres casos.

## Qué se prueba, y qué no

Esto importa más que la lista de tests.

**No hay Postgres disponible en esta máquina** —ni Docker ni `psql`— así que las
garantías que **solo** se pueden comprobar contra una base real quedan **sin
verificar**:

- que dos workers concurrentes reclamen ejecuciones distintas;
- que `FOR UPDATE SKIP LOCKED` no bloquee al segundo;
- que el advisory lock excluya de verdad;
- que los índices únicos rechacen el duplicado bajo carrera real;
- que cada CHECK acepte los datos que el worker escribe.

Lo que sí se verifica, y cómo:

| Garantía | Cómo se prueba |
|---|---|
| El claim pide `SKIP LOCKED`, respeta el tope de intentos y escribe estado+lease juntos | Aserciones sobre la sentencia emitida |
| Un lease ajeno, vencido o cancelado no es nuestro | Repositorio con `db` mockeado |
| El heartbeat detecta la pérdida, incluso ante un error de red | Renovación inyectada |
| **Crash tras escribir, antes de anotar → no se repite** | Tabla `agent_tool_calls` en memoria, ciclo completo |
| Reintentar / dead-letter / fallar / revisar | Funciones puras |
| Catch-up acotado en las tres políticas | Funciones puras |
| Qué eventos despiertan a un agente | Funciones puras |
| Cron, incluidos los tres casos de DST | Funciones puras con `Intl` real |
| El drenaje deja de aceptar trabajo y espera al que hay | Controlador aislado |

```bash
npm run test:agents   # 21 suites, 340 tests
```

Antes de arrancar el worker en cualquier entorno hay que ejercitar a mano lo de
la primera lista contra una base desechable. Está en la lista de comprobación de
`infra/agents/README.md`.

## Cambio en el executor de PR 2

`ToolExecutorDeps` gana dos callbacks opcionales, `beginToolCall` y
`settleToolCall`, y con ellos el executor cumple el contrato que PR 2 dejó
escrito: **la fila de `agent_tool_calls` se escribe antes de invocar la tool, en
estado `executing`**.

Escribirla después es lo natural y es justo lo que rompe la garantía: si el
worker muere a mitad de la tool no queda rastro, `findPreviousCall` no encuentra
nada al reanudar y la acción se repite a ciegas.

Consecuencia deliberada: un resultado `indeterminate` **deja la fila en
`executing`**. Una fila en ese estado con el lease vencido es una anomalía
detectable con una consulta, y cualquier reintento futuro choca con
`tool_call_in_flight` en vez de repetir la acción.

## Variables de entorno

Ninguna nueva sobre PR 1. `infra/agents/env.example` documenta las siete y, más
útil, las que el worker **no** necesita: `BETTER_AUTH_SECRET`, `RESEND_API_KEY`,
`BLOB_READ_WRITE_TOKEN` y las claves de integraciones no van en su `.env`. No
autentica usuarios, no envía emails y no sube ficheros; cada secreto de más es
superficie de más.

## Despliegue

**No se ha desplegado nada.** `infra/agents/` está preparado y sin arrancar.
La lista de comprobación completa está en su README; el resumen:

1. Migración `0124` aplicada.
2. `npm run seed:agents`.
3. `.env` a partir de `env.example`.
4. Red `socialpro-crm_crm_backend` existente.
5. **Decisión explícita** de `AGENTS_ENABLED=true`.
6. Al menos un agente en `active` — se siembran todos en `disabled`.

Con 1-4 hechos y el 5 sin hacer, el worker arranca, no procesa nada y lo dice.
Es un estado válido para desplegarlo antes de decidir encenderlo.

Este PR **no toca** `infra/README.md`, `infra/crm/` ni `infra/edge/Caddyfile`:
son de la rama `infra/vps-compose`. El enlace se hace cuando esa se mergee.

## Rollback

Por capas, de la más rápida a la más lenta:

```sql
update agent_definitions set status = 'disabled';   -- efecto en < 1 ciclo
update agent_schedules set enabled = false;
```

```env
AGENTS_ENABLED=false
```

```bash
docker compose -f infra/agents/compose.yaml stop agent-worker
```

Y si hace falta quitar el código, revertir el PR. Parar el worker no afecta a la
web, al CRM ni a n8n.

## Riesgos pendientes

1. **Las garantías de concurrencia no están verificadas contra Postgres.** Es lo
   primero que hay que hacer antes de arrancarlo en cualquier entorno.
2. **`getBudgetSnapshot` suma `agent_runs.estimated_cost_micros` del mes en cada
   comprobación.** Con pocas ejecuciones es irrelevante; con miles hará falta un
   agregado materializado.
3. **`recordAgentUsage` sigue haciendo INSERT y luego UPDATE sin transacción.**
   Un fallo entre medias deja el ledger por delante de los contadores y el
   presupuesto cuenta de menos. Se arregla al migrar a `pg`, donde hay
   transacciones interactivas de verdad.
4. **El prompt de sistema es genérico.** Cada agente tendrá el suyo desde PR 6;
   hasta entonces ninguno está en `active`, así que no se usa.
5. **`AGENT_MAX_CONCURRENCY` se lee pero el bucle procesa una ejecución por
   vuelta.** El paralelismo real llega cuando haya volumen que lo justifique.

## Siguiente PR

`feat/agent-admin-control-plane` — permisos `agents:*` e `infrastructure:*`,
navegación, catálogo, runs con timeline, centro de aprobaciones, memoria,
rutinas, presupuestos, kill switch visible y salud del worker.

Requisito que viene de PR 2 y no puede quedarse fuera: la Server Action de
aprobar llama a `canApproveActionClass(role, actionClass)` **y** revalida el
permiso de dominio guardado en `required_permission_module/action`, con un test
de que un `manager` no puede aprobar una acción `privileged`. Ocultar la opción
en el menú no cuenta.
