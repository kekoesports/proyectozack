---
summary: 'Roadmap ejecutable por PR para implementar Zack Agent OS sin romper el asistente, CRM, n8n ni la migración al VPS.'
read_when:
  - Planning or implementing Zack Agent OS
  - Splitting the work into pull requests
  - Reviewing rollout, tests or rollback
---

# Roadmap de implementación de Zack Agent OS

> **Estado a 22-08-2026:** las fases PR 1–6 descritas aquí ya están
> implementadas. El siguiente gate no es más código base, sino el rollout
> controlado de Guardian indicado en `runbook-operacion.md`. Las fases 7–10
> siguen pendientes y no deben activarse antes de completar la evaluación de
> Guardian en shadow.

## 1. Estrategia

No implementar todos los agentes en un único PR. El orden protege el CRM y permite obtener valor temprano:

```text
Fundación persistente
→ runtime estructurado
→ worker + scheduler
→ control plane y aprobaciones
→ Guardian shadow
→ CRM Steward
→ Deal Clerk
→ Growth / SEO / Dev
→ acciones controladas
```

El asistente actual sigue disponible hasta que el runtime nuevo tenga paridad. Cada PR debe poder desplegarse sin activar agentes.

## 2. Dependencias con la migración al VPS

Se puede implementar schema, runtime, UI y tests antes de terminar la migración desde Vercel/Neon. El despliegue permanente del worker debe coordinarse con la infraestructura VPS.

Reglas:

- En Neon, el claim puede apoyarse temporalmente en la conexión transaccional existente.
- El repositorio del runtime debe depender de una interfaz DB, no de APIs exclusivas de Neon.
- Cuando `src/lib/db.ts` migre a `node-postgres`, el worker no debe necesitar un rediseño.
- El worker no se ejecuta como función Vercel.
- No se activa Guardian hasta disponer de health checks y telemetría fiables.

## 3. PR 0 — Blueprint documental

**Rama:** `docs/zack-agent-os-blueprint`

Incluye este paquete y ADR. No modifica runtime ni base de datos.

Criterio:

- arquitectura y límites revisados;
- decisiones explícitas;
- prompt de implementación disponible;
- sin cambios de producción.

## 4. PR 1 — Schema y dominio del runtime

**Rama sugerida:** `feat/agent-runtime-schema`

### Alcance

Crear schemas Drizzle aditivos:

```text
src/db/schema/agentDefinitions.ts
src/db/schema/agentRuns.ts
src/db/schema/agentApprovals.ts
src/db/schema/agentSchedules.ts
src/db/schema/agentEvents.ts
src/db/schema/agentMemories.ts
src/db/schema/agentUsage.ts
src/db/schema/agentWorkers.ts
```

Se puede agrupar en menos archivos si ninguno supera 500 LOC y la cohesión mejora.

Actualizar:

```text
src/db/schema/index.ts
src/types/index.ts
src/lib/env.ts
```

Añadir queries/repositories:

```text
src/lib/queries/agents/definitions.ts
src/lib/queries/agents/runs.ts
src/lib/queries/agents/approvals.ts
src/lib/queries/agents/schedules.ts
src/lib/queries/agents/events.ts
src/lib/queries/agents/memories.ts
src/lib/queries/agents/usage.ts
src/lib/queries/agents/workers.ts
```

Añadir seed idempotente:

```text
scripts/seed-agent-definitions.ts
```

Agentes iniciales en `disabled` y `shadow`:

```text
guardian
crm-steward
deal-clerk
growth
seo
dev
```

Variables nuevas, todas desactivadas por defecto:

```env
AGENTS_ENABLED=false
AGENT_INTERNAL_TOKEN=
AGENT_EVENT_HMAC_SECRET=
AGENT_GLOBAL_MONTHLY_BUDGET_MICROS=10000000
AGENT_WORKER_POLL_MS=2000
AGENT_LEASE_SECONDS=60
AGENT_MAX_CONCURRENCY=1
```

Los defaults deben ser seguros. Secretos opcionales en desarrollo y fail-closed en endpoints internos.

### Tests

