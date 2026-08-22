# Runbook — vuelta atrás

## Lo primero

**Volver a Neon no es un rollback.** Si ya hubo escrituras en el VPS, apuntar
de nuevo a Neon pierde todo lo escrito desde el cutover, y lo hace en silencio.

El rollback normal es: **conservar la base del VPS y volver a la imagen
anterior**.

## Aplicación (el caso habitual)

```bash
caddy validate --config /etc/caddy/Caddyfile
CRM_UPSTREAM=app-anterior:3000 caddy reload --config /etc/caddy/Caddyfile
```

Segundos. Sin reconstruir, sin tocar datos.

**No se reconstruye la imagen durante un incidente.** Reconstruir bajo presión,
sin saber aún qué falló, alarga cinco minutos hasta dos horas.

## Migración que salió mal

Si una migración dejó el esquema en mal estado:

1. **No aplicar más migraciones.**
2. Volcar el estado actual antes de tocar nada.
3. Restaurar la copia anterior en una base temporal y comparar.
4. Decidir con los datos delante.

Nunca "arreglar hacia delante" sobre una base en estado desconocido.

## Emergencia: parar sin perder datos

```bash
docker compose -p socialpro-crm stop app scheduler
```

Se para la aplicación y las tareas, **PostgreSQL sigue vivo**. Así deja de
entrar tráfico sin cerrar la puerta a los datos.

## Lo que nunca se hace

- Borrar el volumen de PostgreSQL para "empezar limpio"
- Forzar checkout o descartar cambios sin volcarlos antes
- Rotar secretos en mitad de un incidente
- Tocar Neon o Vercel Blob mientras son la red de seguridad
