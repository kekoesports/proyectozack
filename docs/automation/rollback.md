---
summary: Reversión segura de aplicación, workflows y datos de automatización.
read_when:
  - Preparar o ejecutar un rollback
---

# Rollback

## Parada inmediata sin perder eventos

1. Desactivar los siete workflows.
2. Quitar temporalmente `N8N_AUTOMATION_WEBHOOK_URL` de Vercel y redesplegar, o deshabilitar el cron dispatcher.
3. No borrar el outbox: los eventos pendientes quedan recuperables.
4. Revocar OAuth/bots solo si existe compromiso de credenciales.

## Aplicación

Revertir el commit de aplicación mediante una PR nueva. El dispatcher sin URL/secreto falla cerrado y no reclama eventos.

## Base de datos

Las migraciones 0115–0116 son aditivas. En producción no eliminar tablas como primer rollback: mantenerlas evita pérdida de auditoría y permite volver al código nuevo. Para una rama de staging desechable se puede recrear la rama Neon desde el punto anterior.

Si por obligación se requiere retirada permanente, exportar primero:

- `automation_event_outbox` y `automation_webhook_deliveries`;
- `crm_activities` y `communication_drafts`;
- configuración de rate-limit/idempotencia si se necesita investigación.

Después preparar una migración Drizzle explícita y revisada; nunca ejecutar `DROP` improvisado en consola.

## n8n

Antes de cambiar versión:

```bash
cd automation/n8n
./backup.sh
docker compose pull
docker compose up -d
```

Para volver, fijar la imagen anterior compatible y restaurar el dump solo si hubo migración irreversible de la base de n8n. Probar primero en otro proyecto Compose.
