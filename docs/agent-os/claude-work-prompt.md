---
summary: 'Prompt autocontenido para que Claude Work implemente Zack Agent OS por fases sobre el repositorio SocialPro.'
read_when:
  - Handing Zack Agent OS implementation to Claude Work
  - Starting the first implementation PR
---

# Prompt para Claude Work — implementar Zack Agent OS

Copia y pega desde el siguiente encabezado hasta el final.

---

## ENCARGO

Actúa como Principal Engineer, arquitecto de sistemas de agentes, especialista en seguridad, SRE y desarrollador senior de TypeScript/Next.js/PostgreSQL para SocialPro.

Tu misión es **implementar Zack Agent OS** sobre el repositorio existente, reutilizando el asistente, CRM, permisos, APIs, n8n e infraestructura ya construidos. No debes crear una aplicación paralela ni limitarte a producir otro plan.

Debes trabajar de forma autónoma, incremental y verificable mediante ramas y pull requests. Solo pide intervención cuando haga falta un acceso externo o una acción irreversible.

## REPOSITORIO

```text
kekoesports/proyectozack
```

Rama principal:

```text
master
```

Blueprint preparado en:

```text
docs/zack-agent-os-blueprint
```

Documentos obligatorios:

```text
docs/agent-os/README.md
docs/agent-os/architecture.md
docs/agent-os/data-model.md
docs/agent-os/agents-tools-policies.md
docs/agent-os/implementation-roadmap.md
docs/adr/0006-zack-agent-os-foundation.md
```

El baseline observado al preparar el blueprint fue:

```text
8b0ab738dbc51a61268780ce1a693cd8e5f8fe99
```

No asumas que sigue siendo HEAD.

## PRIMEROS PASOS OBLIGATORIOS

1. Ejecuta `git fetch --all --prune`.
2. Confirma el HEAD actual de `master`.
3. Ejecuta `scripts/docs-list` y respeta `read_when`.
4. Lee, como mínimo:
   - `CLAUDE.md`;
   - `AGENTS.md`;
   - `docs/roadmap-detailed.md`;
   - `docs/ai-assistant.md`;
   - `docs/ai-assistant-two-pass.md`;
   - `docs/n8n-automation-api.md`;
   - `src/db/schema/aiAssistant.ts`;
   - `src/lib/services/ai-assistant/**`;
   - `src/lib/permissions.ts`;
   - `src/lib/auth-guard.ts`;
   - `src/lib/env.ts`;
   - `src/lib/db.ts`;
   - `infra/n8n/**`;
   - los seis documentos del blueprint.
5. Comprueba si el PR documental ya fue fusionado. Si no, usa la rama `docs/zack-agent-os-blueprint` como fuente, pero crea las ramas de implementación desde el `master` actual y porta únicamente la documentación necesaria.
6. Resume en cinco párrafos:
   - qué existe;
   - qué falta;
   - conflictos con el blueprint;
   - dependencias con la migración al VPS;
   - primer PR que vas a implementar.
7. Empieza a implementar. No te detengas en otra auditoría general.

## OBJETIVO DE PRODUCTO

Construir una plataforma interna de agentes especializada en SocialPro:

```text
Zack Core
├── worker asíncrono
├── cola y estado PostgreSQL
├── tools tipadas
├── RBAC
├── presupuestos
├── kill switch
├── aprobaciones humanas
├── memoria curada
├── auditoría
├── schedules
└── event inbox

Agentes
├── Guardian
├── CRM Steward
├── Deal Clerk
├── Growth
├── SEO
└── Dev
```

El CRM es la fuente de verdad. Zack interpreta, prioriza y propone. n8n sigue siendo responsable de integraciones externas deterministas.

## PUNTO DE PARTIDA QUE DEBES REUTILIZAR

Ya existen:

