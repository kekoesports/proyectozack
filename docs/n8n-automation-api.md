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
- sincronización masiva con avisos únicos al cruzar 70, 80 y 100 %.

No incluye todavía la generación del contrato ni la copia de la plantilla de
Google Drive: esas dos operaciones se orquestan desde n8n y después se adjuntan
al trato mediante el CRM.

## Instalación

1. Desplegar el código del CRM. La migración `0115_automation_deals_api.sql`
   se aplica con el flujo normal `npm run migrate` del build.
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

## Operación segura

- n8n nunca recibe `DATABASE_URL`.
- La credencial se guarda como credencial n8n, no dentro del workflow JSON.
- Rotar `AUTOMATION_API_TOKEN` revoca todas las llamadas anteriores.
- Una copia o reintento de workflow debe conservar la misma
  `Idempotency-Key` para la misma operación lógica.
- No reutilizar `CRON_SECRET` ni `TARGETS_IMPORT_TOKEN` para este flujo.
