---
summary: 'Índice y visión de Zack Agent OS: evolución del asistente actual hacia agentes internos seguros y auditables.'
read_when:
  - Planning autonomous or scheduled agents
  - Extending the current AI assistant
  - Implementing VPS, CRM, lead or SEO agents
  - Preparing the Zack Agent OS roadmap
---

# Zack Agent OS — visión y paquete de implementación

## Estado actual — 22-08-2026

El blueprint ya se materializó en seis fases: schema, runtime estructurado,
worker con leases, panel de control, ingesta autenticada de telemetría y
Guardian en shadow. Las tablas y los seis agentes existen en producción, pero
el sistema permanece **apagado por diseño**: agentes deshabilitados, rutinas
deshabilitadas, proveedor `null`, worker sin desplegar y collector sin instalar.

La fuente operativa vigente es [`runbook-operacion.md`](./runbook-operacion.md).
Este documento y el roadmap conservan las decisiones y el diseño que guiaron
la implementación; no deben interpretarse como una lista de piezas aún
pendientes.

## Objetivo

Convertir el asistente y las automatizaciones existentes de SocialPro en una plataforma interna de agentes especializada en la agencia.

No se pretende clonar una plataforma generalista como Skydive. El objetivo es construir una capa operativa propia que conozca el CRM, trabaje con permisos de SocialPro, utilice n8n como orquestador externo y mantenga el CRM como fuente única de verdad.

El sistema debe permitir que Pablo, Alfonso y el equipo puedan:

- consultar el estado real del negocio en lenguaje natural;
- recibir informes programados y alertas priorizadas;
- crear borradores de deals, leads, tareas y contenido;
- vigilar VPS, aplicación, PostgreSQL, n8n, backups, GitHub y, durante la transición, Vercel y Neon;
- detectar problemas de calidad en el CRM;
- preparar oportunidades comerciales y planes SEO;
- aprobar de forma explícita cualquier acción con efectos externos o privilegios elevados.

## Punto de partida real

El repositorio ya contiene una primera versión del núcleo que necesitamos:

- `src/db/schema/aiAssistant.ts`: hilos, mensajes y log de tools;
- `src/lib/services/ai-assistant/`: proveedor, guardrails, contexto, sanitización y orquestación;
- `src/lib/services/ai-assistant/tools/`: herramientas de campañas, facturación, finanzas y conciliación;
- `/admin/asistente`: interfaz de chat persistente;
- RBAC por rol;
- n8n self-hosted y APIs autenticadas de automatización;
- modelos de campañas, marcas, talentos, tareas, contratos, facturación y alertas.

El asistente actual es seguro por defecto y de solo lectura, pero todavía es síncrono, depende de una petición HTTP, utiliza tokens de texto del tipo `[TOOL:nombre]`, no dispone de cola de trabajos, rutinas, memoria curada, presupuestos, pausas por aprobación ni recuperación de ejecuciones.

## Resultado objetivo

```text
Entradas
CRM · chat · Discord · email · horarios · health checks · webhooks
                         │
                         ▼
                Zack Agent Runtime
cola PostgreSQL · políticas · memoria · presupuestos · aprobaciones
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Guardian      CRM Steward     Deal Clerk
          ▼              ▼              ▼
        Growth          SEO             Dev
                         │
                         ▼
Herramientas tipadas y limitadas
CRM API · n8n · GitHub · VPS telemetry · Google · Discord
```

## Principios no negociables

1. **El CRM es la fuente de verdad.** Los agentes no mantienen una copia paralela de campañas, importes o estados.
2. **La monitorización es determinista.** Uptime, health checks y métricas detectan fallos; la IA interpreta y prioriza.
3. **No existe una tool genérica de shell o SQL.** Solo funciones cerradas, tipadas y permitidas explícitamente.
4. **Los efectos externos requieren aprobación.** Enviar emails, reiniciar servicios, publicar o modificar información sensible no puede ejecutarse de forma silenciosa.
5. **PostgreSQL primero.** Cola, memoria, schedules y auditoría se implementan sobre la base existente; no se añade Redis ni una base vectorial en la primera etapa.
6. **Proveedor de modelo intercambiable.** Gemini puede seguir siendo el proveedor inicial, pero el runtime no debe quedar acoplado a un SDK concreto.
7. **Presupuesto duro y kill switch.** Cada agente tiene límites de ejecuciones/tokens y existe una desactivación global inmediata.
8. **Shadow mode antes de autonomía.** Todo agente nuevo funciona primero sin escribir ni notificar a terceros.
9. **Auditoría completa.** Cada run, paso, tool, aprobación, coste y error queda trazado con datos sensibles redactados.
10. **Despliegue incremental.** El chat actual sigue funcionando mientras el nuevo runtime se introduce por fases.