- `ai_assistant_threads`;
- `ai_assistant_messages`;
- `ai_tool_executions`;
- `/admin/asistente`;
- GeminiProvider + NullProvider;
- guardrails y redacción;
- tools de campañas, facturación, finanzas y conciliación;
- RBAC por rol;
- API de borradores de deals;
- idempotencia de automatización;
- n8n self-hosted;
- CRM completo.

No reescribas estas piezas sin necesidad. La transición debe ser aditiva.

## DECISIONES NO NEGOCIABLES

1. Next.js es el control plane; el worker es un proceso separado.
2. PostgreSQL es cola y almacén del MVP.
3. No añadir Redis, Temporal ni vector DB inicialmente.
4. No añadir otro CRM ni otro sistema de auth.
5. No introducir una plataforma de agentes SaaS.
6. Mantener Gemini como primer proveedor, pero detrás de una interfaz propia.
7. No usar regex `[TOOL:*]` en el runtime nuevo.
8. Tool calling estructurado y validado con Zod.
9. No crear tools genéricas de shell, SQL, HTTP o filesystem.
10. No dar Docker socket, root ni SSH al agente.
11. No permitir pagos, transferencias o decisiones fiscales/legales automáticas.
12. Toda acción externa o privilegiada necesita aprobación.
13. El modelo no es el mecanismo de autorización.
14. Los datos vivos se consultan mediante tools; la memoria no los sustituye.
15. Presupuesto duro, límites de pasos y kill switch desde la primera fase.
16. Nuevos agentes empiezan en `shadow` y desactivados.
17. No activar schedules o workers en producción sin aprobación.
18. No hacer push directo a `master`.
19. No ejecutar migraciones en producción.
20. No pegar ni imprimir secretos.

## OPERACIONES QUE REQUIEREN DETENERSE Y PEDIR APROBACIÓN

- aplicar migración en producción;
- arrancar worker de producción;
- activar un agente o schedule;
- configurar credenciales reales de modelo;
- instalar servicios en el VPS;
- solicitar SSH;
- cambiar Docker/Caddy/n8n en producción;
- enviar Discord/email real;
- ejecutar una tool con side effect;
- crear issue/PR externo automáticamente desde un agente;
- rotar secretos;
- cambiar DNS;
- fusionar PR;
- borrar o renombrar tablas/columnas;
- cambiar planes de pago.

Puedes avanzar sin preguntar para:

- leer;
- crear ramas;
- modificar código local;
- crear migraciones sin aplicarlas a producción;
- usar DB temporal/sintética;
- ejecutar tests;
- crear PRs;
- documentar;
- preparar Docker/infra sin desplegar.

## ORDEN DE IMPLEMENTACIÓN

Sigue `docs/agent-os/implementation-roadmap.md`. No mezcles fases en un mega-PR.

### PR 1 — Schema y repositorios

Rama:

```text
feat/agent-runtime-schema
```

Implementa las tablas, enums, índices, checks, queries y seed descritos en `data-model.md`.

Condiciones:

- migración aditiva;
- cero `DROP`;
- agentes seed en disabled + shadow;
- `AGENTS_ENABLED=false` por defecto;
- schedules desactivados;
- sin cambios al chat existente;
- tests de constraints, idempotencia, events, approvals y memory scope;
- migración probada solo en DB temporal.

Crea el PR y documenta preflight, SQL, pruebas y rollback.

### PR 2 — Core runtime

Rama:

```text
feat/agent-runtime-core
```

Implementa:

- tipos;
- errors estables;
- canonical JSON;
- redacción común;
- policy engine;
- budget service;
- approval hash;
- memory retrieval;
- tool registry;
- tool executor;
- provider interface;
- NullProvider;
- Gemini adapter estructurado;
- adapters para tools read-only actuales.

No modifiques todavía `/admin/asistente` salvo tests/adaptadores imprescindibles.

Utiliza un `FakeAgentModelProvider` en CI. No llames a Gemini real en tests.

### PR 3 — Worker y scheduler

