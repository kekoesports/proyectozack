---
summary: 'Puente autenticado entre n8n y el CRM para crear tratos, vincular Sheets y emitir alertas de progreso.'
read_when:
  - Configurando n8n para crear tratos en el CRM
  - Diagnosticando duplicados o alertas 70/80/100
  - Rotando la credencial AUTOMATION_API_TOKEN
---

# Automatización de tratos con n8n

## Estado y alcance

Esta integración permite que n8n cree un trato completo en el CRM sin acceso
directo a Neon. El CRM sigue siendo la única capa que valida y escribe datos.

Incluye:

- autenticación Bearer dedicada;
- idempotencia mediante `Idempotency-Key`;
- búsqueda o alta de marca;
- búsqueda de talento por ID, handle/plataforma o slug;
- alta interna de talento cuando no existe;
- persistencia de GEO stats en perfil y red social;
- creación de trackers por tipo y cantidad de entregable;
- generación y vínculo best-effort de la Google Sheet del trato;
- generación opcional de un PDF de contrato en estado borrador;
- lectura del progreso ya existente en el CRM;
- sincronización masiva con avisos únicos al cruzar 70, 80 y 100 %;
- evidencias auditables y reversibles dentro del CRM;
- resumen operativo de tratos, errores y 10 días sin enlaces nuevos.

No envía contratos ni crea firmantes automáticamente. Esas acciones tienen
efecto jurídico y siguen requiriendo una confirmación explícita en el CRM.

## Instalación

1. Desplegar el código del CRM. Las migraciones
   `0115_automation_deals_api.sql`, `0116_automation_deal_evidence.sql` y
   `0117_automation_deal_drafts.sql` se aplican con el flujo normal
   `npm run migrate` del build.
   En un Preview aislado, definir `RUN_MIGRATIONS_IN_PREVIEW=true` únicamente
   para la rama de prueba. Sin ese opt-in, los Preview omiten migraciones.
2. Generar una credencial aleatoria de al menos 32 caracteres.
3. Guardarla en Vercel como `AUTOMATION_API_TOKEN` solo en los entornos que se
   vayan a usar. No compartirla en chat, logs ni nodos de código.
4. En n8n crear una credencial **Header Auth**:
   - nombre del header: `Authorization`;
   - valor: `Bearer <AUTOMATION_API_TOKEN>`.
5. Asociar esa credencial a todos los nodos HTTP que llamen a
   `https://socialpro.es/api/automation/*`.

Si la variable no existe, la API devuelve `503 missing-config`. Si el token es
incorrecto, devuelve `401 unauthorized`.

## Crear un trato

`POST /api/automation/deals`

Headers:

```http
Authorization: Bearer <secreto>
Idempotency-Key: deal:marca-demo:creador-demo:2026-08
Content-Type: application/json
```

Ejemplo de body:

```json
{
  "name": "Marca Demo - Creador Demo",
  "brand": { "name": "Marca Demo" },
  "talent": {
    "name": "Creador Demo",
    "handle": "@creador_demo",
    "platform": "twitch",
    "country": "ES",
    "topGeos": [
      { "country": "Spain", "pct": 75 },
      { "country": "Argentina", "pct": 15 }
    ]
  },
  "status": "propuesta",
  "currency": "EUR",
  "amountBrand": 0,
  "amountTalent": 0,
  "amountInKindTalent": 100,
  "amountInKindCommunity": 2000,
  "deliverables": [
    { "type": "stream_integration", "targetCount": 5 },
    { "type": "video_youtube", "targetCount": 5 },
    { "type": "preroll", "targetCount": 5 }
  ]
}
```

La primera llamada devuelve `201` y `created: true`. Repetir exactamente la
misma clave devuelve `200`, `created: false` y el mismo `campaignId`, sin crear
duplicados.

Los cuatro importes representan conceptos distintos:

- `amountBrand`: efectivo que paga la marca a la agencia;
- `amountTalent`: efectivo que paga la agencia al creador;
- `amountInKindTalent`: producto o saldo entregado al creador;
- `amountInKindCommunity`: producto o saldo reservado para sorteos.

Tipos de entregable admitidos:

- `stream_integration`
- `video_youtube`
- `short_reel_tiktok`
- `story_instagram`
- `tweet_x`
- `post_instagram`
- `pack_mensual`
- `pack_trimestral`
- `preroll`
- `otro`

