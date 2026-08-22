---
summary: 'Arquitectura objetivo de Zack Agent OS: control plane, worker, cola PostgreSQL, tools, aprobaciones, memoria y observabilidad.'
read_when:
  - Implementing the agent runtime or worker
  - Adding agent tools, schedules or approvals
  - Integrating Zack with the VPS, CRM or n8n
---

# Arquitectura de Zack Agent OS

## 1. Decisión principal

Zack Agent OS se implementará dentro del mismo repositorio y dominio de SocialPro, pero su ejecución asíncrona vivirá en un proceso separado de Next.js.

- **Next.js será el control plane:** autenticación, RBAC, configuración, chat, runs, aprobaciones y auditoría.
- **El worker será el execution plane:** reclama trabajos, llama al modelo, ejecuta tools, pausa por aprobación y reintenta.
- **PostgreSQL será la cola y el almacén de estado:** no se introduce Redis ni Temporal en el MVP.
- **n8n seguirá siendo el orquestador de integraciones externas deterministas:** Sheets, Docs, Discord, email y webhooks.
- **Los monitores serán deterministas:** Zack interpreta señales; no sustituye health checks ni alertas.

Esta separación evita ejecutar procesos largos dentro de funciones HTTP y permite que el worker se reinicie, actualice o desactive sin afectar al sitio o al CRM.

## 2. Componentes

### 2.1. Control plane — Next.js

Rutas previstas:

```text
/admin/agents                    catálogo y salud de agentes
/admin/agents/runs               ejecuciones y filtros
/admin/agents/runs/[id]          timeline completa del run
/admin/agents/approvals          acciones pendientes
/admin/agents/memory             memoria curada
/admin/agents/schedules          rutinas
/admin/agents/settings           presupuestos y kill switch
```

APIs previstas:

```text
/api/admin/agents/*              sesión Better Auth + permisos
/api/internal/agents/events      autenticación de máquina, red interna/HMAC
/api/internal/agents/heartbeat   worker y collectors
/api/internal/agents/health      diagnóstico interno protegido
```

El chat actual `/admin/asistente` continúa operativo. En una fase posterior se adapta para crear runs en el runtime común, sin eliminar hilos ni mensajes existentes.

### 2.2. Execution plane — agent worker

Ubicación recomendada:

```text
src/worker/agent-worker.ts
src/lib/agent-runtime/
```

Scripts:

```json
{
  "agents:worker": "tsx src/worker/agent-worker.ts",
  "agents:worker:once": "tsx src/worker/agent-worker.ts --once",
  "agents:schedules:tick": "tsx src/worker/agent-worker.ts --schedules-only"
}
```

En producción el worker corre como servicio Docker independiente usando la misma imagen de código o una imagen derivada. No debe ejecutarse dentro del proceso web.

Responsabilidades:

1. Reclamar runs disponibles con lease.
2. Renovar el lease mientras trabaja.
3. Cargar definición, política, presupuesto y memoria permitida.
4. Ejecutar turnos de modelo y tools con un máximo de pasos.
5. Pausar en `waiting_approval` cuando proceda.
6. Reanudar exactamente desde el estado persistido.
7. Registrar usage, pasos y resultados.
8. Reintentar fallos transitorios con backoff.
9. Enviar a dead-letter los fallos permanentes.
10. Publicar heartbeat.

### 2.3. PostgreSQL queue

No se utiliza una tabla como simple lista sin control de concurrencia. El patrón será lease + `FOR UPDATE SKIP LOCKED`.

Pseudoflujo de claim:

```sql
BEGIN;

SELECT id
FROM agent_runs
WHERE status IN ('queued', 'retry_scheduled')
  AND available_at <= now()
  AND (lease_expires_at IS NULL OR lease_expires_at < now())
ORDER BY priority DESC, available_at ASC, id ASC
FOR UPDATE SKIP LOCKED
LIMIT 1;

UPDATE agent_runs
SET status = 'running',
    lease_owner = :worker_id,
    lease_expires_at = now() + interval '60 seconds',
    attempt = attempt + 1,
    started_at = coalesce(started_at, now()),
    updated_at = now()
WHERE id = :id;

COMMIT;
```