```text
src/__tests__/server/agent-schema-constraints.test.ts
src/__tests__/server/agent-run-repository.test.ts
src/__tests__/server/agent-event-dedupe.test.ts
src/__tests__/server/agent-memory-scope.test.ts
src/__tests__/server/agent-approval-state.test.ts
```

### Criterios

- migración solo crea objetos;
- cero `DROP`;
- `drizzle-kit check` limpio;
- seed repetible;
- `AGENTS_ENABLED=false` impide encolar runs;
- ningún schedule activo;
- no cambia `/admin/asistente`.

### Rollback

Desactivar flag y no arrancar worker. No eliminar tablas en producción.

## 5. PR 2 — Core runtime y tool registry estructurado

**Rama:** `feat/agent-runtime-core`

### Estructura

```text
src/lib/agent-runtime/
├── types.ts
├── errors.ts
├── canonical-json.ts
├── redaction.ts
├── policy.ts
├── budget.ts
├── approvals.ts
├── memory.ts
├── run-state.ts
├── tool-registry.ts
├── tool-executor.ts
├── model-provider.ts
├── providers/
│   ├── null-provider.ts
│   └── gemini-provider.ts
└── tools/
    ├── index.ts
    └── legacy-read-adapter.ts
```

### Requisitos

- Tool calls estructuradas y validadas por Zod.
- No regex `[TOOL:*]` en el runtime nuevo.
- Máximo de turnos y calls.
- Timeout por model/tool.
- Clasificación de acciones.
- RBAC en execution boundary.
- Approval hash con canonical JSON.
- Redacción específica por tool.
- Budget check antes y después de model turn.
- Provider interface independiente de Gemini.
- Usage real cuando esté disponible.
- `NullProvider` seguro.
- Inputs de tool y provider considerados no confiables.

### Reutilización

Adaptar primero las tools existentes de solo lectura:

```text
getBillingSummary
getOverdueInvoices
getPendingInvoices
getCampaignMarginSummary
getActiveCampaigns
getRecurringExpensesSummary
getMonthlyExpenseSummary
getCrmHelpContext
getBankReconciliationSummary
getUnmatchedBankTransactions
getSuggestedTransactionMatches
getPendingPaymentMatches
getFinanceDashboardSummary
getCashflowTrend
getReceivablesRiskSummary
getCampaignMarginAlerts
getFinanceAlerts
```

No duplicar queries. Crear wrappers con schemas de output reducido.

### Compatibilidad

El orquestador antiguo de `/admin/asistente` sigue sin cambios en este PR. Añadir tests de paridad para las tools adaptadas.

### Tests

```text
agent-tool-registry.test.ts
agent-tool-rbac.test.ts
agent-tool-redaction.test.ts
agent-tool-timeout.test.ts
agent-approval-hash.test.ts
agent-budget.test.ts
agent-provider-output.test.ts
agent-loop-limits.fuzz.ts
```

Criterio crítico: aunque el modelo solicite una tool desconocida o prohibida, no se ejecuta.

## 6. PR 3 — Worker, leases, retries y scheduler

**Rama:** `feat/agent-worker`

### Archivos

```text
src/worker/agent-worker.ts
src/lib/agent-runtime/worker/
├── claim.ts
├── heartbeat.ts
├── execute-run.ts
├── retry-policy.ts
├── scheduler.ts
├── event-processor.ts
└── shutdown.ts
```

Scripts:

```json
{
  "agents:worker": "tsx src/worker/agent-worker.ts",
  "agents:worker:once": "tsx src/worker/agent-worker.ts --once",
  "test:agents": "jest --selectProjects server --runInBand --testPathPatterns=agent"
}
```

### Requisitos

- `FOR UPDATE SKIP LOCKED`.
- Lease y heartbeat.
- Recuperación tras crash.
- Graceful shutdown con drain.
- Idempotencia por run y tool.
- Retry solo para errores clasificados como transitorios.
- Dead-letter después de max attempts.
- Scheduler con advisory lock.
- Catch-up acotado.
- Worker heartbeat.
- No schedule duplicado con n8n.
- No tool privilegiada en el primer release.

### Docker

Preparar servicio, no activarlo en producción:

```text
infra/agents/compose.yaml
infra/agents/.env.example
infra/agents/README.md
```

