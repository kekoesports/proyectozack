---
summary: 'Modelo de datos propuesto para Zack Agent OS: runs, steps, tools, aprobaciones, eventos, schedules, memoria, usage y workers.'
read_when:
  - Adding the Agent OS Drizzle schema
  - Generating the agent runtime migration
  - Implementing queue claims, approvals, schedules or memory
---

# Modelo de datos de Zack Agent OS

## 1. Estrategia de migración

La primera migración es **aditiva**. No se eliminan ni renombran:

- `ai_assistant_threads`;
- `ai_assistant_messages`;
- `ai_tool_executions`;
- tablas de campañas, tareas, alertas o automatización.

El chat existente continúa funcionando mientras las nuevas tablas soportan ejecuciones asíncronas. La convergencia entre ambos sistemas se hace más adelante mediante servicios y adaptadores comunes.

Orden obligatorio:

```text
schema Drizzle
→ drizzle-kit generate
→ revisar SQL
→ migración en rama temporal
→ queries/repositorios
→ runtime
→ API
→ UI
```

No usar `drizzle-kit push`.

## 2. Enums

Los nombres son orientativos, pero deben quedar centralizados en un único schema para evitar duplicados.

```typescript
agentStatusEnum = ['active', 'paused', 'disabled']
agentModeEnum = ['shadow', 'recommend', 'execute']

agentRunStatusEnum = [
  'queued',
  'running',
  'waiting_approval',
  'retry_scheduled',
  'succeeded',
  'failed',
  'cancelled',
  'budget_blocked',
  'dead_letter',
]

agentTriggerTypeEnum = [
  'manual',
  'chat',
  'schedule',
  'event',
  'webhook',
  'system',
]

agentStepTypeEnum = [
  'deterministic',
  'model',
  'tool',
  'approval',
  'handoff',
  'finalize',
]

agentStepStatusEnum = [
  'pending',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'skipped',
  'cancelled',
]

agentActionClassEnum = [
  'read',
  'internal_draft',
  'internal_write',
  'external_side_effect',
  'privileged',
  'forbidden',
]

agentToolCallStatusEnum = [
  'proposed',
  'waiting_approval',
  'approved',
  'executing',
  'succeeded',
  'failed',
  'blocked',
  'rejected',
  'expired',
  'cancelled',
]

agentApprovalStatusEnum = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
  'consumed',
]

agentEventStatusEnum = [
  'pending',
  'claimed',
  'processed',
  'ignored',
  'dead_letter',
]

agentEventSeverityEnum = ['info', 'warning', 'high', 'critical']

agentMemoryScopeEnum = ['user', 'team', 'agent', 'global']
agentMemorySensitivityEnum = ['public', 'internal', 'confidential', 'restricted']
agentMemoryVerificationEnum = ['proposed', 'verified', 'rejected', 'revoked']

agentScheduleCatchUpEnum = ['skip', 'latest', 'all_limited']
agentUsageKindEnum = ['model_turn', 'embedding', 'external_api', 'tool_runtime']
```

## 3. `agent_definitions`

Configuración operativa de cada agente. Los prompts completos y el código de tools siguen versionados en Git; la DB contiene estado y overrides seguros.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | Identificador interno |
| `slug` | varchar(80) UNIQUE | `guardian`, `crm-steward`, etc. |
| `displayName` | varchar(120) | Nombre visible |
| `description` | text | Misión resumida |
| `status` | agent_status | Kill switch por agente |
| `mode` | agent_mode | Shadow/recommend/execute |
| `promptVersion` | varchar(80) | Versión versionada en código |
| `policyVersion` | varchar(80) | Versión de política |
| `modelProvider` | varchar(40) | Provider configurado |
| `modelName` | varchar(120) | Modelo elegido |
| `maxConcurrentRuns` | integer | Default 1 |
| `maxRunsPerDay` | integer | Límite duro |
| `maxTurnsPerRun` | integer | Protección anti-loop |
| `maxToolCallsPerRun` | integer | Protección anti-loop |
| `maxDurationSeconds` | integer | Timeout global |
| `monthlyBudgetMicros` | bigint/numeric | 1 USD = 1.000.000 micros |
| `settingsJson` | jsonb | Solo settings no secretos validados |
| `createdAt` | timestamptz | default now |
| `updatedAt` | timestamptz | default now |

Checks:

- límites mayores que cero;
- presupuesto no negativo;
- `settingsJson` nunca contiene API keys.

Seed idempotente:

```text
scripts/seed-agent-definitions.ts
```

No insertar agentes mediante SQL ad hoc.

## 4. `agent_runs`

