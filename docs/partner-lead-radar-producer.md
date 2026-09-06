# Productor diario Partners CS2: entrega comprobable

Guía actualizada el 2026-09-06, después de publicar c26c8e1d. Transporte hacia
**crm-leads** instalado y lote real 3 entregado/ACK/GET verificados a las 10:55 UTC.
La automatización existente de las 09:00 Madrid conserva su identidad y ya usa
esa ruta; el próximo disparo diario desatendido todavía no está probado.
Véase [cierre operativo y límites](discord-routing-release-2026-09-06.md).
Esta guía no instala, activa ni demuestra por sí sola una automatización.

Sólo investigación pública e importación al CRM interno. No enviar correos,
mensajes/formularios comerciales, abrir cuentas o afiliaciones, contactar
empresas/creadores ni realizar compras, depósitos, retiradas o contratos.

## Estado primero: una identidad diaria

La automatización existente es `radar-diario-cs2-loot-boxes`, «Radar diario
CS2 loot boxes». Conservar identidad, tarea, horario y preferencias; no crear
otra ni editar su TOML como parte de investigar. Necesita PC, Codex y proyecto
disponibles; un TEST o envío manual no prueba una ejecución diaria desatendida.

Leer AGENTS y el esquema oficial antes de actuar. Usar el checkout y wrapper
revisados, aunque la tarea se abra en otro worktree. Al iniciar:

```powershell
$radarRepo = 'C:/Users/kekoe/.codex/.chatgpt-projects/g-p-6a88548c32d48191a21b4b7c284d28ab/socialpro-master-20260905'
$radarTransport = Join-Path $radarRepo '.scratch/creator-production-20260905/invoke-partner-daily.ps1'
$radarDay = (& node -e "process.stdout.write(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))").Trim()
$radarBatchId = 'cs2-radar-' + $radarDay
$radarReport = Join-Path $radarRepo ('.scratch/cs2-radar-' + $radarDay + '/batch.json')
& $radarTransport -Mode status -BatchId $radarBatchId
```

El día actual Europe/Madrid se fija una vez. Si existe lote o intención
`prepared/post_started/uncertain/accepted`, no investigar un reemplazo ni
importar otra vez: reconciliar ese ID. Un error no significa ausencia y
`no_reliable_intent` no prueba que no exista un directorio huérfano. No borrar
locks, journal o informes ni cambiar el ID para eludir un bloqueo.

Conservar el JSON local ya cerrado y sus bytes. Sólo si nunca hubo intento,
sigue siendo el día actual y los gates están cerrados se puede entregar ese
original. Un lote anterior pendiente permite una lectura `status` del ID
concreto, **no importación histórica ni recuperación automática de atrasos**.

## Preflight y destino

```powershell
& $radarTransport -Mode preflight
```

Exigir `ok:true`, `configured:true`, `journalVerified:true` y
`canonicalSiteVerified:true`. Contrastar guild/canal y release con los controles
y la puesta en servicio más reciente confirmada. Tras la separación, Partners
debe ir a **crm-leads**, no a KPI; Reportes, Deals y creadores tienen sus propios
canales y KPI conserva el formato completo. Si la nueva ruta no está comprobada,
no importar. Preflight sólo prueba configuración/lecturas, no entrega Discord.

La preparación del release y sus pins está en
`.scratch/creator-production-20260905/partner-daily-release-review.md`;
el prompt propuesto, en `partner-daily-producer-prompt.md` del mismo directorio.
No instalar, repinear, usar el contenedor anterior como fallback ni cambiar
app/env, n8n, guard, políticas, permisos o destinatarios desde el diario.

El preflight ofrece hasta 64 dominios con fecha; `inventoryTruncated:true`
significa cobertura incompleta. Consultar historial accesible, no afirmar
novedad global por ausencia en esa página. Repetir un dominio sólo por un cambio
público material documentado.

## Investigación e identidad de los datos

Validar con `PartnerLeadBatchIntake` de `src/lib/schemas/partnerLead.ts`.
El diario limita cada lote a **0–8 empresas y 100000 bytes UTF-8** aunque el
endpoint general admita 20. No inventar empresas, contactos, métricas, sociedades,
licencias ni fuentes para completar cupos. Un lote vacío sólo vale tras
investigación real explicada; no crear TESTs diarios.

Priorizar fuentes oficiales actuales y distinguir hechos de señales o reseñas.
Separar fecha de publicación, fecha del hecho y momento de consulta.
`researchedAt`, `verifiedAt` y `checkedAt` conservan sus fechas reales con
zona horaria, nunca futuras ni sustituidas por la entrega. `researchedAt`
pertenece al día Madrid del lote. No inventar una fecha nueva si cambia el día.

Un cierre acreditado puede ser `red/discard`; incertidumbre relevante puede
ser `amber/watch`. Falta de información no demuestra ilegalidad ni ausencia
de licencia. Popularidad o licencia declarada no garantiza fiabilidad; el encaje
para España no es un dictamen jurídico. Dejar null/vacío donde el esquema admita
información no verificada.

Guardar el JSON original, `review.md`, fuentes y SHA-256 en el directorio del
día. Validar con `normalize` del bundle local revisado, sin activar su entry
de transporte, DB ni HTTP. Comprobar bundle/fuentes contra
`partner-daily-runtime.pins.json` y el `runtimeSha256` del preflight.
Una discrepancia bloquea; no recompilar/repinear para sortearla. Congelar bytes.