No publicar puertos. El worker necesita únicamente DB y APIs externas configuradas.

### Tests de fallo

- Dos workers reclaman runs distintos.
- Worker pierde lease y no ejecuta otra tool.
- Crash antes de tool: run se recupera.
- Crash después de escritura: idempotencia evita duplicado.
- Schedule tick duplicado crea un run.
- Kill switch detiene entre steps.
- SIGTERM drena correctamente.

## 7. PR 4 — Control plane y centro de aprobaciones

**Rama:** `feat/agent-admin-control-plane`

### Permisos

Añadir a `src/lib/permissions.ts`:

```text
agents: read/write/approve/manage/audit
infrastructure: read/operate
```

Actualizar `admin-nav.ts` sin mostrar opciones a roles no autorizados.

### Páginas

```text
src/app/admin/(dashboard)/agents/page.tsx
src/app/admin/(dashboard)/agents/runs/page.tsx
src/app/admin/(dashboard)/agents/runs/[id]/page.tsx
src/app/admin/(dashboard)/agents/approvals/page.tsx
src/app/admin/(dashboard)/agents/memory/page.tsx
src/app/admin/(dashboard)/agents/schedules/page.tsx
src/app/admin/(dashboard)/agents/settings/page.tsx
```

Mantener page shells finas y componentes en:

```text
src/features/admin/agents/
```

### Funciones

- catálogo y estado;
- activar/pausar solo con permisos;
- runs con timeline;
- filtros y errores;
- aprobar/rechazar action exacta;
- cancelar run;
- presupuestos;
- kill switch visible;
- worker heartbeat;
- schedules desactivados por defecto;
- memory proposal/verify/revoke;
- auditoría redacted.

### Reglas UI

- No mostrar JSON crudo por defecto.
- Preview de argumentos enmascarada.
- Acción de alto riesgo requiere escribir una frase de confirmación o segundo paso.
- Doble clic no duplica decisión.
- La aprobación caducada no puede revivirse.

### E2E

- usuario sin permiso recibe redirect/403;
- aprobación correcta reencola run;
- rechazo termina/bloquea tool;
- kill switch impide run manual;
- budget block visible;
- ningún dato sensible aparece en HTML.

## 8. PR 5 — Health endpoints y event ingestion

**Rama:** `feat/guardian-telemetry-foundation`

### Health endpoints

```text
/api/health/live
/api/health/ready
```

Live no toca DB. Ready comprueba DB, storage y migración con timeout.

### Ingestion

```text
/api/internal/agents/events
/api/internal/agents/heartbeat
```

- auth dedicada;
- timestamp;
- HMAC/replay window;
- rate limit;
- Zod;
- redacción;
- allowlist de event types;
- dedupe.

### Collector VPS

```text
infra/agents/collector/
├── README.md
├── collect-system-health.sh
├── socialpro-guardian-collector.service
└── socialpro-guardian-collector.timer
```

El script es fijo, sin input del modelo. Recoge:

- uptime/load;
- RAM/swap;
- disco/inodos;
- estado de servicios allowlisted;
- backup heartbeats;
- versión desplegada.

No envía:

- logs completos;
- env vars;
- inspect completo;
- comandos;
- secretos;
- información de procesos ajenos.

### Uptime Kuma

Documentar monitores y webhook. Mantener un monitor externo fuera del VPS.

## 9. PR 6 — Guardian shadow mode

**Rama:** `feat/guardian-shadow`

### Deterministic rules

```text
src/lib/agents/guardian/rules.ts
src/lib/agents/guardian/tools.ts
src/lib/agents/guardian/report.ts
src/lib/agents/guardian/prompt.ts
src/lib/agents/guardian/definition.ts
```

Las reglas producen findings estructurados. El modelo recibe findings, snapshots limitados y runbooks relevantes.

### Schedules

Seed desactivado. Tras aprobación:

```text
guardian-daily
 guardian-weekly-capacity
```

### Salida

Guardar report en el run y mostrar en admin. Durante shadow mode no enviar Discord ni crear tareas.

### Evaluación