Reglas:

- Heartbeat de lease cada 15 segundos.
- Lease inicial recomendado: 60 segundos.
- El worker que pierde el lease deja de ejecutar nuevas tools.
- Un run recuperado conserva steps y tool calls previos.
- Cada tool con escritura necesita idempotency key.
- Máximo de reintentos configurable por agente/run.
- Backoff con jitter.

### 2.4. Scheduler

El worker materializa schedules vencidos en runs mediante un advisory lock global y una clave idempotente por ventana temporal.

Ejemplo:

```text
schedule: guardian-daily
window: 2026-08-21T08:30:00+02:00
idempotency: schedule:guardian-daily:2026-08-21T08:30:00+02:00
```

El scheduler debe recuperar ventanas perdidas de forma acotada, pero nunca generar cientos de runs tras una parada larga. Cada schedule define `catchUpPolicy`:

- `skip`: salta ventanas antiguas.
- `latest`: ejecuta solo la última.
- `all_limited`: recupera hasta N ventanas.

n8n no debe disparar el mismo schedule a la vez. Cada rutina tiene un único propietario documentado.

### 2.5. Event inbox

Alertas y webhooks entran primero en `agent_events` con una clave única. El modelo nunca recibe directamente un webhook arbitrario.

Flujo:

```text
Uptime / n8n / GitHub / collector
             │
             ▼
POST /api/internal/agents/events
             │ validar + redacción + dedupe
             ▼
agent_events
             │ reglas deterministas
             ▼
run Guardian o agrupación de incidente
```

Requisitos:

- Autenticación de máquina separada de `AUTOMATION_API_TOKEN`.
- HMAC o bearer dedicado con rotación.
- Timestamp y protección contra replay.
- Tamaño máximo.
- Zod `safeParse`.
- Payload allowlisted por `eventType`.
- Redacción antes de persistir.
- `event_key` único.

### 2.6. Tool registry

El runtime no interpreta tokens `[TOOL:x]`. Utiliza llamadas estructuradas y un registro tipado.

Contrato conceptual:

```typescript
type AgentActionClass =
  | 'read'
  | 'internal_draft'
  | 'internal_write'
  | 'external_side_effect'
  | 'privileged'
  | 'forbidden';

type AgentToolDefinition<TInput, TOutput> = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodType<TInput>;
  readonly requiredPermission: {
    readonly module: Module;
    readonly action: Action;
  } | null;
  readonly actionClass: AgentActionClass;
  readonly approvalPolicy: 'never' | 'always' | 'dynamic';
  readonly maxExecutionMs: number;
  readonly execute: (ctx: AgentToolContext, input: TInput) => Promise<TOutput>;
  readonly redactInput: (input: TInput) => unknown;
  readonly redactOutput: (output: TOutput) => unknown;
  readonly buildIdempotencyKey?: (ctx: AgentToolContext, input: TInput) => string;
};
```

Controles aplicados en código, no en el prompt:

1. Tool existe en allowlist del agente.
2. El rol del actor tiene permiso.
3. El run no está cancelado.
4. El worker conserva el lease.
5. El presupuesto permite continuar.
6. El input pasa Zod.
7. La política de aprobación se cumple.
8. La idempotency key no fue consumida.
9. La ejecución respeta timeout.
10. Input/output se guardan redactados.

No se implementarán tools genéricas de:

```text
executeShell
runSql
fetchAnyUrl
callAnyApi
evalCode
writeFileAnywhere
dockerCommand
```

### 2.7. Model provider

Se conserva Gemini como proveedor inicial porque ya está integrado, pero se crea una interfaz nueva para el runtime.

