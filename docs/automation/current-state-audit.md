---
summary: Auditoría de capacidades existentes y huecos cubiertos por la base de automatización.
read_when:
  - Evaluar alcance o utilidad del proyecto
---

# Auditoría de estado

## Ya existía

- CRM de marcas/contactos/seguimientos, campañas y entregables.
- Tareas semanales, contratos, facturas, alertas y roles administrativos.
- Neon/Drizzle, crons Vercel y endpoints administrativos.
- Integraciones puntuales de correo y Google Sheets, pero no un plano general de automatización.

## Huecos encontrados

- no había timeline normalizado para actividad externa;
- n8n no tenía API M2M limitada y podía inducir acceso directo a DB;
- no había outbox transaccional, firma, reintentos ni dead-letter;
- no existía barrera de borrador/aprobación/proveedor;
- seguimiento y campañas usaban campos duplicados o carecían de endpoints acotados;
- no había despliegue reproducible, backups, catálogo de eventos ni runbook.

## Cubierto en esta fase

- seis tablas durables y dos migraciones aditivas;
- driver transaccional correcto y eventos en campañas/entregables;
- API v1 con Zod, token, rate limit e idempotencia;
- dispatcher HMAC y revisión administrativa;
- siete workflows inactivos, Compose/Caddy/Postgres, backup y documentación;
- pruebas estructurales/semánticas y validación de assets.

## Pendiente de entorno, no de código

- aplicar migración y pruebas de carrera contra PostgreSQL real de staging;
- importar workflows y enlazar OAuth/proveedores;
- comprobar semántica `rawBody` en la versión n8n desplegada;
- prueba extremo a extremo con cuentas de staging;
- configurar cron de producción solo tras aceptación.

El sistema es útil como base segura y operable; todavía no debe describirse como integración productiva hasta superar esos puntos.
