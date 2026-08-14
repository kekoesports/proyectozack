---
summary: Contrato de la API M2M usada por n8n.
read_when:
  - Configurar un nodo HTTP de n8n
  - Añadir o depurar una integración
---

# API de integración v1

Base: `https://<socialpro>/api/integrations/v1`. Todas las rutas requieren `Authorization: Bearer <token>`. Toda mutación requiere además una `Idempotency-Key` estable de 8–200 caracteres.

## Respuesta

Éxito:

```json
{ "ok": true, "data": {}, "traceId": "uuid" }
```

Error:

```json
{ "ok": false, "error": { "code": "invalid_request", "message": "..." }, "traceId": "uuid" }
```

Una repetición idéntica devuelve `x-idempotent-replay: true`; reutilizar la misma clave para otra ruta/carga devuelve 409.

## Rutas

| Método | Ruta | Finalidad |
|---|---|---|
| GET | `/health` | configuración/autenticación y hora |
| GET | `/lookup?entityType=&id=` | entidad canónica |
| GET | `/search?q=` | búsqueda acotada |
| GET/POST | `/activities` | timeline y alta idempotente |
| GET | `/followups` | seguimientos con contacto primario |
| PATCH | `/followups/:id` | estado/resumen/siguiente acción |
| GET/POST | `/tasks` | listar o crear tarea |
| PATCH | `/tasks/:id` | estado/fecha/prioridad |
| GET/POST | `/drafts` | listar o crear borrador pendiente |
| PATCH | `/drafts/:id` | proveedor confirma `sent`/`failed` |
| GET/PATCH | `/campaigns/:id` | contexto o guardar URLs de assets |
| GET | `/deliverables` | entregables filtrados |
| GET | `/risks` | alertas activas |
| GET | `/executive-summary` | agregado de solo lectura |

Los listados usan `limit` (1–100) y `offset` (0–10000). Las fechas-hora son ISO 8601 con zona; las fechas simples son `YYYY-MM-DD`.

## Ejemplo seguro

```bash
curl -sS "$SOCIALPRO_BASE_URL/api/integrations/v1/health" \
  -H "Authorization: Bearer $SOCIALPRO_INTEGRATION_TOKEN"
```

```bash
curl -sS -X POST "$SOCIALPRO_BASE_URL/api/integrations/v1/activities" \
  -H "Authorization: Bearer $SOCIALPRO_INTEGRATION_TOKEN" \
  -H "Idempotency-Key: gmail-message-123" \
  -H "Content-Type: application/json" \
  --data '{"entityType":"contact","entityId":"123","activityType":"email_received","channel":"email","direction":"inbound","summary":"Correo de prueba","source":"staging","externalId":"message-123"}'
```

No usar `curl -v` con tokens en terminal compartido o logs de CI.
