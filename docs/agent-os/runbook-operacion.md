# Zack Agent OS — operación

**Estado a 21-08-2026: montado y apagado.** Las seis fases de código están en
producción, las tablas existen, los agentes están sembrados. Nada se ejecuta.

Este documento dice tres cosas, en este orden: qué hay realmente, qué hace falta
para encenderlo, y cómo es el día a día una vez encendido. Es autocontenido a
propósito; el blueprint explica las decisiones de diseño, pero no es necesario
para operar el sistema.

---

## 1. Qué hay, exactamente

| Pieza | Estado | Dónde se comprueba |
|---|---|---|
| 10 tablas `agent_*` | creadas | migración 0124, verificada en la base |
| 6 agentes | `disabled` + `shadow`, `model_provider='null'` | `/admin/agents` |
| 2 rutinas de Guardian | `enabled=false`, `next_run_at=null` | `/admin/agents/schedules` |
| Worker | **no desplegado** en ningún sitio | `agent_worker_heartbeats` |
| Collector del VPS | **no instalado** | `agent_events` está vacía |
| Proveedor de modelo | ninguno (`GEMINI_API_KEY` vacía) | `/admin/agents/settings` |

Los seis agentes no son igual de maduros. Solo **Guardian** tiene herramientas
propias:

- `guardian` — 4 tools de lectura (`getSystemHealthSnapshot`,
  `getOpenOperationalIncidents`, `getAgentWorkerHealth`, `getAgentQueueHealth`),
  prompt, reglas deterministas y dos rutinas. **Es el único que puede producir
  algo útil hoy.**
- `crm-steward`, `deal-clerk` — alcanzan tools de lectura del CRM que ya
  existían (campañas, márgenes, alertas financieras), pero no tienen prompt
  propio ni rutinas.
- `growth`, `seo`, `dev` — solo `getCrmHelpContext`. Son cáscaras: existen en la
  base para reservar el hueco, y sus herramientas llegan en fases posteriores.

## 2. De dónde sale una ejecución

Hay **dos** orígenes, y ninguno es un botón:

1. **Una rutina habilitada** (`agent_schedules.enabled = true`) que le toca por
   cron.
2. **Un evento entrante** en `agent_events` con severidad suficiente.

No existe "ejecutar ahora" en el panel, ni ruta API para encolar a mano. Es
deliberado —una ejecución tiene que ser trazable a una causa— pero conviene
saberlo antes de buscar el botón: no está escondido, no está.

## 3. Encenderlo — en este orden

El orden importa. Está puesto de forma que **cada paso se pueda comprobar antes
de dar el siguiente**, no en el orden en que se escribió el código.

### Paso 1 — El collector en el VPS

Sin esto, `agent_events` sigue vacía y Guardian escribe informes en blanco: tres
de sus cuatro tools leen de ahí. Es lo primero, no lo último.

```bash
cp infra/agents/collector/collect-system-health.sh /usr/local/bin/
cp infra/agents/collector/socialpro-guardian-collector.service /etc/systemd/system/
cp infra/agents/collector/socialpro-guardian-collector.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now socialpro-guardian-collector.timer
```

Necesita `AGENT_INTERNAL_TOKEN` y `AGENT_EVENT_HMAC_SECRET` configurados en el
VPS **y** en Vercel: el collector firma, `/api/internal/agents/events` verifica.
Ver `infra/agents/collector/README.md`.

**Se comprueba así:** `select count(*) from agent_events;` deja de ser 0.

### Paso 2 — El worker

```bash
docker compose -f infra/agents/compose.yaml up -d --build
```

Antes hay que copiar `infra/agents/env.example` a `infra/agents/.env` y rellenar
`DATABASE_URL`. Con `AGENTS_ENABLED=false` en ese `.env`, el worker arranca, no
procesa nada y lo dice en el log. Es un estado válido: sirve para comprobar que
se conecta a la base antes de encenderlo.

**Se comprueba así:** `/admin/agents/settings` → «workers vivos: 1».

### Paso 3 — Un modelo para Guardian

Los seis están con `model_provider='null'`, que falla en cerrado sin pedir
herramientas. Darle un modelo **es un cambio de código, no un UPDATE**:
`scripts/seed-agent-definitions.ts` incluye `modelProvider` y `modelName` en su
`onConflictDoUpdate`, así que cualquier cambio hecho a mano en la base se
revierte la próxima vez que alguien ejecute `npm run seed:agents`.