## Agentes previstos

| Agente | Misión inicial | Primer modo |
|---|---|---|
| **Zack Guardian** | Vigilar infraestructura, backups, n8n, CI y servicios | Solo lectura + alertas internas |
| **Zack CRM Steward** | Detectar deals bloqueados, datos incompletos y tareas vencidas | Solo lectura + propuestas |
| **Zack Deal Clerk** | Interpretar peticiones y crear borradores de deal | Escritura interna limitada |
| **Zack Growth** | Detectar, enriquecer y puntuar leads; preparar outreach | Borradores sin envío |
| **Zack SEO** | Analizar Search Console/Analytics y preparar briefs | Borradores sin publicación |
| **Zack Dev** | Resumir CI, errores, releases y deuda operativa | Solo lectura + issues propuestos |

## Frontera entre Zack, CRM y n8n

| Responsabilidad | Sistema responsable |
|---|---|
| Datos canónicos, validación, permisos y estados | CRM SocialPro |
| Interpretación, priorización y conversación | Zack Agent OS |
| Sincronizaciones deterministas y entrega externa | n8n |
| Detección de disponibilidad y métricas | Health checks / Uptime / collectors |
| Aprobación humana | Centro de aprobaciones del CRM |
| Base de datos y restricciones | PostgreSQL + Drizzle |
| Pagos, transferencias y decisiones legales | Humano autorizado; nunca el agente |

## Orden de desarrollo

1. **Core y gobierno:** cola, runs, tools tipadas, presupuestos, kill switch, aprobaciones y auditoría.
2. **Guardian en shadow mode:** métricas, health checks y resumen diario sin acciones.
3. **CRM Steward:** calidad operativa y sugerencias de tareas.
4. **Deal Clerk:** borradores idempotentes y aprobación humana.
5. **Growth y SEO:** leads y contenido en modo borrador.
6. **Acciones controladas:** únicamente después de medir precisión y estabilidad.

## Documentos de este paquete

- [`architecture.md`](./architecture.md): componentes, flujos y límites del sistema.
- [`data-model.md`](./data-model.md): tablas, enums, índices y semántica de la cola.
- [`agents-tools-policies.md`](./agents-tools-policies.md): agentes, tools, permisos, memoria y aprobación.
- [`implementation-roadmap.md`](./implementation-roadmap.md): PRs, archivos, tests, rollout y rollback.
- [`claude-work-prompt.md`](./claude-work-prompt.md): encargo autocontenido para Claude Work.
- [`../adr/0006-zack-agent-os-foundation.md`](../adr/0006-zack-agent-os-foundation.md): decisión de arquitectura.

## Baseline

Este paquete se preparó originalmente sobre `master` en el commit:

```text
8b0ab738dbc51a61268780ce1a693cd8e5f8fe99
```

Antes de implementar, el agente debe ejecutar `git fetch`, leer `CLAUDE.md`, `AGENTS.md`, `docs/roadmap-detailed.md`, `docs/ai-assistant.md`, `docs/ai-assistant-two-pass.md` y rebasar el plan contra el HEAD actual.

## Definición de éxito del MVP

El MVP se considera válido cuando:

- existe un worker separado de Next.js;
- las ejecuciones son persistentes, recuperables e idempotentes;
- Guardian produce un resumen diario basado en datos reales;
- ninguna tool de escritura puede ejecutarse sin la política correspondiente;
- el kill switch detiene nuevos runs en menos de un minuto;
- los presupuestos bloquean consumo adicional;
- todos los outputs sensibles se redactan;
- el CRM actual y `/admin/asistente` continúan funcionando;
- hay pruebas de fallo de worker, reintento, aprobación, idempotencia y presupuesto;
- el sistema puede desactivarse sin afectar a la web, el CRM ni n8n.