- replay de eventos sintéticos;
- disco crítico;
- backup stale;
- app caída;
- DB caída;
- error n8n repetido;
- evento duplicado;
- falso pico que no debe escalar;
- logs con prompt injection;
- secret en log que debe redactarse.

## 10. PR 7 — CRM Steward

**Rama:** `feat/crm-steward-shadow`

Crear queries agregadas con RBAC, tools y reporte diario.

No escribir al principio. Tras evaluar, habilitar `createTaskSuggestion`, no tareas reales.

Criterios:

- hallazgos enlazan IDs reales;
- no muestra importes a roles sin permiso;
- freshness visible;
- no repite recomendaciones resueltas;
- no confunde archivadas con activas;
- no altera entidades.

## 11. PR 8 — Deal Clerk

**Rama:** `feat/deal-clerk-drafts`

Reutilizar servicios de `/api/automation/deal-drafts`.

Si la lógica está encerrada en route handlers, extraer service functions sin cambiar el contrato HTTP.

Tools:

```text
searchCrmBrand
searchTalent
validateProposedDeal
createAutomationDealDraft
updateAutomationDealDraft
getAutomationDealDraft
```

No añadir tool `approveDealDraft`.

Evals con datos sintéticos:

- deal completo;
- moneda ausente;
- talento ambiguo;
- marca nueva;
- cantidades en especie;
- varios entregables;
- `otro` sin descripción;
- mensaje adversarial;
- repetición idempotente.

## 12. PR 9 — Growth, SEO y Dev en modo borrador

Separar por agente si el alcance crece.

### Growth

Primero inbox/manual URLs. No navegador autónomo general.

### SEO

Primero datos propios de Search Console/Analytics y contenido del CRM.

### Dev

Primero GitHub/CI/runtime read-only.

Ninguno publica o envía en esta etapa.

## 13. PR 10 — Side effects aprobados

Solo después del piloto y métricas.

Implementar outbox y adaptadores n8n antes de emails/Discord/GitHub.

Para infraestructura privilegiada, crear un servicio de control mínimo separado. No añadir Docker socket al worker.

Cada tool se aprueba en un PR distinto o conjunto pequeño de acciones relacionadas.

## 14. CI

Añadir job determinista `agents-core`:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run test:agents
npx drizzle-kit check
npm run build
```

No llamar a proveedor IA real en CI. Utilizar `FakeAgentModelProvider` con respuestas estructuradas.

Tests con proveedor real solo manuales/opt-in, con presupuesto y sin datos de producción.

## 15. Evals y canary

### Dataset

Mínimo 30 casos por agente antes de recommend mode. Deal Clerk requiere más cobertura estructurada.

### Shadow comparison

Guardar:

- findings del agente;
- decisión humana;
- accepted/dismissed;
- motivo;
- tool propuesta;
- coste;
- duración.

### Gates

Un agente no avanza de modo por antigüedad solamente. Debe cumplir:

- seguridad;
- precisión;
- estabilidad;
- coste;
- tasa de errores;
- revisión humana.

## 16. Rollout

```text
Local fixtures
→ CI fake provider
→ staging DB sintética
→ producción schema disabled
→ worker sin schedules
→ run manual admin
→ Guardian shadow
→ schedules internos
→ recommend mode
→ acciones aprobadas individuales
```

Nunca saltar directamente a `execute`.

## 17. Rollback por capa

### Runtime

```text
AGENTS_ENABLED=false
```

### Agente

```text
status=paused/disabled
```

### Schedule

```text
enabled=false
```

### Worker

Detener contenedor; web/CRM continúan.

### Tool

Retirar de allowlist y aumentar `toolVersion`; calls pendientes quedan bloqueadas.

### Provider

Cambiar a NullProvider o proveedor anterior.

### UI

Ocultar nav manteniendo registros.

No revertir eliminando tablas o historial.

## 18. Definition of Done global

- documentación actualizada;
- migración revisada;
- tests y typecheck verdes;
- no secretos;
- RBAC en backend;
- redacción probada;
- idempotencia probada;
- rollback probado;
- métricas/heartbeat;
- presupuesto y kill switch;
- sin side effects no aprobados;
- runbook operativo;
- handoff actualizado.
