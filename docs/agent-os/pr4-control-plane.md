---
summary: 'PR 4 de Zack Agent OS: permisos, panel de agentes, centro de aprobaciones, memoria, rutinas y salud del worker.'
read_when:
  - Working on the agents admin panel
  - Changing agent RBAC or the approval flow
  - Debugging a run stuck in waiting_approval or queued
---

# PR 4 — Control plane y centro de aprobaciones

Cuarta entrega. Hasta aquí el sistema podía ejecutar y recuperarse, pero no
había forma de mirarlo ni de decidir nada: las aprobaciones se creaban y nadie
podía firmarlas.

Sale de la rama de PR 3 (#310).

## Los dos huecos que cierra

No son extras. Sin ellos el sistema **aparenta** funcionar y no funciona.

### 1. Aprobar no hacía nada

`decideApproval` solo tocaba `agent_approvals`. La ejecución seguía en
`waiting_approval` y el claim del worker solo mira `queued` y
`retry_scheduled`: el humano firmaba y la ejecución se quedaba parada para
siempre.

`decideApprovalAndResumeRun` escribe las dos cosas **en la misma transacción**:
la decisión y el movimiento de la ejecución. Aprobar la devuelve a la cola;
rechazar la cancela con `completed_at` en el mismo `UPDATE` —el CHECK no admite
un estado terminal sin fecha ni por un instante—.

Separarlas dejaría dos estados imposibles de arreglar solos: una aprobación
concedida con la ejecución parada, o una ejecución reencolada sin permiso para
actuar.

### 2. Cada firma gastaba un reintento

El claim hace `attempt = attempt + 1` siempre y filtra `attempt < max_attempts`.
Una ejecución que pasa tres veces por aprobación agotaba sus tres intentos sin
que hubiera fallado nada, y acababa en `queued` con los intentos gastados: una
fila que el claim ya no coge y que `recoverExpiredLeases` tampoco ve, porque
solo mira las `running`. Un huérfano invisible.

**Esperar una firma humana no es un fallo.** Al reencolar se resta uno para
compensar el incremento que hará el claim, y la lista de ejecuciones marca
aparte las que sí se quedaron atascadas, con un botón para devolverlas a la cola
con un intento más — manual a propósito: subir el límite solo convertiría el
tope de reintentos en una sugerencia.

## Permisos

```text
agents:         read · write · approve · manage · audit
infrastructure: read · operate
```

`brand` **no aparece en ninguna acción de ninguno de los dos**. Es un rol
externo y el panel expone ejecuciones, memoria y datos operativos de toda la
agencia. Hay un test que lo vigila.

`manage` es solo de `admin`: encender un agente o subirlo a `execute` es la
decisión con más consecuencias del panel.

### Aprobar exige tres condiciones, no una

1. **`agents:approve`** — permiso para entrar al centro de aprobaciones.
2. **`canApproveActionClass`** — las acciones `privileged` son solo de `admin`.
   Un `manager` con `agents:approve` no puede firmar un reinicio de servicio.
3. **El permiso de dominio de la tool**, revalidado contra el rol de **ahora**.
   El snapshot guardado en `required_permission_*` es auditoría: dice qué se
   pidió entonces, no qué puede hacer quien firma hoy.

Ocultar el botón en la UI no cuenta como ninguna de las tres.

## Páginas

```text
/admin/agents               catálogo, estado y autonomía
/admin/agents/runs          ejecuciones, con desenlaces desconocidos y atascadas
/admin/agents/runs/[id]     timeline completa: pasos, tools y aprobaciones
/admin/agents/approvals     centro de aprobaciones
/admin/agents/schedules     rutinas
/admin/agents/memory        memoria curada
/admin/agents/settings      presupuesto, kill switch y salud del worker
```

Page shells finas; los componentes en `src/features/admin/agents/`. Server
Components para leer; el único cliente es `ActionButton`, que invoca la Server
Action y enseña lo que respondió.

## Decisiones de interfaz

**Un desenlace desconocido se pinta como alarma**, aunque la ejecución figure
como fallida. Un fallo dice "no pasó nada"; esto dice "no sabemos si pasó", y
solo el segundo pide que alguien vaya a comprobarlo. En la ficha de la ejecución
sale además un aviso que explica por qué no se ha reintentado.

**El kill switch global se muestra, no se toca.** `AGENTS_ENABLED` es una
variable de entorno y se cambia en el despliegue. Fingir un interruptor que no
apaga nada sería peor que no tenerlo; el que sí se acciona es el estado de cada
agente, y se consulta en cada vuelta del worker.

**Los costes con tarifa desconocida llevan `≥`.** Un total que incluye consumos
sin precio conocido es una cota inferior, no una cifra.

**Los JSON van en `<details>` cerrados.** El resultado de una tool puede traer
datos de negocio; aunque estén redactados, no tienen por qué estar a la vista de
quien solo quería ver por qué falló algo.

**Las acciones irreversibles piden confirmación escrita.** Activar un agente,
subirlo a `execute` y aprobar una acción. No sustituye a ningún control del
servidor: solo evita el clic accidental.

**Una rutina activa de un agente apagado sale avisada.** Se dispararía y la
ventana se descartaría: parece que funciona y no hace nada, que es peor que
estar desactivada.

## Pruebas

```bash
npm run test:agents
```

| Suite | Cubre |
|---|---|
| `agent-admin-rbac` | `brand` fuera, `manage` solo admin, un `manager` no aprueba `privileged`, las acciones nuevas no se colaron en otros módulos |
| `agent-admin-approve-resume` | Aprobar reencola, no gasta intento y suelta el lease; rechazar cancela con `completed_at` en el mismo `UPDATE`; una decidida o vencida no mueve nada |
| `agent-admin-format` | Coste con `≥`, tonos de estado, los tres códigos de desenlace desconocido, salud del worker |

**Lo que no se verifica**, y hay que probar a mano antes de usar el panel:

- el redirect 403 de `requirePermission` para un usuario sin permiso —redirige
  lanzando y necesita un servidor corriendo—;
- que la transacción de `decideApprovalAndResumeRun` sea atómica de verdad
  contra Postgres;
- que la ejecución reencolada la recoja el worker;
- que ningún dato sensible acabe en el HTML.

Es la misma limitación de PR 1-3: no hay Postgres ni servidor aquí. Las
aserciones de RBAC y de reencolado, que son la mitad valiosa, sí funcionan sin
navegador.

## Riesgos pendientes

1. **Reanudar reejecuta desde el principio.** `stateJson` existe en el schema
   pero nadie lo lee ni lo escribe: `runAgentLoop` siempre empieza con el
   mensaje inicial y el contador de turnos a cero. Las lecturas se repiten
   (inofensivo) y la acción aprobada se vuelve a proponer — funciona porque el
   hash coincide y la aprobación existe, pero funciona **por casualidad**, y el
   límite de turnos se aplica por reanudación en vez de por ejecución.
2. **Activar una rutina no es un botón.** Calcular la próxima ventana necesita
   el parser de cron, que vive en el worker. Desde el panel solo se desactiva;
   activar pasa por `npm run agents:schedules:tick`.
3. **Crear memoria a mano no tiene formulario.** La Server Action existe y está
   probada; falta la pantalla.
4. **El rol de un run manual sigue siendo el de sistema.** El panel ya tiene
   sesión, así que ahora sí se podría heredar el del autor — no se ha hecho en
   este PR para no mezclarlo con lo demás.

## Siguiente PR

`feat/guardian-telemetry-foundation` — health endpoints, ingestión autenticada
de eventos con HMAC y ventana de replay, y el collector del VPS. Preparado, sin
desplegar.
