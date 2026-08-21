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

## Siguiente PR

`feat/agent-worker` — claim con `FOR UPDATE SKIP LOCKED`, leases, heartbeat,
checkpoints, reintentos con backoff, dead-letter, cancelación cooperativa,
graceful shutdown, scheduler con advisory lock y procesador de eventos.

Tres deudas de PR 1 que le tocan: el claim necesita `attempt < max_attempts` en
el `WHERE`, `recordAgentUsage` necesita transacción, y el worker debe escribir
lease y `completed_at` en el mismo `UPDATE` que cambia el estado.
