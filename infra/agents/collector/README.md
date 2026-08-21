# Collector de salud del VPS

**Preparado, no instalado.** Nada de esto está corriendo. Instalarlo requiere
acceso SSH al VPS, y eso es una decisión que aprueba una persona.

## Qué es

Un script fijo que cada cinco minutos mide el estado de la máquina y lo envía
firmado a `/api/internal/agents/events`. Es el ojo de Guardian.

```text
collect-system-health.sh                 el script
socialpro-guardian-collector.service     unidad systemd
socialpro-guardian-collector.timer       cada 5 min
```

## La decisión que lo define

**El script es fijo y no recibe entrada del modelo.** No tiene parámetros más
allá de su fichero de configuración, no ejecuta nada que le digan, y no hay
ninguna ruta por la que un agente pueda influir en lo que corre aquí.

Guardian **interpreta** señales; no las produce. La alternativa —darle una tool
que ejecute comandos en el VPS— convertiría una fuga de prompt en acceso a la
máquina. Ver ADR-0006.

## Qué envía

| Evento | Contenido |
|---|---|
| `system.disk` | % usado de `/` |
| `system.inodes` | % de inodos usados |
| `system.memory` | % de RAM y de swap |
| `system.load` | carga de 15 min y número de vCPU |
| `system.service` | nombre y estado de cada servicio de una **lista cerrada** |
| `backup.heartbeat` | antigüedad en horas del último backup |
| `app.deploy` | versión desplegada |

## Qué NO envía, y no es una omisión

- Logs, crudos o filtrados.
- Variables de entorno.
- `docker inspect` o cualquier volcado de configuración.
- Listados de procesos.
- Contenido de ficheros.
- Nombres de ficheros de backup — revelan la convención de nombrado y las fechas.
- IPs públicas.

Si algo de eso hiciera falta para diagnosticar, se añade **aquí**, con nombre y
apellidos y en un PR. No se manda "por si acaso".

## Umbrales

```text
disco     ≥ 80 % warning · ≥ 90 % critical
inodos    ≥ 80 % warning · ≥ 90 % critical
RAM       ≥ 85 % warning
RAM+swap  ≥ 90 % y swap ≥ 50 % → critical
backup    ≥ 26 h → high
servicio  inactivo → critical
```

Dos criterios detrás de estos números:

**El swap solo alarma acompañado de presión de memoria.** Una máquina con swap
usado y RAM libre lleva así desde el último pico y no es una incidencia.

**La carga se mide a 15 minutos, no a 1.** Un pico aislado no es un problema, y
alarmar por él enseña a ignorar las alarmas.

Los umbrales se cambian en el `.env` del collector, sin tocar el script.

## Seguridad

- **Usuario sin privilegios** (`guardian-collector`). Leer `/proc` y consultar
  systemd no necesita root.
- **`ProtectSystem=strict`**: todo el sistema en solo lectura.
- **`ReadOnlyPaths`** sobre el directorio de backups: comprueba la fecha, no
  toca nada.
- **`SystemCallFilter`** acotado a `@system-service` sin `@privileged`.
- **Bearer + HMAC** con ventana de replay de 5 minutos. El token vive en un
  fichero `0400` y nunca se imprime: `curl` va con `--silent` y jamás con
  `--verbose`, que volcaría las cabeceras.

## Instalación

Requiere SSH. No está hecho.

```bash
# 1. Usuario del servicio
sudo useradd --system --no-create-home --shell /usr/sbin/nologin guardian-collector

# 2. Script
sudo install -m 0755 collect-system-health.sh /usr/local/bin/

# 3. Configuración — el fichero con el token
sudo install -d -m 0755 /etc/socialpro
sudo touch /etc/socialpro/guardian-collector.env
sudo chown guardian-collector:guardian-collector /etc/socialpro/guardian-collector.env
sudo chmod 0400 /etc/socialpro/guardian-collector.env
```

Contenido de `/etc/socialpro/guardian-collector.env` (los valores reales **no**
van en el repositorio):

```bash
GUARDIAN_ENDPOINT=https://socialpro.es/api/internal/agents/events
GUARDIAN_TOKEN=            # = AGENT_INTERNAL_TOKEN de la app
GUARDIAN_HMAC_SECRET=      # = AGENT_EVENT_HMAC_SECRET de la app
GUARDIAN_SERVICES="socialpro-crm socialpro-n8n caddy"
GUARDIAN_BACKUP_DIR=/var/backups/socialpro
GUARDIAN_BACKUP_MAX_HOURS=26
GUARDIAN_VERSION=          # SHA del despliegue
```

```bash
# 4. Unidades
sudo install -m 0644 socialpro-guardian-collector.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload

# 5. Probar UNA vez antes de programarlo
sudo systemctl start socialpro-guardian-collector.service
sudo journalctl -u socialpro-guardian-collector.service -n 30

# 6. Solo si la prueba fue bien
sudo systemctl enable --now socialpro-guardian-collector.timer
```

## Comprobar que llega

```sql
select source, event_type, severity, occurred_at
from agent_events
where source = 'collector'
order by occurred_at desc
limit 20;
```

Un `401` en el journal significa token equivocado; un `503`, que la app no tiene
`AGENT_INTERNAL_TOKEN` configurado. Un `400` con `stale-timestamp` es el reloj
del VPS desajustado — conviene comprobar `timedatectl` antes de tocar nada más.

## Pararlo

```bash
sudo systemctl disable --now socialpro-guardian-collector.timer
```

Los eventos dejan de llegar. Nada más se ve afectado: la app, el CRM y n8n no
saben que el collector existe.
