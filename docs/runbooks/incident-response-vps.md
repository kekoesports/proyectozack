# Runbook — respuesta a incidentes

## Orden de comprobación

Siempre igual, de fuera hacia dentro:

```bash
# 1. ¿Vive el servidor?
ping -c2 159.195.112.100

# 2. ¿Responde el proxy?
curl -sI https://socialpro.es | head -1

# 3. ¿Qué contenedores están en pie?
docker ps --format "{{.Names}}\t{{.Status}}"

# 4. ¿Qué dice la aplicación de sí misma?
curl -s https://socialpro.es/api/health/ready | jq

# 5. Recursos
free -h; df -h /; uptime
```

## Síntomas frecuentes

### La web no responde, n8n sí

Caddy está bien; el problema es el CRM. `docker logs socialpro-crm-app-1 --tail 100`.

### `ready` devuelve 503

Dice cuál de las tres comprobaciones falla:

- `database` → mirar el contenedor de PostgreSQL
- `migrations` → la tabla de migraciones está vacía o inaccesible
- `storage` → permisos o disco lleno

### Todo lento

```bash
docker stats --no-stream
free -h
```

Si la memoria está al límite, el kernel matará algo. Parar el CRM libera sin
tocar n8n:

```bash
docker compose -p socialpro-crm stop app scheduler
```

### Disco lleno

```bash
df -h /; docker system df
docker system prune -f          # nunca --volumes
journalctl --vacuum-size=200M
```

**`--volumes` jamás**: borraría los datos de PostgreSQL y de n8n.

### Un cron no se ejecutó

```bash
docker logs socialpro-crm-scheduler-1 --tail 50
```

Comprobar que `CRON_SECRET` coincide con el de la aplicación, y que **no está
también programado en Vercel**: si corren los dos, cada tarea se ejecuta dos
veces.

## Antes de tocar nada

1. **Anotar la hora.**
2. **Volcar la base** si el incidente afecta a datos.
3. No rotar secretos: multiplica las variables en mitad de un problema.
4. No reconstruir imágenes bajo presión.

## Escalado

| Situación | Acción |
|---|---|
| Solo el CRM afectado | Rollback a la imagen anterior |
| Base corrupta | Parar escrituras, volcar, y `backup-restore-vps.md` |
| VPS inaccesible | Consola del panel de netcup |
| Pérdida de datos confirmada | Parar todo, no escribir nada más, evaluar con calma |