## Generar la Sheet al crear el trato

Al crear un trato por `POST /api/automation/deals` o al aprobar un borrador, el
CRM copia la **plantilla canónica** a la carpeta de seguimiento y vincula la
hoja resultante al trato. El nombre sigue la forma canónica `MARCA - CREADOR`.

**Nunca bloquea la creación del trato.** Si Drive falla o falta configuración,
el trato se crea igual y el digest lo marca como `missing_sheet`, que es la
señal correcta de "hay que darle una hoja". La respuesta de `POST /deals`
incluye un campo `sheet` con el resultado: `created`, `already_had_sheet`,
`skipped` o `failed`.

**Es idempotente.** Si el trato ya tiene `trackingSheetUrl`, no se crea otra
hoja: aprobar dos veces un borrador o reintentar no deja huérfanas en Drive.

### Configuración

| Variable | Qué es |
|---|---|
| `GOOGLE_DRIVE_DEAL_TEMPLATE_ID` | Id de la plantilla canónica a copiar |
| `GOOGLE_DRIVE_TRACKING_FOLDER_ID` | Carpeta donde se deja la copia |

Ambas son **opcionales**: sin ellas la generación no ocurre y no se rompe nada.

## Generar el borrador de contrato al aprobar

Después de la aprobación humana del borrador, el CRM puede rellenar una
plantilla activa, generar el PDF en el servidor y asociarlo al trato con estado
`draft`. Es una operación best-effort: si falla, el trato y su Sheet permanecen
creados. Repetir la aprobación reintenta la operación de forma idempotente.

Esta generación solo se engancha al flujo de borradores revisados. El endpoint
directo `POST /deals` no genera contratos, porque no acredita que una persona
haya revisado el deal.

| Variable | Qué es |
|---|---|
| `AUTOMATION_CONTRACT_DRAFTS_ENABLED` | Kill switch; debe ser `true` para generar |
| `AUTOMATION_CONTRACT_TEMPLATE_ID` | Plantilla exacta opcional |

Sin override se usa una plantilla sectorial solo cuando hay una única opción;
si hay ambigüedad, se cae a una única `service_agreement` o `general`. Nunca se
elige al azar entre dos contratos del mismo tipo. Los sectores
`casino/gambling/iGaming` usan la plantilla `casino` cuando es inequívoca.

El PDF lleva la marca **BORRADOR**. La automatización no añade firmantes, no
llama a Resend y no cambia el estado a `pending_signature`. Antes de enviarlo,
una persona debe abrir el trato, revisar texto, importes, entregables y plantilla,
añadir los firmantes y confirmar el envío.

Los PDFs nuevos usan la capa portable de almacenamiento: Vercel Blob mientras
`STORAGE_DRIVER=vercel` y el disco privado del VPS cuando es `local`.

### Permisos que hay que dar en Drive

La cuenta de servicio necesita, sobre los dos ficheros:

- **Plantilla** → *Lector* (para copiarla).
- **Carpeta de seguimiento** → *Editor* (para dejar la copia dentro).

Sin esos dos permisos la API devuelve 403 o 404 y el resultado será `failed`.
Ojo con el 404: cuando la cuenta no tiene acceso, Drive oculta la existencia
del fichero, así que "no encontrado" casi siempre significa "no compartido".

### Sobre el scope

Esta ruta usa `https://www.googleapis.com/auth/drive`, no el `drive.file` del
backup. `drive.file` solo alcanza ficheros creados por la propia app o abiertos
con el Google Picker; una cuenta de servicio no usa Picker, así que una
plantilla *compartida* le resulta invisible con ese scope. Por eso la
autenticación vive en `src/lib/drive/deal-tracking-sheet.ts` con su propio
token y su propia caché: **no se toca `src/lib/backup/drive-auth.ts`**, que
debe seguir con el scope restringido que le basta.

## Vincular la Sheet creada por n8n

Después de que Google Drive copie y adapte la plantilla:

`PATCH /api/automation/deals/{campaignId}`

```json
{
  "trackingSheetUrl": "https://docs.google.com/spreadsheets/d/ID/edit#gid=0"
}
```

Solo se aceptan URLs de `docs.google.com/spreadsheets/d/...`.

## Consultar o sincronizar progreso

