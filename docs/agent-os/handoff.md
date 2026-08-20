---
summary: 'Handoff operativo del blueprint Zack Agent OS y siguiente acción para Claude Work.'
read_when:
  - Picking up Zack Agent OS work
  - Reviewing PR 304
  - Starting the runtime schema implementation
---

# Handoff — Zack Agent OS

## Estado

Blueprint documental completado en:

```text
branch: docs/zack-agent-os-blueprint
PR: https://github.com/kekoesports/proyectozack/pull/304
head: 7d1f4c696209e449ce304c9f4d0ffd652033eb33
base observado: 8b0ab738dbc51a61268780ce1a693cd8e5f8fe99
```

El PR solo contiene documentación y no modifica producción.

## Documentos

```text
docs/agent-os/README.md
docs/agent-os/architecture.md
docs/agent-os/data-model.md
docs/agent-os/agents-tools-policies.md
docs/agent-os/implementation-roadmap.md
docs/agent-os/claude-work-prompt.md
docs/adr/0006-zack-agent-os-foundation.md
```

## Decisiones cerradas

- Evolucionar el asistente existente; no crear una aplicación paralela.
- Worker separado de Next.js.
- PostgreSQL como queue/state del MVP.
- n8n conserva integraciones deterministas.
- Tool registry estructurado y Zod.
- Human approval para side effects y privilegios.
- Sin shell, SQL libre, Docker socket, Redis, Temporal o vector DB en el MVP.
- Gemini como adaptador inicial, con provider interface propia.
- Agentes desactivados y en shadow mode por defecto.
- Presupuesto duro, límites y kill switch desde la base.
- Compatibilidad aditiva con `/admin/asistente`.

## Próximo trabajo exacto

1. Revisar y fusionar PR 304 o usar la rama como fuente.
2. Abrir `docs/agent-os/claude-work-prompt.md`.
3. Ejecutar ese encargo en Claude Work.
4. Primer PR de código:

```text
feat/agent-runtime-schema
```

5. Ese PR debe incluir únicamente:
   - schema aditivo;
   - migración no destructiva;
   - repositories/queries;
   - seed idempotente;
   - flags/env fail-closed;
   - tests de constraints/idempotencia/approval/memory/event;
   - documentación y rollback.
6. No implementar el worker en el mismo PR.
7. No aplicar la migración a producción.

## Gate para continuar

No empezar `feat/agent-runtime-core` hasta que:

- `drizzle-kit check` esté limpio;
- la migración haya sido probada en DB temporal;
- no exista `DROP` inesperado;
- el seed sea idempotente;
- los agentes estén disabled/shadow;
- el chat actual siga intacto;
- PR 1 tenga rollback funcional.

## Accesos externos

No se necesita acceso al VPS para PR 1-4.

Solicitar SSH solo al preparar/desplegar telemetría Guardian. No pedir passwords por chat; utilizar clave pública y acceso temporal.

No se necesita una API key real en CI. Utilizar fake provider.

## Riesgos a vigilar

- El repositorio avanza rápidamente; siempre rebasar el plan contra HEAD actual.
- La migración al VPS puede cambiar `src/lib/db.ts`; mantener repository abstraction.
- No duplicar permisos ni queries de negocio.
- No convertir el runtime nuevo en sustituto inmediato del chat actual.
- No mezclar la migración de hosting con el primer PR de schema.
- No activar autonomía antes de Guardian shadow y evals.
