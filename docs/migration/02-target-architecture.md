# Arquitectura objetivo

> Redactado el 2026-08-21. **Sin validar contra el VPS**: no hay acceso SSH
> todavía, así que las decisiones de dimensionado están pendientes de la
> auditoría de capacidad (Fase 0).

## Panorama

```
Internet
   │
   ▼
Caddy compartido  :80 :443          ← el único que publica puertos
   ├── socialpro.es          →  app CRM (Next.js)
   ├── www.socialpro.es      →  redirección canónica
   ├── staging.socialpro.es  →  app staging
   ├── n8n.socialpro.es      →  n8n (ya existe, no se toca)
   └── status.socialpro.es   →  Uptime Kuma, protegido

red docker  socialpro_edge  (externa, compartida)
   │
   ├── crm/        app + PostgreSQL 17 + scheduler
   ├── automation/ n8n + su PostgreSQL 16   ← intacto
   └── monitoring/ Uptime Kuma

volúmenes
   ├── postgres-crm/      base del CRM
   ├── storage-public/    ficheros servibles
   ├── storage-private/   ficheros con permisos  ← fuera de toda raíz web
   └── n8n_data/          ya existe, no se toca

backups → fuera del VPS (Google Drive vía rclone/restic, cifrado)
```

## Principios

1. **Solo Caddy publica 80/443.** PostgreSQL, n8n, la app y el scheduler no
   exponen puertos al host. Una base de datos accesible desde internet es la
   forma más rápida de perder los datos.
2. **Proyectos Compose separados.** `edge`, `crm`, `automation`, `monitoring`.
   Se comunican por una red externa compartida. Así se puede reiniciar el CRM
   sin tocar n8n.
3. **Dos PostgreSQL, no uno.** El de n8n (16) se queda como está; el del CRM
   (17) es nuevo e independiente. Compartirlos ataría el ciclo de vida de dos
   sistemas que no tienen por qué caer juntos.
4. **Nada de lo que ya funciona se reinicia sin motivo.** El stack de n8n, su
   clave de cifrado, su volumen y los certificados de Caddy se conservan.

## Aplicación

Imagen Docker multi-stage sobre Debian slim, etiquetada por SHA de git.

Por qué no Alpine: `canvas` compila contra glibc y necesita cairo y pango del
sistema; los WASM de mupdf y tesseract se han probado sobre glibc. Cambiar a
musl obliga a recompilar y revalidar el OCR entero para ahorrar unos megas.

- `output: 'standalone'` — sin `node_modules` completo en la imagen
- usuario sin privilegios
- `tini` como PID 1, para que SIGTERM llegue a Node
- healthcheck contra `/api/health/live`

**Despliegue azul/verde**: se levanta el candidato, se espera a que esté sano,
se pasan las pruebas de humo y solo entonces se cambia el upstream de Caddy. La
versión anterior se mantiene durante la observación, así que volver atrás es
recargar Caddy — no reconstruir una imagen.

## Base de datos

PostgreSQL 17 en contenedor, fijado por versión, con `data-checksums`, UTC y
`pg_isready` como healthcheck. Volumen dedicado. Sin puerto publicado.

Cuatro roles, con SCRAM:

| Rol | Puede | No puede |
|---|---|---|
| `socialpro_owner` | ser propietario | usarse desde la aplicación |
| `socialpro_migrator` | DDL | — |
| `socialpro_app` | leer y escribir datos | DDL |
| `socialpro_backup` | leer | escribir |

Que la aplicación no pueda alterar el esquema es lo que impide que un fallo en
tiempo de ejecución se convierta en un cambio de estructura.

## Almacenamiento

Sistema de ficheros con la abstracción ya implementada. **Sin MinIO ni Garage**:
para el volumen actual añadirían un servicio, un modo de fallo y una superficie
de ataque a cambio de nada. Si el volumen crece, la interfaz ya permite añadir
un proveedor S3 sin tocar los consumidores.

```
/srv/socialpro/storage/public    ← servible
/srv/socialpro/storage/private   ← NUNCA bajo una raíz web
```

Durante la migración: se escribe en local y, si un fichero no está, se lee de
Vercel Blob. Cada lectura por respaldo queda registrada — es lo que dirá cuándo
se puede retirar.

## Tareas programadas

Un único scheduler (Supercronic en contenedor, versionado) que llama por la red
interna a `http://app:3000/api/cron/…` con `CRON_SECRET`.

**Un solo dueño de cada tarea.** Al pasar a producción hay que desactivar los
crons de Vercel: si quedan los dos, cada trabajo corre dos veces, y algunos no
son idempotentes.

Los horarios de `vercel.json` están en UTC y se mantienen; su equivalente en
`Europe/Madrid` está en el documento de arquitectura actual.

Excepción deliberada: **el backup de infraestructura no depende del endpoint del
CRM**. Un backup que necesita que la aplicación esté viva no sirve justo el día
que hace falta.

## Observabilidad

Uptime Kuma en el VPS, protegido, vigilando web, login, health, n8n, y con
heartbeats de backup y scheduler.

Y **un monitor externo gratuito**, porque Kuma vive en la misma máquina que
vigila: si el VPS cae entero, no hay quien avise.

Sin montar `/var/run/docker.sock`: da control total del host a un contenedor
expuesto por HTTP.

## Backups

| Qué | Cada |
|---|---|
| PostgreSQL del CRM | 6 h |
| Ficheros | diario incremental |
| PostgreSQL de n8n + `n8n_data` | diario |
| Configuración de Caddy y workflows | diario |

Retención 7 diarios / 4 semanales / 12 mensuales, cifrado y **fuera del VPS**.
Una copia en el mismo servidor no es un backup: es el mismo punto de fallo.

Sin un restore probado de verdad no se autoriza el cutover.

## Coste

| Concepto | Antes | Después |
|---|---|---|
| VPS | ya contratado | igual |
| Neon | de pago (~70 $ en branch-months solo en julio) | 0 |
| Vercel | de pago | 0 |
| Vercel Blob | de pago | 0 |
| Backups | — | 0 (Google Drive existente) |
| Monitorización | — | 0 (Kuma + monitor externo gratuito) |

Licencias nuevas: **ninguna**. El ahorro real se cifrará en el informe final.

## Riesgos abiertos

1. **Capacidad del VPS sin verificar.** Es un gate: si no cumple, no se migra.
2. **Geo por país**: hoy lo da Vercel y sostiene un gating **legal** de
   sorteos. Sin equivalente hace falta una base GeoIP y revisión jurídica.
3. **Fotos y logos sin índice en base de datos.** Hay que construirlo antes de
   mover un solo byte.
4. **Imagen Docker sin construir.** El OCR y los PDF están sin ejercitar en el
   contenedor.
5. **Un solo servidor.** Vercel daba redundancia implícita; el VPS es un único
   punto de fallo. Es una decisión consciente, no un descuido.