Consultar sin escribir:

`GET /api/automation/deals/{campaignId}`

Sincronizar un trato desde su Sheet:

`POST /api/automation/deals/{campaignId}`

Sincronizar todos los tratos automatizados con Sheet:

`POST /api/automation/deals/sync`

La sincronización recorre todos los tratos activos del CRM que tengan Sheet,
incluidos los creados manualmente. Un enlace HTTP(S) único equivale a una pieza
completada aunque el creador no cambie la celda `ESTADO`. Una fila marcada como
`Rechazado` no cuenta. Si se retira un enlace, el contador baja sin borrar el
histórico de evidencia.

La respuesta masiva contiene `alerts`. Un umbral permanece pendiente hasta que
el canal confirma que lo ha publicado:

```json
{
  "ok": true,
  "total": 4,
  "synced": 4,
  "failed": 0,
  "alerts": [
    {
      "campaignId": 123,
      "name": "Marca Demo - Creador Demo",
      "level": 80,
      "progressPct": 80
    }
  ]
}
```

n8n debe enviar cada elemento de `alerts` al canal elegido (Discord, email o
WhatsApp Business). Solo después de que el envío termine correctamente debe
confirmarlo con:

`POST /api/automation/deals/{campaignId}/alerts/ack`

```json
{ "level": 80 }
```

El ACK acepta únicamente `70`, `80` o `100` y actualiza
`tracking_alert_level` de forma monótona. Si Discord falla, el ACK no se
ejecuta y el siguiente sync vuelve a emitir el aviso pendiente.

## Resumen operativo para Discord

`GET /api/automation/deals/digest`

Devuelve todos los tratos activos del CRM con marca, creador, progreso,
`lastEvidenceAddedAt`, días sin enlaces y una acción priorizada:

- `sync_error`: la Sheet no se pudo leer;
- `missing_sheet`: el trato aún no tiene documento asociado;
- `completed`: 100 %, listo para cierre;
- `prepare_invoice`: 70-99 %, empezar factura;
- `stale`: 10 o más días sin evidencia nueva;
- `on_track`: sin excepción operativa.

El workflow `socialpro-deal-digest.json` está pensado para publicar este resumen
los lunes, miércoles y viernes a las 10:30 (`Europe/Madrid`). El CRM, no
Discord ni n8n, conserva el estado canónico.

## Flujo recomendado en n8n

### Alta de trato

1. Webhook o formulario interno recibe el trato.
2. Nodo de validación construye el JSON canónico.
3. HTTP Request crea un borrador con una clave de idempotencia estable.
4. Una persona revisa y aprueba el borrador en el CRM.
5. El CRM crea el trato y sus trackers.
6. El CRM copia y vincula la Sheet en la carpeta del creador.
7. Si está habilitado, el CRM genera el contrato como PDF `draft`.
8. Una persona revisa el contrato, añade firmantes y confirma el envío.

### Monitor de progreso

1. Schedule Trigger cada hora o una vez al día.
2. HTTP Request ejecuta `/api/automation/deals/sync`.
3. IF comprueba `alerts.length > 0`.
4. Split Out procesa cada alerta.
5. El canal de avisos publica el nombre, porcentaje y enlace interno del trato.
6. HTTP Request confirma el umbral en
   `/api/automation/deals/{campaignId}/alerts/ack`.

### Entrada desde Discord

#### Lectura automática de #pipeline-deals

El equipo publica los tratos como mensaje de texto en `#pipeline-deals`. Un
workflow de n8n (`socialpro-pipeline-deals-reader.json`) sondea el canal cada
15 minutos con la credencial del bot y envía el lote en crudo a:

`POST /api/automation/discord/pipeline-deals`

```json
{
  "messages": [
    {
      "messageId": "1533123521574862991",
      "channelId": "1533123521574862991",
      "authorId": "1522153792592806018",
      "content": "NUEVO DEAL

Creador: ..."
    }
  ]
}
```

El sondeo vive en n8n porque allí ya está el token del bot; **el parseo vive en
el CRM** (`src/lib/parsers/discordDeal.ts`), que es donde puede tener Zod y
tests. El parser es determinista: no llama a ningún modelo.

La respuesta resume el lote y detalla cada mensaje con uno de estos resultados:

| resultado | significado |
|---|---|
| `created` | borrador nuevo |
| `already_seen` | el mensaje ya se había procesado; no se vuelve a parsear |
| `ignored` | no parece un trato (charla del canal); no deja borrador |
| `failed` | error puntual; el resto del lote sigue y n8n reintenta en la próxima pasada |

El lector deja una reacción idempotente en el mensaje original para que el
estado se vea sin abrir n8n:

| reacción | significado |
|---|---|
| 👀 | leído y guardado como borrador pendiente de revisión |
| ⚠️ | leído y guardado, pero faltan datos; se completa dentro del CRM |
| ✅ | el borrador ya fue aprobado y creó el trato |
| 🚫 | el borrador fue rechazado |
| ❌ | fallo puntual; el mensaje se volverá a intentar |

Los mensajes incompletos **no se descartan**. Siempre que parezcan un trato,
quedan en `/admin/automation-drafts` con estado `missing_info` y el detalle de
los campos que hay que corregir.

**Idempotencia:** la clave es `discord:message:<id>`. El endpoint corta **antes**
de parsear si el mensaje ya se procesó — sin ese corte, cada sondeo repetiría el
trabajo unas 96 veces al día por mensaje.

**Qué NO hace:** no crea campañas ni llama a `/deals/sync`. Solo deja borradores
en `/admin/automation-drafts` para que los revise una persona.

Dos cosas que el parser trata a propósito como campo vacío o error, porque
aparecieron en mensajes reales:

- `30/02/2027` **se rechaza**. `new Date(2027, 1, 30)` devolvería el 2 de marzo
  sin avisar, y la errata se colaría como fecha válida.
- `@HANDLE_EXACTO` y similares (`TBD`, `N/A`, `NOMBRE_MARCA`) **cuentan como
  vacío**: son huecos de plantilla sin rellenar, no valores.

En ambos casos el borrador aterriza como `missing_info` con los campos que
faltan, que es justo lo que hace que alguien lo revise.


Discord funciona como interfaz, no como base de datos. El comando `/deal`
debe interpretar el texto y guardar primero un borrador:

`POST /api/automation/deal-drafts`

```json
{
  "source": "discord",
  "externalId": "discord:interaction:12345678",
  "sourceUserId": "usuario-discord",
  "sourceChannelId": "canal-alta-deals",
  "rawText": "TODOCS2 + Marca Demo...",
  "proposedDeal": { "name": "...", "brand": {}, "talent": {}, "deliverables": [] }
}
```

El CRM devuelve `draft.id`. Discord muestra la propuesta y dos botones. La
decisión se registra con:

`PATCH /api/automation/deal-drafts/{draftId}`

```json
{ "action": "approve", "reviewedBy": "usuario-discord" }
```

También admite `action: "reject"`. Si el mensaje de Discord no trae todos los
datos canónicos, el CRM guarda el borrador como `missing_info` y devuelve
`draft.missingFields`. El bot debe pedir solo esos campos y actualizar el
borrador antes de aprobar:

```json
{
  "action": "update",
  "reviewedBy": "usuario-discord",
  "proposedDeal": { "name": "...", "brand": {}, "talent": {}, "deliverables": [] }
}
```

Cuando no se envía `startDate`, el CRM toma por defecto dos días después de la
fecha de creación. Si se envía `durationMonths` sin `endDate`, calcula la fecha
final sumando esos meses a la fecha de inicio y usa esa misma fecha como
`deliveryDeadline`.

Solo `approve` crea el trato con una clave idempotente derivada del borrador. La
respuesta final debe publicar los enlaces al trato del CRM, la Sheet y el
contrato. Si falla el CRM, el comando falla: no se considera creado por haber
aparecido en Discord.

## Operación segura

- n8n nunca recibe `DATABASE_URL`.
- La credencial se guarda como credencial n8n, no dentro del workflow JSON.
- Rotar `AUTOMATION_API_TOKEN` revoca todas las llamadas anteriores.
- Una copia o reintento de workflow debe conservar la misma
  `Idempotency-Key` para la misma operación lógica.
- No reutilizar `CRON_SECRET` ni `TARGETS_IMPORT_TOKEN` para este flujo.


> Nota operativa (2026-08-21): el historial de Drizzle 0127–0129 quedó reconciliado con el esquema ya aplicado antes de desplegar la sincronización automática de progreso.