Unidad persistente de trabajo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | ID visible en admin |
| `agentId` | FK agent_definitions | restrict |
| `triggerType` | enum | Origen |
| `triggeredByUserId` | FK user nullable | Usuario humano |
| `parentRunId` | self FK nullable | Handoff/subrun |
| `sourceEventId` | FK agent_events nullable | Evento de origen |
| `threadId` | FK ai_assistant_threads nullable | Integración futura con chat |
| `status` | run status | Estado canónico |
| `priority` | integer | Default 0 |
| `idempotencyKey` | varchar(240) nullable | UNIQUE parcial |
| `correlationId` | varchar(80) | UUID/correlation estable |
| `inputJson` | jsonb | Input ya redacted |
| `outputSummary` | text nullable | Resumen final, no payload completo |
| `stateJson` | jsonb | Checkpoint reanudable y versionado |
| `availableAt` | timestamptz | Cola/retry |
| `scheduledFor` | timestamptz nullable | Ventana original |
| `startedAt` | timestamptz nullable | Primer inicio |
| `completedAt` | timestamptz nullable | Terminal |
| `cancelRequestedAt` | timestamptz nullable | Cancelación cooperativa |
| `attempt` | integer | Default 0 |
| `maxAttempts` | integer | Default 3 |
| `leaseOwner` | varchar(120) nullable | Worker actual |
| `leaseExpiresAt` | timestamptz nullable | Recuperación |
| `nextStepSequence` | integer | Checkpoint |
| `modelTurns` | integer | Contador duro |
| `toolCalls` | integer | Contador duro |
| `inputTokens` | bigint | Usage acumulado |
| `outputTokens` | bigint | Usage acumulado |
| `estimatedCostMicros` | bigint/numeric | Usage acumulado |
| `lastErrorCode` | varchar(100) nullable | Código estable |
| `lastErrorMessage` | text nullable | Redacted y truncado |
| `createdAt` | timestamptz | default now |
| `updatedAt` | timestamptz | default now |

Índices:

```text
UNIQUE idempotencyKey WHERE idempotencyKey IS NOT NULL
(status, availableAt, priority DESC) WHERE status IN ('queued','retry_scheduled')
(agentId, createdAt DESC)
(triggeredByUserId, createdAt DESC)
(sourceEventId)
(leaseExpiresAt) WHERE status='running'
(correlationId)
```

Checks:

- `attempt <= maxAttempts`;
- contadores no negativos;
- estados terminales requieren `completedAt`;
- `running` requiere lease;
- `waiting_approval` no puede conservar un lease activo indefinidamente.

## 5. `agent_run_steps`

Timeline append-oriented de cada run.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `runId` | FK agent_runs CASCADE | |
| `sequence` | integer | UNIQUE por run |
| `stepType` | enum | |
| `name` | varchar(160) | Nombre estable |
| `status` | enum | |
| `inputJson` | jsonb nullable | Redacted |
| `outputJson` | jsonb nullable | Redacted y limitado |
| `provider` | varchar(40) nullable | Para model step |
| `model` | varchar(120) nullable | Para model step |
| `inputTokens` | bigint | |
| `outputTokens` | bigint | |
| `estimatedCostMicros` | bigint/numeric | |
| `startedAt` | timestamptz nullable | |
| `completedAt` | timestamptz nullable | |
| `errorCode` | varchar(100) nullable | |
| `errorMessage` | text nullable | Redacted |
| `createdAt` | timestamptz | default now |

Índices:

```text
UNIQUE (runId, sequence)
(runId, createdAt)
(status, createdAt)
```

No actualizar outputs históricos salvo para completar el mismo step en ejecución. La timeline no debe reescribirse para ocultar fallos.

## 6. `agent_tool_calls`

Registro canónico de propuestas y ejecuciones de tools.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `runId` | FK agent_runs CASCADE | |
| `stepId` | FK agent_run_steps SET NULL | |
| `providerCallId` | varchar(160) nullable | ID de tool call del modelo |
| `toolName` | varchar(160) | Allowlisted |
| `toolVersion` | varchar(80) | Congela semántica |
| `actionClass` | enum | |
| `status` | enum | |
| `inputJson` | jsonb | Input redacted |
| `inputHash` | varchar(64) | SHA-256 canonical JSON |
| `idempotencyKey` | varchar(240) nullable | UNIQUE parcial |
| `approvalId` | FK agent_approvals nullable | Se añade después |
| `resultJson` | jsonb nullable | Redacted |
| `errorCode` | varchar(100) nullable | |
| `errorMessage` | text nullable | |
| `proposedAt` | timestamptz | |
| `executedAt` | timestamptz nullable | |
| `completedAt` | timestamptz nullable | |
| `createdAt` | timestamptz | |

