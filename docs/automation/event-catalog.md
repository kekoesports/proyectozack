---
summary: Catálogo de eventos durables emitidos por SocialPro.
read_when:
  - Crear o consumir eventos de automatización
---

# Catálogo de eventos

| Evento | Agregado | Momento | Consumidor principal |
|---|---|---|---|
| `campaign.created` | campaign | creación confirmada | actividad/avisos |
| `campaign.updated` | campaign | actualización general | actividad/avisos |
| `campaign.approved` | campaign | transición a aprobada | Drive + tracking |
| `campaign.automation_assets_updated` | campaign | URL/ID de assets guardados | auditoría |
| `deliverable.created` | deliverable | creación confirmada | tarea/reminder |
| `deliverable.status_changed` | deliverable | transición válida | tarea/avisos |

## Contrato del webhook

```json
{
  "id": "uuid",
  "traceId": "uuid",
  "type": "campaign.approved",
  "aggregate": { "type": "campaign", "id": "42" },
  "occurredAt": "2026-08-14T08:00:00.000Z",
  "payload": { "campaignId": 42, "status": "aprobada" }
}
```

Cabeceras: `x-socialpro-signature`, `x-socialpro-timestamp`, `x-event-id` e `idempotency-key`. No cambiar un payload existente de forma incompatible; añadir campos opcionales o publicar una nueva versión de evento.
