---
summary: 'PR 5 de Zack Agent OS: health endpoints, ingestión firmada de eventos y collector del VPS.'
read_when:
  - Installing or debugging the VPS collector
  - Changing agent event ingestion or its auth
  - Wiring Uptime Kuma or n8n to the agent event inbox
---

# PR 5 — Telemetría de Guardian

Quinta entrega: los ojos. Health endpoints, ingestión autenticada de señales y
el collector del VPS.

**Nada está desplegado ni instalado.** Los endpoints existen pero fallan en
cerrado sin secretos configurados, y el collector requiere SSH para instalarse —
una decisión que aprueba una persona.

Sale de la rama de PR 4 (#311).

## Health endpoints

```text
/api/health/live    ¿está vivo el proceso?
/api/health/ready   ¿puede atender peticiones?
```

**`/live` no toca la base de datos, y eso es el punto entero.** Docker reinicia
el contenedor cuando este check falla; si comprobara Postgres, una caída de la
base haría que Docker reiniciara en bucle un contenedor perfectamente sano, y al
volver la base se encontraría con un servicio que lleva veinte reinicios.

`/ready` sí comprueba base y migraciones, con timeout de 2 s por comprobación —
un check colgado es peor que uno que dice "no listo", porque el balanceador no
recibe respuesta y decide por su cuenta— y devuelve 503 para que lo saquen de
rotación sin reiniciarlo.

Ninguno expone versiones, cadenas de conexión ni nombres de host: un endpoint de
salud es público de hecho aunque no lo sea de derecho.

## Ingestión de eventos

```text
POST /api/internal/agents/events      señales externas
POST /api/internal/agents/heartbeat   latidos de workers y collectors
```

Cinco filtros antes de que nada llegue a la base:

1. **Tamaño**, antes de parsear. Un JSON de 50 MB no debe llegar al parser.
2. **Bearer + HMAC + ventana de replay**, sobre el **texto crudo**. Parsear y
   volver a serializar cambiaría los bytes y la firma no cuadraría.
3. **Zod con allowlist de tipos.** Un `eventType` desconocido se rechaza en vez
   de guardarse "por si acaso": añadir uno obliga a pensar qué regla lo procesa.
4. **Redacción**, con el mismo redactor que el resto del runtime.
5. **Deduplicación** por `event_key`, que impone el índice único de PR 1.

### Por qué dos capas de autenticación

| Capa | Contra qué protege |
|---|---|
| **Bearer** (`AGENT_INTERNAL_TOKEN`) | Quién llama |
| **HMAC + timestamp** (`AGENT_EVENT_HMAC_SECRET`) | Que el cuerpo no se ha tocado y que no es una petición vieja reenviada |

Un bearer sacado de un log permite reenviar la misma alerta mil veces; la firma
con ventana temporal de 5 minutos, no. Y el bearer se comprueba **antes** que el
HMAC: calcular una firma por cada petición sin credencial sería trabajo regalado
a quien las envíe.

El token es deliberadamente **distinto** de `AUTOMATION_API_TOKEN`: n8n y los
collectors del VPS no comparten superficie ni rotación, así que filtrar uno no
compromete al otro.

El heartbeat lleva solo bearer, sin HMAC: no transporta nada que importe
falsificar —lo peor que consigue quien tenga el token es que el panel muestre un
worker que no existe— y exigir firma complicaría el collector sin ganar nada.

## El collector

```text
infra/agents/collector/
├── collect-system-health.sh
├── socialpro-guardian-collector.service
├── socialpro-guardian-collector.timer
└── README.md
```

**Script fijo, sin entrada del modelo.** No tiene parámetros más allá de su
fichero de configuración, no ejecuta nada que le digan, y no hay ruta por la que
un agente pueda influir en lo que corre. Guardian **interpreta** señales; no las
produce. La alternativa —una tool que ejecute comandos en el VPS— convertiría
una fuga de prompt en acceso a la máquina.

Envía: disco, inodos, memoria y swap, carga, estado de servicios de una **lista
cerrada**, antigüedad del último backup y versión desplegada.

**No envía** logs, variables de entorno, `docker inspect`, listados de procesos,
contenido de ficheros, nombres de ficheros de backup ni IPs públicas. Hay tests
que lo comprueban leyendo el propio script.

Corre como usuario sin privilegios, con `ProtectSystem=strict`, `ProtectHome`,
`NoNewPrivileges`, `SystemCallFilter` acotado y `ReadOnlyPaths` sobre el
directorio de backups.

### Dos umbrales que merecen explicación

**El swap solo alarma acompañado de presión de memoria.** Una máquina con swap
usado y RAM libre lleva así desde el último pico y no es una incidencia.

**La carga se mide a 15 minutos, no a 1.** Un pico aislado no es un problema, y
alarmar por él enseña a ignorar las alarmas.

## Pruebas

| Suite | Cubre |
|---|---|
| `agent-telemetry-auth` | Bearer, firma sobre el cuerpo, timestamp dentro de lo firmado, replay en las dos direcciones, orden de comprobación, fail-closed |
| `agent-telemetry-schema` | Allowlist de tipos, topes de tamaño y anidamiento, defaults; y que el script del collector no vuelque logs, env, procesos ni use `curl -v` |

**Lo que no se verifica** —misma limitación de PR 1-4—: que los endpoints
respondan de verdad end-to-end, que `/ready` detecte una base caída, y que el
collector funcione en un VPS real. Requiere servidor y máquina; está en la lista
de comprobación del README del collector.

## Variables de entorno

Ninguna nueva: `AGENT_INTERNAL_TOKEN` y `AGENT_EVENT_HMAC_SECRET` se declararon
en PR 1 y siguen siendo opcionales. Sin ellas los endpoints responden **503**.

Generar con `openssl rand -hex 32`. **No se piden ni se envían por chat.**

## Despliegue

Nada desplegado. Para que la ingestión funcione hacen falta las dos variables en
el proyecto, y para el collector, SSH al VPS y los pasos del README.

Este PR **no toca** `infra/README.md`, `infra/crm/` ni `infra/edge/Caddyfile`.

## Rollback

Los endpoints sin secretos configurados ya están inertes: responden 503. Para el
collector, `systemctl disable --now socialpro-guardian-collector.timer`. Y si
hace falta quitar el código, revertir el PR: nada más depende de él.

## Riesgos pendientes

1. **Sin rate limit propio.** La ventana de replay y el tope de tamaño acotan el
   daño, pero un collector mal configurado puede llenar `agent_events` de filas
   `info`. La retención de eventos está en la propuesta de PR 1 §15 y sigue sin
   aprobarse.
2. **`/ready` no comprueba que las migraciones estén al día**, solo que la tabla
   de control exista. Compararlas exigiría leer el journal desde el runtime, y
   un despliegue a medias daría un falso rojo.
3. **El reloj del VPS importa.** Un desfase mayor de 5 minutos hace que todos
   los eventos se rechacen con `stale-timestamp`. El README lo dice, pero es la
   causa menos evidente de un collector que "no funciona".
4. **Uptime Kuma sigue sin configurar.** El endpoint acepta sus eventos; falta
   el monitor externo, que además debería vivir fuera del VPS.

## Siguiente PR

`feat/guardian-shadow` — reglas deterministas, tools de lectura de Guardian,
informe estructurado, fixtures sintéticos y rutina sembrada **desactivada**.
Durante shadow mode no envía Discord ni crea tareas.