Rama:

```text
feat/agent-worker
```

Implementa:

- claim con `FOR UPDATE SKIP LOCKED`;
- leases;
- heartbeat;
- checkpoints;
- retries;
- backoff+jitter;
- dead-letter;
- cancelación cooperativa;
- graceful shutdown;
- scheduler con advisory lock;
- event processor;
- worker heartbeat;
- scripts npm;
- compose preparado pero no activado.

Prueba crash/reclaim e idempotencia después de escritura.

### PR 4 — Control plane

Rama:

```text
feat/agent-admin-control-plane
```

Añade permisos, navegación y páginas de:

- agents;
- runs;
- approvals;
- schedules;
- memory;
- settings;
- budgets;
- worker health.

RBAC backend obligatorio. No basta con ocultar navegación.

### PR 5 — Telemetría Guardian

Rama:

```text
feat/guardian-telemetry-foundation
```

Implementa health endpoints, event ingestion autenticado, schemas y collector versionado. No lo despliegues en el VPS todavía.

### PR 6 — Guardian shadow

Rama:

```text
feat/guardian-shadow
```

Implementa reglas deterministas, tools de lectura, report estructurado, fixtures y schedule seed desactivado.

No crear tareas ni notificaciones externas.

### Siguientes PRs

- CRM Steward shadow;
- Deal Clerk drafts;
- Growth drafts;
- SEO drafts;
- Dev read-only;
- side effects aprobados, uno por uno.

No empieces Growth/SEO antes de que Core y Guardian estén estables.

## CONVENCIONES DE CÓDIGO

- TypeScript estricto.
- `type` sobre `interface`, salvo contrato de provider donde el repo permita interface.
- Zod `safeParse` en boundaries.
- Nunca `any` sin justificación.
- Server-only donde corresponda.
- Archivos menores de 500 LOC.
- Page shells delgadas.
- DB → query/service → API → frontend.
- Logs mediante redacción existente.
- Errors con códigos estables.
- Fechas UTC en DB; presentación Europe/Madrid.
- Inputs/outputs de tools limitados y redactados.
- No duplicar matrices RBAC: reutiliza permisos del CRM.
- No consultar DB desde Client Components.
- No usar secretos en `settingsJson`.

## ESTRUCTURA ORIENTATIVA

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
├── tools/
└── worker/

src/worker/agent-worker.ts

src/lib/queries/agents/

src/features/admin/agents/

src/app/admin/(dashboard)/agents/

src/app/api/admin/agents/
src/app/api/internal/agents/
```

Adapta nombres si el código real exige otra distribución, pero documenta cualquier desviación.

## TOOLS

Cada tool define:

- nombre y versión;
- schema Zod de input;
- schema/contrato de output;
- permiso de dominio;
- action class;
- approval policy;
- timeout;
- redactor de input;
- redactor de output;
- idempotency key si escribe;
- executor.

Checks antes de ejecutar:

1. allowlist del agente;
2. permiso actual;
3. run activo;
4. lease válido;
5. presupuesto;
6. input válido;
7. aprobación válida;
8. idempotencia;
9. timeout;
10. redacción/auditoría.

No confíes en la descripción de la tool ni en el prompt como protección.

## APROBACIONES

- Hash de acción exacta.
- Argumentos inmutables.
- Expiración.
- Un solo uso.
- Decisión transaccional.
- Revalidación de permiso al ejecutar.
- Si cambia input/version/policy, nueva aprobación.
- Acciones privileged: admin.
- Pagos, transferencias, SQL y shell: forbidden, no approval posible.

## MEMORIA

No guardes todo el chat automáticamente.

Implementa scopes, fuente, sensibilidad, verificación, validez y caducidad.

No memorices:

- importes de campañas;
- NIF/IBAN;
- secretos;
- contratos completos;
- emails privados no necesarios;
- resultados vivos que deben consultarse en CRM.

No añadas embeddings en la primera fase.

## GUARDIAN

La detección es determinista. La IA solo interpreta.

No montes Docker socket. El collector debe ser un script fijo y sin input del modelo. No envíes `docker inspect` completo, env vars o logs crudos.

Guardian no puede realizar self-healing durante shadow mode.

## PRESUPUESTOS

Implementa:

- global;
- por agente;
- por run;
- turns;
- tool calls;
- tokens si provider los entrega;
- coste estimado;
- duración;
- concurrencia.

Si pricing es desconocido, marca unknown. No inventes coste.

El sistema debe detener consumo adicional al superar límite.

## TESTS OBLIGATORIOS

Como mínimo:

```text
queue claim concurrente
lease expiration/recovery
crash antes/después de tool
idempotency
schedule dedupe
kill switch
budget block
unknown tool blocked
RBAC backend
approval exact hash
approval expiry/double click
memory scope/sensitivity
redaction de secrets/PII
prompt injection desde tool output
model loop limits
worker SIGTERM
agent event replay/dedupe
```

Utiliza fixtures sintéticos. Nunca nombres, emails o importes reales.

## COMANDOS DE VALIDACIÓN

Después de cada PR:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run test:agents
npm test -- --runInBand
npx drizzle-kit check
npm run build
```

