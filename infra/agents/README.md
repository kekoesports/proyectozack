# Worker de agentes — infraestructura

**Preparado, no desplegado.** Nada de este directorio está corriendo en ningún
sitio. Existe para que arrancarlo sea una decisión de cinco minutos y no un
proyecto, pero arrancarlo es una acción que aprueba una persona.

## Qué hay aquí

```text
compose.yaml    servicio Docker del worker
Dockerfile      imagen propia, sin el build de Next.js
env.example     plantilla de variables (copiar a .env)
```

Este directorio **no toca** `infra/README.md`, `infra/crm/` ni
`infra/edge/Caddyfile`: esos ficheros son de la rama `infra/vps-compose`, que
va por su cuenta. Cuando se mergee, el índice general puede enlazar aquí.

## Decisiones

**El worker no publica puertos.** No atiende peticiones: sondea la base y llama
a APIs externas. Un puerto abierto sería superficie de ataque sin función.

**Imagen propia, no la de la web con otro comando.** El worker no necesita el
build de Next.js, ni sus assets, ni el servidor HTTP.

**Sin Postgres propio.** Se engancha a la red del stack del CRM porque la cola
vive en esa base. `networks.crm.external: true` significa que este proyecto no
la crea ni la borra.

**`dumb-init` como PID 1.** Sin él, Node no recibe SIGTERM como se espera y el
apagado ordenado —el que suelta los leases— no llega a ejecutarse. El resultado
sería que cada despliegue deja las ejecuciones en curso congeladas hasta que
vence el lease.

**Usuario sin privilegios.** El worker no escribe en disco ni necesita root.

**Sin Docker socket.** Guardian vigilará infraestructura mediante collectors y
acciones cerradas, nunca con acceso al demonio. Ver ADR-0006.

## Salud

No hay endpoint de salud del worker, y es deliberado: `/api/health/live` es de
la aplicación web. La salud del worker se mira en `agent_worker_heartbeats`,
que además se ve desde el CRM sin entrar al VPS.

```sql
select worker_id, status, current_run_id, last_heartbeat_at
from agent_worker_heartbeats
order by last_heartbeat_at desc;
```

Un `last_heartbeat_at` de hace más de dos minutos con `status = 'healthy'`
significa que el proceso murió sin apagarse ordenadamente. Los leases de sus
ejecuciones vencerán y otro worker las recogerá.

## Antes de arrancarlo — lista de comprobación

Estado a 21-08-2026:

1. ✅ Migración `0124` aplicada en producción (verificada en la base).
2. ✅ `npm run seed:agents` ejecutado — los 6 agentes existen.
3. ❌ `.env` creado a partir de `env.example`, con `DATABASE_URL`.
4. ❌ Red `socialpro-crm_default` existente (la crea el compose del CRM).
5. ❌ **Decisión explícita** de poner `AGENTS_ENABLED=true`.
6. ❌ Al menos un agente con `status = 'active'` — se siembran todos en `disabled`.

Con los pasos 1-4 hechos y el 5 sin hacer, el worker arranca, no procesa nada y
lo dice en el log. Es un estado válido y seguro para desplegarlo antes de
decidir encenderlo.

La secuencia completa de encendido, con el collector y el proveedor de modelo,
está en `docs/agent-os/runbook-operacion.md`.

```bash
docker compose -f infra/agents/compose.yaml up -d --build
docker compose -f infra/agents/compose.yaml logs -f agent-worker
```

## Cómo pararlo

```bash
docker compose -f infra/agents/compose.yaml stop agent-worker
```

O sin tocar el contenedor, que es más rápido y no requiere acceso al VPS:

```sql
update agent_definitions set status = 'disabled';
```

El kill switch se consulta en cada vuelta del bucle, así que el efecto tarda
menos que un ciclo de sondeo. Parar el worker **no afecta** a la web, al CRM ni
a n8n: son procesos independientes.