```typescript
type AgentModelTurn =
  | { readonly type: 'final'; readonly text: string; readonly usage: ModelUsage }
  | { readonly type: 'tool_calls'; readonly calls: readonly StructuredToolCall[]; readonly usage: ModelUsage };

interface AgentModelProvider {
  runTurn(input: AgentModelTurnInput): Promise<AgentModelTurn>;
}
```

Reglas:

- El proveedor devuelve tool calls estructuradas, no texto parseado con regex.
- La salida se valida antes de ejecutar.
- Máximo de turnos por run.
- Máximo de tool calls por turno.
- Timeout por llamada.
- Usage registrado cuando el proveedor lo entrega.
- Si el proveedor no devuelve usage, se registra `unknown`, no se inventa.
- Los modelos y precios se configuran; no se codifican como verdad permanente.
- El runtime debe soportar `NullProvider` para degradación segura.

El adaptador actual de chat puede mantenerse durante la transición. No se elimina hasta que la nueva implementación tenga paridad y tests.

### 2.8. Approval center

Una aprobación congela la acción exacta propuesta.

Se calcula un hash sobre:

```text
runId + toolName + toolVersion + canonicalJson(input) + actor + policyVersion
```

La aprobación solo sirve para esa combinación. Si cambian argumentos, versión o actor, se solicita una nueva.

Estados:

```text
pending → approved → executing → executed
        ↘ rejected
        ↘ expired
        ↘ cancelled
```

Reglas:

- Caducidad obligatoria.
- Decisión registrada con usuario, rol y nota.
- No se autoaprueba por respuesta textual del modelo.
- La aprobación se comprueba de nuevo justo antes de ejecutar.
- Una aprobación es de un solo uso.
- Un usuario no puede aprobar acciones para las que no tiene permiso.
- Las acciones `privileged` requieren `admin` y política específica.

### 2.9. Memory service

La memoria no es un volcado automático de conversaciones.

Tipos:

1. **Conversation memory:** los mensajes existentes del hilo.
2. **Operational memory:** hechos estables y curados.
3. **Knowledge:** SOP, políticas y documentación versionada.
4. **Live data:** se consulta mediante tools en cada run.

Una entrada de memoria contiene:

- scope;
- agente;
- owner;
- contenido;
- fuente;
- sensibilidad;
- estado de verificación;
- confianza;
- fecha de validez/caducidad;
- creador y aprobador.

Reglas:

- El agente puede proponer memoria; no aceptar todo automáticamente.
- Importes de campañas, NIF, IBAN, contratos y secretos no se guardan como memoria operativa.
- El dato vivo prevalece sobre memoria.
- La memoria caducada no se utiliza.
- La recuperación aplica permiso y scope antes de enviar al modelo.
- No se añade vector DB en el MVP; filtros SQL y búsqueda textual son suficientes.

### 2.10. Budget service

Presupuesto en tres niveles:

```text
global → agente → run
```

Límites mínimos:

- runs por día;
- model turns por run;
- tool calls por run;
- input/output tokens cuando estén disponibles;
- coste estimado mensual;
- duración máxima;
- concurrencia;
- tamaño de contexto.

Al alcanzar el límite:

- no se inician nuevos model turns;
- el run termina `budget_blocked` o queda pausado;
- Guardian determinista continúa monitorizando;
- se crea una alerta interna;
- nunca se permite overage silencioso.

### 2.11. Kill switch

Tres niveles:

```text
AGENTS_ENABLED=false              bloquea todos los runs nuevos
agent.status=paused               pausa un agente
schedule.enabled=false            pausa una rutina
```

Un run activo comprueba el kill switch entre pasos. Las tools privilegiadas lo comprueban inmediatamente antes de ejecutar.

## 3. Seguridad

### 3.1. Prompt injection

Todo contenido externo se trata como datos no confiables:

- emails;
- páginas web;
- logs;
- issues;
- respuestas de APIs;
- documentos.

Los outputs de tools se incluyen en bloques estructurados y etiquetados. Ninguna instrucción encontrada dentro de esos datos modifica la política, la allowlist o los permisos.

