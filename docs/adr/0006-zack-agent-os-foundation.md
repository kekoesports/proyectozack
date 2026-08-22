---
summary: 'ADR: construir Zack Agent OS sobre el CRM existente con worker separado, PostgreSQL, tools tipadas y aprobación humana.'
read_when:
  - Changing the AI assistant architecture
  - Adding autonomous agents, background workers or agent tools
  - Considering Redis, Temporal, a hosted agent platform or direct infrastructure access
---

# ADR-0006 — Fundación de Zack Agent OS

- **Estado:** Propuesto
- **Fecha:** 2026-08-20
- **Decisores:** SocialPro
- **Ámbito:** CRM, asistente IA, automatización e infraestructura

## Contexto

SocialPro ya dispone de:

- un CRM propio con RBAC;
- un asistente persistente de solo lectura;
- herramientas de facturación, campañas, finanzas y conciliación;
- APIs de automatización idempotentes;
- n8n self-hosted;
- un VPS y un plan de migración desde Vercel/Neon.

Se quiere ampliar esta base para crear agentes internos que vigilen infraestructura, calidad del CRM, deals, leads, SEO y desarrollo. La alternativa sería contratar una plataforma de agentes generalista.

El asistente actual funciona dentro de una petición HTTP y solicita tools mediante tokens de texto `[TOOL:name]`. No tiene cola durable, schedules, leases, memoria curada, presupuestos, centro de aprobaciones ni recuperación de ejecuciones.

## Decisión

Construir **Zack Agent OS** como evolución aditiva del sistema actual con estas decisiones:

1. **Mismo repositorio y dominio.** No crear un SaaS paralelo ni otro CRM.
2. **Worker separado de Next.js.** Next.js actúa como control plane y un proceso Docker ejecuta trabajos asíncronos.
3. **PostgreSQL como cola y estado.** Usar leases, `FOR UPDATE SKIP LOCKED`, idempotencia y checkpoints. No añadir Redis/Temporal en el MVP.
4. **Tool registry tipado.** Inputs Zod, RBAC, action class, redacción, timeout e idempotency key. El nuevo runtime no parsea `[TOOL:*]`.
5. **Human-in-the-loop.** Acciones externas y privilegiadas se congelan, se aprueban en el CRM y se ejecutan una sola vez.
6. **Sin shell ni SQL arbitrarios.** Infraestructura se opera, si llega a habilitarse, mediante acciones allowlisted de un control service mínimo.
7. **Monitorización determinista.** Health checks, Uptime y collectors detectan; el agente interpreta.
8. **n8n conserva su función.** Entrega externa y workflows deterministas siguen en n8n; Zack no reemplaza n8n.
9. **Proveedor intercambiable.** Se mantiene Gemini como primer adaptador, pero el runtime usa una interfaz propia.
10. **Memoria curada.** No se copia automáticamente todo el chat; cada hecho tiene scope, fuente, sensibilidad, verificación y caducidad.
11. **Presupuesto y kill switch.** Límites globales/por agente/por run; desactivación inmediata.
12. **Rollout por modos.** Shadow → recommend → execute, con gates medidos.
13. **Compatibilidad.** Las tablas y la UI del asistente actual permanecen durante la transición.

## Consecuencias positivas

- Control sobre datos, permisos y costes.
- Integración nativa con el CRM.
- Auditoría y aprobación adaptadas al negocio.
- Menor dependencia de una plataforma externa joven.
- Reutilización de código, n8n, RBAC y APIs existentes.
- Worker recuperable y desplegable en el VPS.
- Capacidad de añadir agentes sin replicar infraestructura.

## Consecuencias negativas

- SocialPro asume mantenimiento del runtime.
- El coste de ingeniería supera una suscripción barata a corto plazo.
- Se necesita disciplina en tools, evals, presupuestos y operación.
- El VPS se vuelve más importante y exige backups/monitorización sólidos.
- La autonomía debe introducirse lentamente.

## Alternativas consideradas

### Plataforma de agentes alojada

**Descartada como base canónica.** Puede servir para un piloto, pero añade coste, dependencia, privacidad menos controlada y una integración menos precisa con el CRM.

### Solo n8n

**No suficiente como capa de agentes.** n8n sigue siendo adecuado para workflows deterministas, pero memoria, políticas, runs, aprobaciones y evaluación requieren un runtime propio.

### Ejecutar agentes dentro de API routes

**Descartado.** Timeouts, despliegues y recuperación de fallos hacen inadecuada una petición HTTP para ejecuciones largas.

### Redis + BullMQ

**Pospuesto.** Es una opción válida si PostgreSQL no soporta el volumen futuro, pero introduce otra dependencia antes de demostrarla necesaria.

### Temporal

**Pospuesto.** Ofrece garantías fuertes, pero es excesivo para el volumen y equipo iniciales.

### Base vectorial

**Pospuesta.** La primera memoria puede resolverse con PostgreSQL, scopes y búsqueda textual.

### Acceso root/Docker socket para Guardian

**Descartado.** Demasiado privilegio y superficie de ataque. Se usarán collectors y acciones cerradas.

## Reglas derivadas

- Ningún agente nuevo se activa directamente en execute mode.
- Ninguna tool reduce permisos existentes del CRM.
- Ningún side effect depende solo de que el modelo escriba “confirmado”.
- Los datos vivos se consultan mediante tools; no se confía en memoria.
- Los prompts no contienen secretos.
- El worker puede detenerse sin afectar al CRM.
- Las migraciones son aditivas y el rollback inicial es funcional, no destructivo.

## Criterios para revisar esta ADR

Reabrir si:

- la cola PostgreSQL no soporta el volumen o la recuperación requerida;
- se necesitan workflows de días/semanas con cientos de pasos;
- el mantenimiento del runtime supera claramente el valor;
- SocialPro convierte los agentes en un producto multi-tenant;
- requisitos regulatorios exigen otra arquitectura;
- se decide utilizar una plataforma externa como sistema principal.

## Documentación asociada

- `docs/agent-os/README.md`
- `docs/agent-os/architecture.md`
- `docs/agent-os/data-model.md`
- `docs/agent-os/agents-tools-policies.md`
- `docs/agent-os/implementation-roadmap.md`
- `docs/agent-os/claude-work-prompt.md`