Lo correcto: editar la entrada de `guardian` en `src/lib/agents/catalog.ts`
(`modelProvider: 'gemini'`, `modelName`), PR, deploy, `npm run seed:agents`. Y
`GEMINI_API_KEY` en el `.env` del worker.

### Paso 4 — Activar Guardian, sin sacarlo de shadow

`/admin/agents` → Guardian → estado `active`. **El modo se queda en `shadow`**:
razona, deja traza y no escribe ni notifica nada.

### Paso 5 — Habilitar la rutina diaria

`/admin/agents/schedules` → `guardian-daily` (08:30, Europe/Madrid) → habilitar.
La semanal puede esperar a que la diaria lleve unos días.

---

## 4. El día a día — después

Mientras Guardian esté en shadow, **el trabajo diario es leer, no aprobar**.
Cinco minutos:

1. **`/admin/agents/runs`** — ¿corrió la de las 08:30? ¿En qué acabó?
2. **Abrir el informe** — y hacerse la única pregunta que importa en shadow:
   *¿esto que dice era verdad?* Un hallazgo inventado, o uno real que se le
   escapó, son el dato que decide si algún día sale de shadow.
3. **`/admin/agents/settings`** — workers vivos y gasto del mes.

**La cola de aprobaciones estará vacía, y es lo correcto.** Un agente en shadow
no produce aprobaciones porque no intenta ninguna acción con efecto. Página
vacía ≠ página rota.

### Cuándo dejar de leer todos los días

`src/lib/agents/guardian/definition.ts` lleva escritos los criterios para
sacarlo de shadow. Resumidos: **14 días mínimo**, cero secretos expuestos en los
informes, falsos positivos críticos por debajo del umbral, todos los incidentes
reales detectados, coste dentro de presupuesto, y una revisión humana de una
muestra. Sin medir eso, lo único que se tendría es «parece que funciona».

### Cuando algo va mal

| Síntoma | Dónde mirar | Acción |
|---|---|---|
| «workers vivos: 0» | `agent_worker_heartbeats` | el contenedor murió; los leases vencen solos y otro worker las recogería |
| Una ejecución atascada | `/admin/agents/runs/[id]` | botón **desatascar** (le da un intento más) |
| Una ejecución que no debería seguir | ídem | botón **cancelar** (se atiende entre pasos, nunca a mitad de una escritura) |
| `resultado desconocido` | ídem | **alguien tiene que ir a comprobarlo a mano**: significa que no se sabe si la acción llegó a ocurrir |
| Gasto disparado | `/admin/agents/settings` | poner el agente en `disabled` |

### Apagarlo

Lo más rápido, y sin entrar al VPS: `/admin/agents` → el agente → `disabled`. El
estado se consulta en cada vuelta del bucle, así que surte efecto en menos de un
ciclo de sondeo. Parar el worker no afecta a la web, al CRM ni a n8n.

---

## 5. La trampa de `AGENTS_ENABLED`

Hay **dos procesos distintos** que leen esa variable de **dos sitios distintos**:

- **El worker** (contenedor Docker, `infra/agents/.env`) — aquí es donde
  realmente decide si se procesa algo.
- **La web** (Vercel) — aquí solo decide **qué badge pinta el panel**. Como no
  hay ninguna ruta de encolado desde la web, en Vercel la variable es
  informativa.

Consecuencia: si están descuadradas, **el panel miente**. Con `false` en Vercel
y `true` en el worker, `/admin/agents/settings` dirá «nada se encola ni se
ejecuta» mientras el worker ejecuta. Ponerlas iguales no es cosmético.

Solo la cadena exacta `true` enciende. `True`, `1` o vacío dejan el worker
arrancado sin procesar nada.

---

## 6. Referencias

- `docs/adr/0006-zack-agent-os-foundation.md` — decisiones de arquitectura
- `docs/agent-os/pr1-runtime-schema.md` … `pr6-guardian-shadow.md` — qué hizo
  cada fase y cómo revertirla
- `infra/agents/README.md` — despliegue del worker
- `infra/agents/collector/README.md` — collector del VPS