### 3.2. Redacción

Antes de persistir o enviar al modelo se eliminan o enmascaran:

- tokens y secrets;
- authorization headers;
- cookies;
- URLs firmadas;
- IBAN completo;
- NIF completo cuando no sea necesario;
- emails cuando la tarea no los requiere;
- rutas privadas;
- contenido contractual completo;
- importes cuando el agente/rol no tenga permiso.

La redacción actual del asistente se reutiliza y amplía; no se crea una segunda implementación divergente.

### 3.3. Acceso a infraestructura

Guardian no recibe root, SSH arbitrario ni Docker socket.

En la primera fase solo consume telemetría. Las acciones futuras se implementan mediante un control service mínimo con allowlist:

```text
restart_service(service_from_allowlist)
run_backup(profile_from_allowlist)
retry_workflow(workflow_from_allowlist)
rollback_app(version_from_allowlist)
```

Cada acción privilegiada necesita aprobación y queda auditada. El control service no acepta comandos libres.

### 3.4. Transacciones y side effects

La lógica de negocio se escribe primero en el CRM. Los efectos externos utilizan outbox/n8n para entrega fiable.

Ejemplo:

```text
crear borrador en CRM + outbox event en una transacción
                         │
                         ▼
                       n8n
                         │ éxito
                         ▼
                marcar evento entregado
```

El agente no marca una notificación como enviada antes de recibir confirmación.

## 4. Observabilidad

Métricas mínimas:

```text
agent_runs_total{agent,status}
agent_run_duration_seconds{agent}
agent_tool_calls_total{tool,status}
agent_approvals_total{action,status}
agent_model_tokens_total{agent,model,direction}
agent_estimated_cost_micros{agent,model}
agent_queue_depth{status}
agent_worker_heartbeat_age_seconds
agent_events_total{type,severity}
agent_budget_blocks_total{agent}
```

Cada run tiene `correlationId`. Logs, steps, tools y eventos lo incluyen.

No se registran prompts completos en logs de infraestructura. El contenido persistente queda en DB bajo permisos y redacción.

## 5. Despliegue y tolerancia a fallos

Servicios previstos en VPS:

```text
socialpro-web
socialpro-agent-worker
socialpro-postgres
socialpro-n8n
socialpro-uptime
socialpro-caddy
```

El worker puede escalar a más de una réplica porque el claim usa `SKIP LOCKED` y leases, aunque el MVP empezará con una.

Escenarios cubiertos:

- Worker muere durante un model turn: lease expira y se reintenta según política.
- Worker muere después de una escritura: idempotency key evita repetición.
- Aprobación pendiente durante un deploy: el estado está en DB y se reanuda.
- Modelo no disponible: backoff, fallback permitido o run fallido.
- Presupuesto agotado: no se llama al modelo.
- DB caída: worker no ejecuta side effects y reporta unhealthy.
- n8n caída: outbox/eventos permanecen pendientes.

## 6. Compatibilidad con el asistente actual

La transición debe ser aditiva:

1. Mantener `ai_assistant_threads`, `ai_assistant_messages` y `ai_tool_executions`.
2. Añadir nuevas tablas del runtime.
3. Construir el worker y tools estructuradas en paralelo.
4. Adaptar herramientas actuales a un registro común sin cambiar outputs públicos.
5. Opcionalmente hacer que un mensaje de chat cree un run síncrono o espere su resultado.
6. Eliminar el parser `[TOOL:*]` solo cuando exista paridad, migración y rollback.

## 7. Lo que queda fuera del MVP

- Navegador autónomo generalista.
- Shell arbitrario.
- SQL generado por el modelo.
- Pagos y transferencias.
- Publicación automática de contenido.
- Envíos masivos de email.
- Vector database.
- Entrenamiento de modelos.
- Marketplace de agentes.
- Multi-tenant externo.
- Exponer Zack como servicio para clientes.