Índices:

```text
(runId, createdAt)
(toolName, createdAt)
(status, createdAt)
UNIQUE idempotencyKey WHERE idempotencyKey IS NOT NULL
```

No guardar input/output sin aplicar el redactor propio de la tool.

## 7. `agent_approvals`

Autorización humana exacta y de un solo uso.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `runId` | FK agent_runs CASCADE | |
| `toolCallId` | FK agent_tool_calls CASCADE UNIQUE | Una aprobación activa por call |
| `actionHash` | varchar(64) | Hash inmutable |
| `actionClass` | enum | |
| `riskLevel` | varchar(20) | low/medium/high/critical |
| `title` | varchar(200) | Visible |
| `summary` | text | Redacted |
| `parametersPreviewJson` | jsonb | Preview redacted |
| `status` | approval status | |
| `requiredPermissionModule` | varchar(80) | Snapshot de política |
| `requiredPermissionAction` | varchar(80) | Snapshot de política |
| `requestedAt` | timestamptz | |
| `expiresAt` | timestamptz | Obligatorio |
| `decidedAt` | timestamptz nullable | |
| `decidedByUserId` | FK user SET NULL | |
| `decisionNote` | text nullable | |
| `consumedAt` | timestamptz nullable | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Índices/checks:

```text
UNIQUE (toolCallId)
UNIQUE (actionHash, status) con estrategia que evite dos pending equivalentes
(status, expiresAt)
(decidedByUserId, decidedAt)
expiresAt > requestedAt
```

La decisión debe ejecutarse en transacción con un `UPDATE ... WHERE status='pending'` para impedir dobles clics.

## 8. `agent_schedules`

Rutinas configurables.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `slug` | varchar(100) UNIQUE | |
| `agentId` | FK | |
| `name` | varchar(160) | |
| `cronExpression` | varchar(120) | Validada |
| `timezone` | varchar(80) | Default Europe/Madrid |
| `enabled` | boolean | |
| `catchUpPolicy` | enum | |
| `maxCatchUpRuns` | integer | Default 1 |
| `inputJson` | jsonb | Config no secreta |
| `nextRunAt` | timestamptz | Índice |
| `lastScheduledFor` | timestamptz nullable | Ventana materializada |
| `lastRunId` | FK agent_runs nullable | |
| `createdByUserId` | FK user nullable | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Índices:

```text
(enabled, nextRunAt) WHERE enabled=true
(agentId, enabled)
```

La rutina no guarda tokens, webhooks ni credenciales.

## 9. `agent_events`

Inbox durable de señales externas.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `source` | varchar(80) | uptime, n8n, github, collector... |
| `eventType` | varchar(120) | Allowlisted |
| `externalId` | varchar(240) nullable | ID origen |
| `eventKey` | varchar(320) UNIQUE | Dedupe |
| `severity` | enum | |
| `status` | enum | |
| `payloadJson` | jsonb | Validado y redacted |
| `fingerprint` | varchar(160) nullable | Agrupar incidentes |
| `occurredAt` | timestamptz | Evento real |
| `availableAt` | timestamptz | Procesamiento |
| `claimedBy` | varchar(120) nullable | |
| `claimExpiresAt` | timestamptz nullable | |
| `processedAt` | timestamptz nullable | |
| `runId` | FK agent_runs nullable | Run generado |
| `attempt` | integer | |
| `lastError` | text nullable | Redacted |
| `createdAt` | timestamptz | |

Índices:

```text
UNIQUE eventKey
(status, availableAt)
(fingerprint, occurredAt DESC)
(source, eventType, occurredAt DESC)
(severity, status, occurredAt DESC)
```

## 10. `agent_memories`

Memoria curada y versionada.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `scope` | enum | |
| `scopeUserId` | FK user nullable | Requerido para scope user |
| `agentId` | FK nullable | Para scope agent |
| `memoryKey` | varchar(180) | Nombre estable |
| `content` | text | Redacted |
| `contentJson` | jsonb nullable | Hecho estructurado |
| `sensitivity` | enum | |
| `verificationStatus` | enum | |
| `confidencePct` | integer nullable | 0-100 |
| `sourceType` | varchar(80) | policy, user, document... |
| `sourceRef` | text nullable | ID/URL interna segura |
| `validFrom` | timestamptz | |
| `validUntil` | timestamptz nullable | TTL |
| `supersedesMemoryId` | self FK nullable | Versionado |
| `createdByUserId` | FK user nullable | |
| `verifiedByUserId` | FK user nullable | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Checks:

