# Migración de las tareas programadas

## Los ocho

Todos en UTC, con los mismos horarios. La equivalencia a `Europe/Madrid` (verano)
está anotada en el crontab.

| Ruta | Cron | Madrid |
|---|---|---|
| `snapshot-metrics` | `0 6 * * *` | 08:00 |
| `rollover-tasks` | `0 5 * * 1` | lunes 07:00 |
| `backup` | `0 2 * * *` | 04:00 |
| `sync-metrics` | `0 7 * * 1` | lunes 09:00 |
| `sync-news-alerts` | `0 7 * * *` | 09:00 |
| `sync-sheet-sources` | `0 23 * * *` | 01:00 (día siguiente) |
| `generate-recurring-expenses` | `0 3 * * *` | 05:00 |
| `giveaway-lifecycle` | `7 * * * *` | cada hora, minuto 7 |

**Los horarios no se cambian al migrar.** Cambiar la hora y la infraestructura a
la vez haría imposible saber de dónde viene una diferencia de comportamiento.

## El noveno

`poll-live-status` tiene handler completo y autenticación, pero **ningún horario
en `vercel.json`**. Hay nueve directorios de cron y ocho horarios.

Queda **fuera del scheduler a propósito**: añadirlo "por si acaso" podría
ponerlo a correr por primera vez en su vida. Antes hay que aclarar si está
muerto, si lo dispara n8n o si se llama a mano.

## Autenticación

`assertCronAuth` ya admite `Authorization: Bearer ${CRON_SECRET}` además de la
cabecera de Vercel. Esa vía existe y está probada, así que fuera de Vercel no
hace falta cambiar código.

## Un solo dueño por tarea

⚠️ **Al activar el scheduler hay que desactivar los crons de Vercel.**

Si quedan los dos, cada tarea corre dos veces. No todas son idempotentes, y
algunas —generación de gastos recurrentes, rollover de tareas— duplicarían
datos.

## El backup es la excepción

El backup de infraestructura **no** se llama por el endpoint del CRM: corre
directamente contra los contenedores de PostgreSQL. Un backup que necesita que
la aplicación responda deja de funcionar justo el día que hace falta.

El cron `/api/cron/backup` del CRM se mantiene para lo suyo, pero no es el
backup de infraestructura.
