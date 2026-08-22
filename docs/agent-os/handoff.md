---
summary: 'Handoff operativo actual de Zack Agent OS después de implementar el blueprint.'
read_when:
  - Picking up Zack Agent OS work
  - Reviewing Agent OS status
  - Preparing the first production activation
---

# Handoff — Zack Agent OS

## Estado

El blueprint documental se implementó en seis fases y ya forma parte del
producto. A 22-08-2026:

- las diez tablas `agent_*` existen en producción;
- los seis agentes están sembrados como `disabled` y `shadow`;
- Guardian tiene reglas, prompt, cuatro tools de lectura y dos rutinas;
- el control plane y las aprobaciones existen en `/admin/agents`;
- el worker y el collector están versionados, pero no desplegados;
- no hay proveedor real asignado: todos usan `model_provider='null'`;
- ninguna rutina está habilitada y no hay autonomía activa.

## Próximo trabajo exacto

La primera activación debe limitarse a **Guardian en shadow** y respetar el
orden de [`runbook-operacion.md`](./runbook-operacion.md):

1. instalar el collector y comprobar que llegan eventos redactados;
2. desplegar el worker con `AGENTS_ENABLED=false` y comprobar su heartbeat;
3. asignar Gemini a Guardian mediante catálogo + seed versionado;
4. encender el worker y activar solo Guardian, manteniendo `shadow`;
5. habilitar únicamente la rutina diaria de las 08:30;
6. evaluar sus informes durante al menos 14 días antes de plantear side effects.

## Gaps conocidos

- No existe botón ni endpoint de «ejecutar ahora»; solo schedules y eventos.
- CRM Steward y Deal Clerk reutilizan algunas tools, pero aún no tienen prompt
  ni rutinas propios.
- Growth, SEO y Dev son reservas de catálogo, no agentes funcionales.
- Worker y collector dependen de que la infraestructura del VPS esté validada.

## Límites que se mantienen

- Sin shell, SQL libre ni Docker socket para el modelo.
- Toda acción externa o privilegiada requiere aprobación humana.
- El CRM sigue siendo la fuente de verdad y n8n conserva sincronizaciones
  deterministas.
- El asistente actual `/admin/asistente` no se sustituye durante el rollout.
- Ante cualquier duda: `disabled`, `shadow` y `AGENTS_ENABLED=false`.
