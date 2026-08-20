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
- vínculo posterior de la Google Sheet del trato;
- lectura del progreso ya existente en el CRM;
- sincronización masiva con avisos únicos al cruzar 70, 80 y 100 %;
- evidencias auditables y reversibles dentro del CRM;
- resumen operativo de tratos, errores y 10 días sin enlaces nuevos.

No incluye todavía la generación del contrato ni la copia de la plantilla de
Google Drive: esas dos operaciones se orquestan desde n8n y después se adjuntan
al trato mediante el CRM.

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

La respuesta masiva contiene `alerts`. Cada umbral solo aparece una vez por
trato gracias a `tracking_alert_level`:

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
WhatsApp Business). Una ejecución posterior no vuelve a notificar el mismo
umbral.

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
3. HTTP Request crea el trato con una clave de idempotencia estable.
4. Google Drive copia la plantilla correspondiente a la marca.
5. Google Sheets adapta los bloques a las cantidades del deal.
6. HTTP Request vincula la URL al `campaignId`.
7. Google Docs genera el contrato desde la plantilla de marca.
8. El CRM guarda el documento y su estado de firma.

### Monitor de progreso

1. Schedule Trigger cada hora o una vez al día.
2. HTTP Request ejecuta `/api/automation/deals/sync`.
3. IF comprueba `alerts.length > 0`.
4. Split Out procesa cada alerta.
5. El canal de avisos publica el nombre, porcentaje y enlace interno del trato.

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