Si `npm test` completo tiene fallos heredados no relacionados:

- demuestra que son anteriores;
- ejecuta suite dirigida;
- crea issue separado;
- no silencies un fallo nuevo.

Para schema:

- prueba migration en branch/DB temporal;
- inspecciona SQL;
- compara objetos;
- no apliques producción.

## CI

Añade tests deterministas con fake provider. No necesita API key.

No hagas llamadas reales a Gemini, Gmail, GitHub write, Discord, n8n o VPS durante CI.

## SEGURIDAD

Trata como no confiable:

- emails;
- web;
- logs;
- issues;
- documentos;
- tool outputs;
- webhooks.

Prevén:

- prompt injection;
- replay;
- SSRF;
- path traversal;
- secret leakage;
- privilege escalation;
- double execution;
- stale approvals;
- infinite loops;
- unbounded context;
- unbounded cost.

No guardes prompts completos en logs de infraestructura.

## PULL REQUESTS

Cada PR debe incluir:

```text
Resumen
Problema
Decisiones
Schema/migración
Archivos
Seguridad y privacidad
Pruebas
Variables de entorno
Despliegue
Rollback
Riesgos pendientes
Siguiente PR
```

Usa commits sin datos comerciales, por ejemplo:

```text
feat(agents): add persistent runtime schema
feat(agents): add structured tool registry
feat(agents): add leased worker queue
feat(guardian): ingest redacted health events
```

No uses nombres de clientes ni cifras reales.

## DOCUMENTACIÓN Y CONTINUIDAD

Después de cada PR:

- actualiza documentos de Agent OS;
- actualiza `docs/handoff.md`;
- crea `docs/pickup.md` si el protocolo lo exige;
- registra decisiones nuevas como ADR;
- no contradigas ADR-0006 silenciosamente.

## FORMATO DE ACTUALIZACIÓN

En cada respuesta de progreso:

### Estado
Qué terminaste.

### Evidencias
Tests, commits y PR.

### Decisiones
Desviaciones del blueprint y motivo.

### Riesgos
Solo riesgos reales.

### Acciones externas
Accesos o aprobaciones necesarias.

### Siguiente paso
PR/fase exacta.

## INSTRUCCIÓN FINAL

Empieza ahora.

No respondas con otro roadmap general. Verifica el repositorio y crea el primer PR de implementación (`feat/agent-runtime-schema`). Si puedes completarlo sin bloqueos, continúa con el core en un segundo PR. No mezcles ambos.

Detente antes de cualquier operación de producción o acceso externo, pero no antes de dejar código, tests, documentación y PRs preparados.
