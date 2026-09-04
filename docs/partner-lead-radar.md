# Radar diario de partners CS2

El radar almacena cada informe en el CRM y publica un digest en Discord mediante
n8n. La base de datos es la fuente de verdad; Discord sólo es la interfaz de
aviso. Ningún semáforo constituye aprobación legal automática.

## Flujo

1. La automatización investiga y contrasta candidatos.
2. Hace `POST /api/automation/partner-leads` con un bearer
   `AUTOMATION_API_TOKEN` y un `batchId` único.
3. El CRM crea el lote y hace upsert de cada dominio sin pisar owner, notas ni
   estado comercial.
4. El CRM intenta despertar n8n. Además, el workflow consulta pendientes cada
   dos minutos.
5. n8n publica el digest y sólo después hace ACK al CRM. Si Discord falla, el
   lote queda pendiente y se reintenta.

Los informes vacíos también se guardan y notifican para que el silencio nunca
se confunda con un fallo del radar.

## Configuración del CRM

Variables opcionales para la entrega a Discord:

```text
N8N_PARTNER_LEADS_WEBHOOK_URL=https://n8n.socialpro.es/webhook/...
DISCORD_PARTNER_LEADS_GUILD_ID=...
DISCORD_PARTNER_LEADS_CHANNEL_ID=...
```

`AUTOMATION_API_TOKEN` ya protege el resto de `/api/automation/*` y se reutiliza
en este flujo. No reutilizar `CRON_SECRET` ni `TARGETS_IMPORT_TOKEN`.

Si las variables de Discord faltan, el import continúa y el CRM muestra el lote
como pendiente. No se descarta información ni se abre un destino por defecto.

## Configuración de n8n

1. Importar
   `infra/n8n/workflows/socialpro-discord-partner-leads.json`.
2. Asignar a los nodos HTTP la credencial Header Auth del CRM:
   `Authorization: Bearer <AUTOMATION_API_TOKEN>`.
3. Asignar al nodo Discord la credencial del bot autorizado en el servidor.
4. Copiar la URL de producción del webhook a
   `N8N_PARTNER_LEADS_WEBHOOK_URL` en el CRM.
5. Ejecutar una prueba manual, comprobar el mensaje y su ACK en
   `/admin/partner-leads`, y activar el workflow.

## Contrato de importación

El body contiene `batchId`, `researchedAt`, `reportSummary` y `leads`. Cada lead
incluye identidad, contacto comercial, encaje para creadores, jurisdicción,
evidencias enlazadas, evaluación para España, riesgos, recomendación y
confianza de 0 a 100. La validación rechaza URLs no HTTP(S), dominios duplicados
en el mismo lote y entradas sin al menos una evidencia.

El `batchId` hace el POST idempotente. Repetir el mismo lote devuelve el
resultado previo y no crea otro digest.
