# ADR 0006: SocialPro mantiene el dominio; n8n orquesta

- Estado: aceptado para staging
- Fecha: 2026-08-14

## Contexto

SocialPro necesita automatizar correo, seguimiento, campañas, entregables, riesgos y resúmenes sin permitir que un orquestador externo salte permisos o corrompa el estado.

## Decisión

SocialPro conserva su base como fuente de verdad y expone una API M2M versionada. Los eventos salen mediante outbox transaccional firmado. n8n usa PostgreSQL propio, coordina proveedores y devuelve resultados por API. Toda comunicación externa parte de un borrador y exige aprobación humana.

Las rutas M2M no usan `requireRole()` porque no representan una sesión humana; usan token constante, rate-limit durable, Zod e idempotencia. Las acciones humanas de revisión sí usan rol administrativo.

## Consecuencias

Positivas: menor radio de impacto, auditoría, reintentos, deduplicación y reemplazo futuro del orquestador. Costes: más endpoints y tablas, dos conexiones Drizzle y operación de n8n/PostgreSQL/Caddy.

## Alternativas descartadas

- n8n con acceso directo a Neon: acoplamiento y evasión de dominio.
- webhooks “best effort” dentro de la mutación: pérdida de eventos o latencia/fallo al usuario.
- envío autónomo generado por IA: riesgo legal, reputacional y de destinatario.
