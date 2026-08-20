# Runbook — operaciones de almacenamiento

```
/opt/socialpro/data/storage-public/    ← servible por HTTP
/opt/socialpro/data/storage-private/   ← NUNCA bajo una raíz web
```

Si un fichero privado se puede pedir por URL, la comprobación de permisos de la
aplicación deja de significar nada. Esa separación es la garantía, no un detalle
de organización.

## Comprobar el estado

```bash
du -sh /opt/socialpro/data/storage-*
find /opt/socialpro/data/storage-private -type f | wc -l
```

## Permisos correctos

```bash
chown -R 1000:1000 /opt/socialpro/data/storage-*
chmod -R u=rwX,g=,o= /opt/socialpro/data/storage-private
chmod -R u=rwX,g=rX,o=rX /opt/socialpro/data/storage-public
```

El privado sin permisos de grupo ni de otros. Restaurar un backup y olvidar
esto deja los ficheros legibles para cualquier proceso del host.

## Lecturas que caen al respaldo

```bash
docker logs socialpro-crm-app-1 2>&1 | grep "leído del respaldo" | wc -l
```

Cada línea es un fichero que **todavía no se ha copiado** desde Vercel Blob.
Ese contador es el único dato que dice cuándo se puede apagar el respaldo. Que
llegue a cero y se mantenga varios días es requisito para la Fase 9.

## Verificar una copia

```bash
sha256sum /opt/socialpro/data/storage-private/RUTA
```

Debe coincidir con el checksum del informe de migración.

## Lo que nunca se hace

- Servir `storage-private` desde Caddy
- Derivar rutas del nombre que envía quien sube el fichero
- Borrar de Vercel Blob antes de terminar el periodo de respaldo
- Restaurar sin recolocar permisos
