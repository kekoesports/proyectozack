---
summary: Instalación, activación y uso diario de la automatización operativa de SocialPro.
read_when:
  - Desplegar o actualizar n8n
  - Activar los flujos de automatización
  - Entender el circuito de revisión humana
---

# Automatización operativa de SocialPro

Esta base conecta el CRM con un n8n autoalojado sin dar a n8n acceso directo a la base de datos. SocialPro conserva la verdad, permisos, validación, historial e idempotencia; n8n coordina Gmail, Drive, Telegram, Discord y el resumen asistido por IA.

## Qué está preparado

1. Registrar correo entrante y enviar únicamente borradores ya aprobados.
2. Convertir seguimientos vencidos en borradores pendientes de aprobación.
3. recibir eventos firmados de campañas y entregables, registrarlos y enrutar avisos.
4. Crear carpeta y hoja de seguimiento cuando se aprueba una campaña.
5. Crear tareas de entregables próximos o modificados.
6. Convertir riesgos altos de contratos/finanzas en tareas.
7. Enviar un resumen ejecutivo de solo lectura, de lunes a viernes.

Todos los workflows versionados están `active: false`. Ninguno se debe activar en producción hasta completar la lista de aceptación de staging.

## Instalación rápida en staging

Requisitos: un VPS Linux con Docker Engine y Compose v2, un subdominio con registros A/AAAA hacia el VPS y una rama Neon de staging.

```bash
cd automation/n8n
cp .env.example .env
chmod 600 .env
# editar .env con secretos de staging
docker compose pull
docker compose up -d
docker compose ps
```

Caddy solicita y renueva TLS automáticamente. n8n y su PostgreSQL tienen volúmenes independientes de Neon; nunca se configura `DATABASE_URL` de SocialPro en n8n.

En Vercel staging se añaden las variables descritas en `access-setup.md`, se despliega esta rama y se aplica la migración con el flujo normal `npm run migrate`. No usar `drizzle-kit push`.

## Importación y configuración de workflows

Desde n8n: **Workflows → Import from File** e importar, en orden, los siete JSON de `automation/n8n/workflows/`. También se pueden importar desde el contenedor:

```bash
docker compose exec n8n n8n import:workflow --separate --input=/opt/socialpro/workflows
```

Después se conectan manualmente las credenciales OAuth de Gmail y Google Drive/Sheets. Los JSON no incluyen IDs ni secretos de credenciales.

Orden de activación en staging:

1. `03-signed-event-router` y comprobar una firma real.
2. `04`, `05` y `06`, usando campañas/deliverables ficticios.
3. `02`, comprobando que solo crea borradores.
4. `01`, primero entrada de Gmail; al final envío con una cuenta y destinatario de prueba.
5. `07`, en un chat interno de prueba.

## Uso diario

- El equipo opera campañas, entregables, seguimientos y riesgos en SocialPro.
- n8n consulta y modifica únicamente la API `/api/integrations/v1` con token M2M.
- Un borrador generado queda `pending_approval`. Un administrador lo aprueba o rechaza mediante el endpoint administrativo; el proveedor solo puede marcar como enviado un borrador `approved`.
- Los eventos que no llegan se reintentan exponencialmente. Tras agotar intentos quedan en `dead_letter` y un administrador puede reintentarlos.
- La actividad resultante queda en `crm_activities`; no se utiliza el historial de ejecuciones de n8n como fuente de verdad.

## Criterio de “listo para producción”

- migración aplicada y rollback ensayado en una rama Neon desechable;
- HMAC validado con el cuerpo crudo exacto del webhook desplegado;
- token incorrecto devuelve 401, token ausente en servidor devuelve 503 y exceso devuelve 429;
- repetición de la misma clave no duplica actividad, borrador ni tarea;
- un borrador pendiente/rechazado no puede enviarse;
- backup generado y restaurado en una instancia vacía;
- proveedor real probado solo con cuentas, destinatarios y canales de staging;
- alertas y propietario operativo asignados.

Véanse `runbook.md` para pruebas/operación, `security.md` para límites y `rollback.md` para reversión.
