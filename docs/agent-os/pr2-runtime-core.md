---
summary: 'PR 2 de Zack Agent OS: tool registry tipado, policy engine, presupuesto, redacción, proveedores y bucle de ejecución.'
read_when:
  - Adding an agent tool
  - Changing agent policy, budget or approvals
  - Swapping the model provider
---

# PR 2 — Core runtime y tool registry estructurado

Segunda entrega de Zack Agent OS. Añade el motor: registro de tools tipadas,
motor de políticas, presupuesto duro, redacción, hash de acción, proveedores
intercambiables y el bucle que los une.

**Sigue sin ejecutar agentes.** No hay worker, ni scheduler, ni cola: eso es
PR 3. Todo lo de este PR es código al que todavía nadie llama desde una ruta de
producción. El chat de `/admin/asistente` no cambia en absoluto.

Depende de PR 1 (#308) y sale de esa rama.

## El cambio que define el PR

El asistente actual pide herramientas escribiendo `[TOOL:nombre]` en su
respuesta, y el servidor lo busca con una expresión regular. Ese patrón lo
puede falsificar cualquier dato que el modelo esté citando: un email, un log,
el resultado de otra tool.

El runtime nuevo usa **function calling estructurado**. La llamada llega como
dato del proveedor, no como texto dentro de la respuesta, y antes de ejecutarse
pasa por diez comprobaciones.

## Los diez controles

En `src/lib/agents/tool-executor.ts`, en este orden:

1. **¿Existe la tool?** Lo que no está registrado no existe. Sin resolución
   dinámica por nombre.
2. **¿La alcanza este agente?** Allowlist por agente. Estar registrada no es
   estar permitida.
3. **¿Sigue viva la ejecución?** Cubre cancelación y pérdida de lease.
4. **¿El input es válido?** Zod `safeParse`. Lo que se firma después es el input
   validado, no lo que escribió el modelo.
5. **Política.** Kill switch global, estado del agente, clase de acción, RBAC
   del CRM y modo del agente.
6. **Shadow.** Se registra qué habría hecho y con qué argumentos, sin hacerlo.
7. **Presupuesto.** Después de la política: simular no cuesta dinero.
8. **Aprobación.** Hash exacto, no caducada, no consumida, misma acción.
9. **Idempotencia.** Una llamada previa con la misma clave devuelve su resultado
   sin repetir el efecto.
10. **Consumo de la aprobación, ejecución con timeout y redacción.**

Ninguno se puede saltar, y hay un test por cada uno en
`agent-tool-executor.test.ts`.

## Estructura

```text
src/lib/agents/
├── types.ts              contratos; sin acceso a datos
├── canonical-json.ts     serialización determinista + SHA-256
├── action-hash.ts        qué se firma exactamente
├── policy.ts             la matriz de §12 como función pura
├── budget.ts             presupuesto, límites anti-loop y tarifas
├── redaction.ts          reutiliza el saneador del asistente
├── erase-tool.ts         borrado de genéricos sin `any` ni `as`
├── tool-registry.ts      qué existe y quién lo alcanza
├── tool-executor.ts      los diez controles
├── model-provider.ts     interfaz propia + normalizador
├── agent-loop.ts         el ciclo, sin base de datos
├── run-state.ts          transiciones y política de reintentos
├── memory.ts             qué memoria entra en el prompt
├── providers/            null · fake · gemini
└── tools/                define · legacy-read-adapter · allowlists
```

## Decisiones

### El borrado de genéricos no usa `any`

Guardar tools de tipos distintos en un mismo registro suele resolverse con
`AgentTool<any, any>`. Aquí no: la regla 1 de `.claude/rules/typescript.md` lo
prohíbe, y hay una forma mejor.

`eraseAgentTool` devuelve un objeto cuyo `prepare(rawInput)` valida con Zod y
**devuelve funciones que ya llevan dentro el input tipado**. El executor maneja
metadatos y callbacks, nunca el input. Efecto secundario buscado: no existe
ruta para ejecutar una tool sin validar, ni para devolver un resultado sin
pasarlo por su redactor.

### La política es pura y vive en un solo sitio

`evaluatePolicy` recibe estado y devuelve `allow | simulate | needs_approval |
deny`. Cuando las escrituras internas dejen de pedir firma en `execute`, se
cambia ahí y no en cada tool.

El orden de las comprobaciones es parte del contrato: el kill switch global se
evalúa **antes** que el permiso, porque si el sistema está apagado la respuesta
no depende de quién pregunte.

### Los permisos son los del CRM

Las tools declaran `{ module, action }` y la política llama a `hasPermission`.
No hay una segunda matriz RBAC que mantener en paralelo — `agent-tool-parity.test.ts`
comprueba que cada tool concede exactamente a los mismos roles que la tabla
`TOOL_ALLOWED_ROLES` del asistente.

### Sin tarifa conocida, no hay coste

`estimateCostMicros` devuelve `pricingUnknown: true` y coste 0 para un modelo
que no esté en `MODEL_PRICING`. Un coste inventado se sumaría al presupuesto
como si fuera real; un hueco declarado se ve en el informe.

### Las 17 tools se envuelven, no se reimplementan

Cada adaptador llama a la misma función que usa el asistente hoy. Duplicar las
queries daría dos versiones de "cuánto se facturó este mes" que divergirían en
la primera corrección.

## Allowlists de esta fase

```text
guardian      getCrmHelpContext
crm-steward   getCrmHelpContext, getActiveCampaigns, getCampaignMarginSummary,
              getCampaignMarginAlerts, getFinanceAlerts, getFinanceDashboardSummary
deal-clerk    getCrmHelpContext, getActiveCampaigns, getCampaignMarginSummary
growth        getCrmHelpContext
seo           getCrmHelpContext
dev           getCrmHelpContext
```

Reparto estrecho a propósito. Guardian, Growth, SEO y Dev solo tienen
documentación interna porque sus tools propias llegan en PRs posteriores;
darles acceso a finanzas "por si acaso" sería exactamente el error que la
allowlist existe para impedir.

Las tools de conciliación bancaria no las alcanza **ningún** agente todavía, y
hay un test que lo vigila.

Que una tool financiera esté en una allowlist no significa que sus datos vayan
a leerse: el permiso se comprueba contra el rol real del actor, así que una
ejecución disparada por un `staff` no verá facturación aunque la tool esté en
la lista.

### Un timeout de escritura no es un fallo

Si una tool que escribe supera su timeout, el `Promise.race` devuelve el
control pero la escritura **sigue viva** y puede completarse. Registrarlo como
`failed` sería mentir, y la mentira tiene consecuencias: un fallo es
reintentable, y el reintento duplicaría un envío que quizá ya salió.

Por eso existe el estado `indeterminate`:

- `tool_timeout_indeterminate` — la tool escribe y se pasó de tiempo.
- `tool_call_in_flight` — ya hay una llamada con la misma clave en un estado
  que no es `failed`; es lo que deja un worker muerto a mitad.

Ninguno de los dos es reintentable, el bucle detiene la ejecución, y al modelo
se le dice explícitamente **"NO la repitas"**. Solo un `failed` explícito
autoriza a volver a ejecutar.

## Contrato obligatorio para PR 3

**La fila de `agent_tool_calls` se escribe ANTES de invocar la tool, con su
clave de idempotencia y `status = 'executing'`, en su propia sentencia
comprometida.**

Escribirla después es lo natural —ya se sabe el resultado— y es exactamente lo
que rompe la garantía: si el worker muere a mitad de la tool, no queda rastro,
y al reanudar `findPreviousCall` no encuentra nada y la acción se repite a
ciegas. Con la fila escrita antes, el reintento encuentra un `executing` y
devuelve `tool_call_in_flight` en vez de enviar el email por segunda vez.

Consecuencia deseada: una fila en `executing` cuyo lease ya venció es una
anomalía detectable, y esa es justo la señal que se quiere.

## Dos fallos que encontraron los tests

Ambos en código escrito en este mismo PR, ambos arreglados:

1. **`redactForStorage` desbordaba la pila con un objeto cíclico.** Un registro
   de ORM con su relación inversa basta para provocarlo, y el desbordamiento
   habría ocurrido justo al guardar la traza de un fallo. Ahora rompe ciclos y
   acota la profundidad a 12 niveles.

2. **`test:agents` casaba con todo.** El patrón `agent-` coincidía con el nombre
   del worktree (`pz-agent-core`) y ejecutaba la suite entera. Ahora el patrón
   está anclado al nombre de fichero.

## Pruebas

```bash
npm run test:agents
```

| Suite | Cubre |
|---|---|
| `agent-canonical-json` | Determinismo, orden de claves, NaN, ciclos, y qué invalida una firma |
| `agent-policy` | La matriz completa: kill switches, forbidden, RBAC, shadow, aprobaciones |
| `agent-tool-executor` | Los diez controles, uno a uno |
| `agent-budget` | Techos global/agente/run, límites anti-loop, tarifa desconocida |
| `agent-redaction` | IBAN, email, NIF, cabeceras, tamaño, ciclos, prompt injection |
| `agent-loop` | Turnos, tools, límites, cancelación, aprobación, errores del proveedor |
| `agent-tool-parity` | Las 17 tools y sus permisos frente al asistente |
| `agent-provider-output` | Salida hostil del proveedor, NullProvider, declaración de funciones |
| `agent-run-state` | Transiciones, invariantes de la tabla, reintentos y backoff |
| `agent-memory-assembly` | Qué memoria entra en el prompt y cuál no |
| `agent-loop-limits.fuzz` | Con cualquier respuesta del modelo, el bucle termina dentro de sus límites |

Ningún test llama a Gemini: `FakeAgentModelProvider` devuelve turnos
guionizados, así que la suite es determinista y no necesita clave de API.

## Lo que este PR no hace

- No arranca ningún worker ni schedule.
- No añade tools de escritura: las 17 son de lectura.
- No toca `/admin/asistente`.
- No modifica el schema (`drizzle-kit generate` no emite nada).
- No añade rutas ni UI.
- No llama a ningún servicio externo.

## Rollback

Revertir el PR. Nada de lo que añade se ejecuta todavía desde una ruta de
producción, así que quitarlo no cambia el comportamiento de nada.

## Decisiones tomadas para los PRs siguientes

### PR 3 — cómo se prueban las garantías de concurrencia

Las de PR 1 y PR 2 son declarativas y se pueden comprobar leyendo SQL o
llamando a funciones puras. Las de PR 3 no: que dos workers reclamen
ejecuciones distintas, que un lease caducado se recupere, que un tick doble de
schedule cree un solo run. Eso es comportamiento, y **exige una base real**.

Decisión: los tests de concurrencia se escriben contra un Postgres desechable y
se saltan solos cuando falta `TEST_DATABASE_URL`, de modo que CI —que no tiene
base— siga verde sin fingir cobertura. Lo que no se pueda verificar así se
declara explícitamente como no verificado en el cuerpo del PR, en vez de
sustituirlo en silencio por un test de contrato más flojo.

Esa base desechable **no es el VPS** ni ninguna base del proyecto: es un
contenedor local que se tira al terminar.

### PR 4 — el RBAC de aprobaciones va en el backend

`canApproveActionClass` existe desde este PR pero **todavía no la llama nadie**:
hoy `decideApproval` acepta el `decidedByUserId` que le pasen. Es un hueco
consciente, y PR 4 tiene que cerrarlo así:

- la Server Action de aprobar llama a `canApproveActionClass(role, actionClass)`;
- **y además** revalida el permiso de dominio guardado en
  `required_permission_module/action`, porque el snapshot es auditoría, no
  autorización;
- con un test de que un `manager` no puede aprobar una acción `privileged`;
- el módulo `agents` que se añada a `PERMISSIONS` no incluye `brand`.

Ocultar la opción en el menú no cuenta.

### PR 3 — no tocar los ficheros compartidos de `infra/`

La rama `infra/vps-compose` es de otra línea de trabajo y posee
`infra/README.md`, `infra/crm/`, `infra/edge/Caddyfile` e `infra/backups/`. PR 3
crea `infra/agents/` —rutas nuevas, sin conflicto— pero **no** edita el índice
de `infra/README.md` ni la configuración de Caddy. El enlace entre ambos se
hace cuando esa rama se mergee.

## Siguiente PR

`feat/agent-worker` — claim con `FOR UPDATE SKIP LOCKED`, leases, heartbeat,
checkpoints, reintentos con backoff, dead-letter, cancelación cooperativa,
graceful shutdown, scheduler con advisory lock y procesador de eventos.

Cuatro deudas heredadas que le tocan:

1. El claim necesita `attempt < max_attempts` en el `WHERE`, o el cuarto intento
   de una ejecución con `max_attempts = 3` reventará contra
   `agent_runs_attempt_ck` en vez de ir a dead-letter.
2. `recordAgentUsage` hace INSERT y luego UPDATE sin transacción; al conectarlo
   debe pasar por `getTransactionalDb()`.
3. El worker escribe lease y `completed_at` en el **mismo** `UPDATE` que cambia
   el estado: los CHECK no admiten el estado intermedio.
4. La fila de `agent_tool_calls` se escribe **antes** de ejecutar (ver arriba).
