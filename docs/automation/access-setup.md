---
summary: Accesos y secretos necesarios para staging y producción.
read_when:
  - Preparar un entorno de automatización
  - Solicitar permisos a proveedores
---

# Preparación de accesos

No enviar secretos por chat ni guardarlos en el repositorio.

## SocialPro / Vercel

En staging:

- `SOCIALPRO_INTEGRATION_TOKEN`: aleatorio, mínimo 32 bytes.
- `AUTOMATION_WEBHOOK_SECRET`: aleatorio e independiente.
- `N8N_AUTOMATION_WEBHOOK_URL`: URL de producción del workflow 03.
- `INTEGRATION_RATE_LIMIT_PER_MINUTE`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_TIMEOUT_MS`: usar valores por defecto inicialmente.
- `CRON_SECRET`: ya empleado por los crons del proyecto.

El token y el HMAC se copian también al `.env` de n8n. El resto no se comparte.

## Infraestructura

- rama Neon de staging y confirmación de `__drizzle_migrations`;
- VPS Linux, DNS del subdominio y puertos 80/443;
- correo operativo para ACME;
- almacenamiento externo/cifrado para copias.

## Proveedores

- cuenta Google de staging con Gmail, Drive y Sheets;
- carpeta Drive de staging y OAuth conectado manualmente en n8n;
- bot/chat privado de Telegram de staging;
- webhook de canal privado de Discord de staging;
- proyecto OpenAI separado, presupuesto/alertas y clave solo si se activa workflow 07.

## Valores no necesarios

n8n no necesita `DATABASE_URL` de SocialPro, credenciales de Better Auth, acceso a Vercel Blob ni contraseña de administrador.
