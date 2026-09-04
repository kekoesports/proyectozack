# Migración de las tareas programadas

## Los once

Todos en UTC, con los mismos horarios. La equivalencia a `Europe/Madrid` (verano)
está anotada en el crontab.

| Ruta | Cron | Madrid |
|---|---|---|
| `snapshot-metrics` | `0 6 * * *` | 08:00 |
| `rollover-tasks` | `0 5 * * 1` | lunes 07:00 |
| `sync-metrics` | `0 7 * * 1` | lunes 09:00 |
| `sync-news-alerts` | `0 7 * * *` | 09:00 |
| `keydrop-daily-report` | `15 7 * * *` | 09:15 |
| `discover-creator-targets` | `30 6 * * *` | 08:30 |
| `sync-ip-evidence` | `30 22 * * *` | 00:30 (día siguiente, verano) |
| `sync-sheet-sources` | `0 23 * * *` | 01:00 (día siguiente) |
| `generate-recurring-expenses` | `0 3 * * *` | 05:00 |
| `giveaway-lifecycle` | `7 * * * *` | cada hora, minuto 7 |
| `sync-slash` | `15 5 * * *` | 07:15 |

**Los horarios no se cambian al migrar.** Cambiar la hora y la infraestructura a
la vez haría imposible saber de dónde viene una diferencia de comportamiento.

## Rutas internas no programadas

`poll-live-status` tiene handler completo y autenticación, pero **ningún horario
en `vercel.json`**. `backup` también existe como ruta interna/manual, pero la
copia real de infraestructura corre mediante el timer cifrado del VPS.

Queda **fuera del scheduler a propósito**: añadirlo "por si acaso" podría
ponerlo a correr por primera vez en su vida. Antes hay que aclarar si está
muerto, si lo dispara n8n o si se llama a mano.

## Autenticación

`assertCronAuth` exige `Authorization: Bearer ${CRON_SECRET}` tanto en Vercel
como en el VPS. La antigua confianza en `x-vercel-cron` se retiró porque esa
cabecera se podía falsificar desde Internet.

## Un solo dueño por tarea

⚠️ **Al activar el scheduler hay que desactivar los crons de Vercel.**

Si quedan los dos, cada tarea corre dos veces. No todas son idempotentes, y
algunas —generación de gastos recurrentes, rollover de tareas— duplicarían
datos.

## El backup es la excepción

El backup de infraestructura **no** se llama por el endpoint del CRM: corre
directamente contra los contenedores de PostgreSQL. Un backup que necesita que
la aplicación responda deja de funcionar justo el día que hace falta.

La ruta `/api/cron/backup` del CRM se conserva solo para uso manual/interno y no
se programa. El backup real es `socialpro-backup-remote.timer`, con volcado,
cifrado, copia a Drive y verificación.