- `scope='user'` requiere `scopeUserId`;
- `scope='agent'` requiere `agentId`;
- confianza entre 0 y 100;
- `validUntil > validFrom`;
- `verified` requiere `verifiedByUserId` o una política de sistema explícita.

Índices:

```text
(scope, scopeUserId, agentId, memoryKey)
(verificationStatus, validUntil)
(agentId, verificationStatus)
```

No hay embeddings en esta fase.

## 11. `agent_usage_ledger`

Ledger append-only por llamada/consumo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial/bigserial PK | |
| `runId` | FK agent_runs CASCADE | |
| `stepId` | FK nullable | |
| `agentId` | FK | Denormalizado para reporting |
| `kind` | enum | |
| `provider` | varchar(40) nullable | |
| `model` | varchar(120) nullable | |
| `inputTokens` | bigint | |
| `outputTokens` | bigint | |
| `cachedInputTokens` | bigint nullable | |
| `estimatedCostMicros` | bigint/numeric | |
| `durationMs` | integer nullable | |
| `usageJson` | jsonb nullable | Datos provider redacted |
| `occurredAt` | timestamptz | |
| `createdAt` | timestamptz | |

Índices:

```text
(agentId, occurredAt)
(runId, occurredAt)
(provider, model, occurredAt)
```

La estimación de coste utiliza una tabla/config versionada. Si el precio es desconocido, el coste queda `null/0 + pricingUnknown=true`; no se inventa.

## 12. `agent_worker_heartbeats`

Estado de workers sin depender de logs.

| Campo | Tipo | Notas |
|---|---|---|
| `workerId` | varchar(120) PK | UUID al arranque |
| `version` | varchar(80) | Git SHA |
| `hostname` | varchar(160) | No IP pública |
| `status` | varchar(30) | starting/healthy/draining/stopped |
| `currentRunId` | FK nullable | |
| `startedAt` | timestamptz | |
| `lastHeartbeatAt` | timestamptz | |
| `metadataJson` | jsonb | No secrets |

Un heartbeat viejo no se borra inmediatamente; permite diagnosticar reinicios.

## 13. Tabla opcional en fase 2: `agent_recommendations`

Se añade solo si Guardian/CRM Steward necesitan seguimiento independiente del run.

Campos mínimos:

```text
agentId
runId
category
severity
title
summary
entityType/entityId
status: new/accepted/dismissed/converted/executed
assignedToUserId
expiresAt
createdAt/updatedAt
```

Antes de crearla, comprobar si `crm_alerts` o `crm_tasks` cubren el caso sin duplicar conceptos.

## 14. Relaciones con tablas actuales

```text
ai_assistant_threads ───── optional ───── agent_runs
user ─────────────────────────────────── agent_runs / approvals / memories
agent_events ─────────────────────────── agent_runs
agent_runs ───────────────────────────── steps / tool calls / approvals / usage
campaigns, brands, talents, tasks ───── tools; no FK genérica nueva en fase 1
```

No añadir una FK polimórfica genérica a cada entidad en la primera migración. Las referencias de negocio aparecen en inputs redactados o tablas de dominio existentes.

## 15. Retención y privacidad

La migración inicial no debe añadir un purge automático sin política aprobada.

Propuesta para revisión:

| Datos | Retención sugerida |
|---|---|
| Runs y steps operativos | 180 días |
| Inputs/outputs detallados | 90 días |
| Usage agregado | 24 meses |
| Aprobaciones | 24 meses |
| Eventos info/warning | 90 días |
| Incidentes high/critical | 24 meses |
| Memoria | Hasta revocación/caducidad |
| Heartbeats | 30 días |

Antes de activar purga:

- aprobar política;
- excluir registros ligados a una investigación;
- mantener agregados no personales;
- añadir dry-run;
- auditar cada purga.

## 16. Migración y rollback

### Preflight

- `npx drizzle-kit check` limpio.
- `generate` no emite cambios ajenos.
- Snapshot/backup de DB.
- Migración probada en branch temporal.

### Aplicación

- Crear enums/tablas/índices.
- Ejecutar seed idempotente de agentes en estado `disabled` o `paused`.
- No crear schedules activos.
- `AGENTS_ENABLED=false` por defecto.

### Rollback funcional

No hace falta eliminar tablas para desactivar:

```text
AGENTS_ENABLED=false
agent_definitions.status='disabled'
agent_schedules.enabled=false
worker detenido
```

Las tablas pueden permanecer sin afectar al CRM. Un rollback destructivo de schema no se ejecuta en producción.
