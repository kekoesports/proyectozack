# Runbook — copias de seguridad y restauración

> **Sin una restauración probada de verdad no se autoriza el cutover.** Un
> backup que nunca se ha restaurado no es un backup: es un fichero grande.

## Qué se copia

| Qué | Cada cuánto | Por qué importa |
|---|---|---|
| PostgreSQL del CRM | 6 h | los datos |
| Ficheros públicos | diario | recuperables desde el CRM, pero lentos de rehacer |
| Ficheros privados | diario | facturas y contratos: no se pueden rehacer |
| PostgreSQL de n8n | diario | workflows y ejecuciones |
| Volumen `n8n_data` | diario | credenciales cifradas |
| Configuración | diario | Caddyfile, compose |

Retención: **7 diarias · 4 semanales · 12 mensuales**, cifradas y **fuera del
VPS**.

**Lo que no entra en la copia:** ficheros `.env`, secretos sin cifrar,
contraseñas ni tokens. Un backup con secretos dentro convierte cada copia en
una filtración esperando a pasar.

## Ejecutar una copia

```bash
sudo -u deploy /opt/socialpro/backups/backup.sh
```

Falla —a propósito— si no puede subir fuera del VPS. **Una copia que vive en el
mismo servidor no es una copia**: si el disco falla o se borra el VPS, se va con
él.

## Restaurar: el ensayo obligatorio

Se hace en un proyecto Docker **temporal y aparte**. Nunca sobre producción.

### 1. Traer la copia y comprobarla

```bash
rclone copy gdrive:socialpro-backups/20260821T020000Z /tmp/restore-test
cd /tmp/restore-test && sha256sum -c SHA256SUMS
```

Si un checksum no cuadra, esa copia **no sirve**. Se prueba con la anterior y
se investiga por qué se corrompió.

### 2. PostgreSQL temporal

```bash
docker run -d --name pg-restore-test \
  -e POSTGRES_PASSWORD=temporal \
  -e POSTGRES_DB=socialpro \
  postgres:17.6-bookworm
```

### 3. Restaurar

```bash
docker exec -i pg-restore-test pg_restore \
  --exit-on-error --no-owner --no-acl --jobs=2 \
  -U postgres -d socialpro < crm.dump
```

`--exit-on-error` es deliberado: sin él, `pg_restore` sigue tras un fallo y
termina con una base incompleta que **parece** correcta.

### 4. Verificar que los datos están de verdad

```bash
docker exec -i pg-restore-test psql -U postgres -d socialpro -c "
  SELECT
    (SELECT count(*) FROM campaigns)              AS campanas,
    (SELECT count(*) FROM talents)                AS talentos,
    (SELECT count(*) FROM invoices)               AS facturas,
    (SELECT count(*) FROM deal_deliverable_items) AS evidencias,
    (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migraciones;"
```

Los números tienen que cuadrar con producción. Que `pg_restore` termine sin
error no basta: hay que **mirar las filas**.

### 5. Arrancar la aplicación contra lo restaurado

Es el único paso que prueba lo que de verdad importa: que la aplicación
funciona sobre esa copia. Un dump que restaura pero contra el que la aplicación
no arranca no sirve de nada.

### 6. Limpiar

```bash
docker rm -f pg-restore-test && rm -rf /tmp/restore-test
```

## Medir RPO y RTO

Anotar en cada ensayo:

- **RPO** — cuánto se perdería. Con copias cada 6 h, hasta 6 h de datos.
- **RTO** — cuánto se tarda en volver. Es lo que hay que medir; estimarlo no
  vale.

## Restaurar ficheros

```bash
tar -xzf storage-private.tar.gz -C /opt/socialpro/data
chown -R 1000:1000 /opt/socialpro/data/storage-private
chmod -R u=rwX,g=,o= /opt/socialpro/data/storage-private
```

Los permisos importan tanto como los datos: un directorio privado con permisos
abiertos deja de ser privado.

## Restaurar n8n

Solo si hace falta. **Antes de tocar nada, comprobar que existe
`N8N_ENCRYPTION_KEY`**: sin esa clave, las credenciales del volumen restaurado
son ilegibles y n8n arranca vacío de conexiones.

## Cuándo se considera probado

- [ ] Checksums verificados
- [ ] Base restaurada sin errores
- [ ] Recuentos cuadrados
- [ ] Aplicación arrancada contra la copia
- [ ] Ficheros restaurados con permisos correctos
- [ ] RTO medido
- [ ] Ensayo repetido al menos una vez durante la observación
