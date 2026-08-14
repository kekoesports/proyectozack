---
summary: Operación, pruebas y recuperación cotidiana de automatización.
read_when:
  - Validar un despliegue
  - Investigar un fallo de workflow o outbox
---

# Runbook

## Validación local

```bash
npm ci
npm run test:automation
npx tsc --noEmit
npm run lint
DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci_check npx drizzle-kit check
docker compose --env-file automation/n8n/.env.example \
  -f automation/n8n/docker-compose.yml config --quiet
```

`npm run build` ejecuta migraciones y SSG contra un DB real: no se usa como sustituto de staging ni con una URL inventada.

## Smoke test de staging

1. Probar `/health` con token correcto, ausente e incorrecto.
2. Crear dos veces una actividad con igual clave: misma respuesta, una sola fila.
3. Crear dos veces un borrador con `automationKey`: una sola fila en `pending_approval`.
4. Intentar marcarlo enviado: debe dar 409.
5. Aprobarlo como administrador y marcarlo enviado con proveedor de prueba.
6. Crear/actualizar campaña y confirmar outbox + delivery + actividad.
7. Apagar temporalmente n8n, provocar evento, restaurar y confirmar reintento.
8. Forzar máximo de intentos en staging, confirmar `dead_letter` y retry administrativo.
9. Repetir evento `campaign.approved`: una sola carpeta/hoja (confirmar manualmente).
10. Ejecutar backup y restaurarlo en un proyecto Compose vacío.

## Diagnóstico

```bash
cd automation/n8n
docker compose ps
docker compose logs --since=30m n8n
docker compose logs --since=30m postgres
docker compose logs --since=30m caddy
```

Usar `traceId` y `x-event-id` para correlacionar API, outbox y n8n. No copiar cuerpos con PII o cabeceras de autorización a incidencias.

| Síntoma | Comprobación | Acción |
|---|---|---|
| 401 | token difiere | rotar/sincronizar secreto |
| 429 | exceso de llamadas | corregir bucle; no subir límite sin causa |
| 503 `integration_not_configured` | falta token Vercel | configurar y redesplegar |
| firma inválida | reloj/raw body/secreto | sincronizar NTP y validar cuerpo crudo |
| outbox `failed` | delivery history | corregir receptor; esperar retry |
| `dead_letter` | error persistente | corregir y retry administrativo |
| Gmail/Drive 401 | OAuth expirado | reconectar cuenta de staging |
| duplicado externo | clave inestable | usar ID del proveedor/evento como clave |

## Backup

```bash
cd automation/n8n
./backup.sh
```

Programar fuera de Git con cron/systemd y enviar copias cifradas fuera del VPS. Una copia sin ensayo de restauración no se considera válida.