## Transporte instalado y excepción loopback autorizada

El wrapper Windows usa únicamente el SSH existente:
`root@159.195.112.100`, clave local autorizada y verificación estricta de host.
El destino fijo es
`/usr/bin/python3 /opt/socialpro/maintenance/partner-radar-daily/dispatch.py`
con uno de los modos `status`, `preflight` o `import`. No admite host,
comandos, rutas o contenedor suministrados por el informe. La clave tiene
privilegios root amplios; el comando fijo limita el programa, no reduce esos
privilegios. No usar esa capacidad para otros cambios.

El dispatcher resuelve la app Compose por nombre exacto, imagen/revisión y salud;
revalida el mismo contenedor antes/después de cada llamada. Como UID1000 y desde
`/app`, el runtime lee `AUTOMATION_API_TOKEN` sólo en memoria y usa:

```text
POST http://127.0.0.1:3000/api/automation/partner-leads
Authorization: Bearer <token leído exclusivamente dentro de la app>
Content-Type: application/json
Body: informe cerrado y validado
```

Ésta es la **excepción interna autorizada al requisito HTTPS**: sólo el loopback
del contenedor, sin redirecciones; el tramo exterior está protegido por SSH.
No autoriza HTTP exterior, sacar el token de la app, leer `Config.Env` en el
host, copiar secretos al PC ni pasarlos por argv, prompts o informes. El webhook
del CRM hacia n8n conserva su HTTPS y autenticación.

No usar sesión de administrador, SQL de escritura, formulario de partners,
webhook Discord ni endpoint de ACK como alternativa. El wrapper transmite los
bytes originales por stdin: no `Get-Content | ssh`, `WriteLine`, reserialización,
base64 manual, shells nuevos o modificación del wrapper.

Antes del envío, comprobar que no cambió el día Madrid y repetir `status` del
mismo ID. Con ausencia de lote/intento conocido y todos los gates confirmados:

```powershell
& $radarTransport -Mode import -ReportPath $radarReport
```

Tanto después de éxito como de timeout/error, consultar esa misma identidad:

```powershell
& $radarTransport -Mode status -BatchId $radarBatchId
```

Nunca repetir `import` para recuperar una respuesta. El journal permanente
del host conserva original/hashes y fases append-only
`prepared → post_started → accepted|uncertain`; `post_started` precede al
único POST. Intención previa, fallo de persistencia o directorio huérfano
bloquean otro POST. Mismo ID con contenido distinto se rechaza.

El mantenimiento de release conserva las tuplas históricas revisadas sólo
para lectura. No migra ni resetea journal/recibos, no ejecuta la imagen vieja
ni mueve lotes antiguos de KPI al canal nuevo. Los registros históricos siguen
siendo comprobables con `status` sin usar la disponibilidad de la página pública.

## Qué evidencia permite afirmar

| Evidencia | Estado permitido |
|---|---|
| Sólo JSON local | Preparado, no enviado |
| HTTP 201, `created:true`, identidad y conteos correctos | Guardado en CRM; Discord por verificar |
| HTTP 200, `created:false` | Lote existente; no demuestra igualdad del contenido ni permite otro ID |
| `discordTrigger:triggered` | Despertador n8n aceptado, no mensaje confirmado |
| Snapshot coherente con journal | `immutable_snapshot_matches_journal`; no hash de todos los campos originales |
| `crmAckedAt` no nulo | ACK registrado en CRM, por separado del recibo Discord |
| Recibo durable y GET del mensaje exacto validados por un verificador autorizado | Recibo Discord comprobado |

El transporte mínimo devuelve `guardReceiptVerified:false`,
`discordDeliveryVerified:false` y `fullPayloadPersistedHashAvailable:false`.
No fingir esas verificaciones ni inferirlas de ausencia en pendientes.
Un ACK histórico en el destino antiguo no acredita la ruta nueva.

El GET de pendientes sólo devuelve hasta 25 lotes y también devuelve cero si no
hay configuración. No ofrece estado por identidad ni cursor. Nunca llamar al
POST de ACK para consultar o fabricar confirmación: sólo el circuito de entrega
lo utiliza después de conservar un recibo real.

La UI muestra «Discord enviado» cuando existe timestamp de ACK, no cuando
este productor haya verificado el mensaje. Enlazar
`https://socialpro.es/admin/partner-leads?batch=<batchId>` cuando exista en CRM,
con fecha real, conteos confirmados y estados CRM/ACK/Discord separados.

## Pruebas administrativas y avisos del diario

Antes de afirmar la ruta nueva o un diario desatendido, root debe comprobar
destino/configuración, ejemplo nuevo, persistencia, mensaje/recibo, ACK y replay
sin duplicado, además de reinicio preservando el journal y horario natural
observado. Es una ventana administrativa separada: la ejecución diaria no
activa flujos, crea TESTs ni dispara el guard para fabricar evidencia.

Notificar sólo novedades útiles: lote realmente preparado/guardado, cambio
de ACK, hallazgo relevante o error/bloqueo nuevo que requiere acción.
Mantener silencio si hoy ya está tratado sin cambios o persiste un bloqueo
ya comunicado. Usar `DONT_NOTIFY` para estado no accionable y `NOTIFY` sólo
cuando corresponda; no emitir resúmenes rutinarios por cada despertar.
