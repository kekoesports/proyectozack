# Infraestructura del VPS

Cuatro proyectos Compose independientes. Se comunican por la red externa
`socialpro_edge`, y **solo Caddy publica puertos en el host**.

```
/opt/socialpro/
├── n8n/          automatización — YA EXISTE, no se toca
├── crm/          aplicación + PostgreSQL 17 + scheduler
├── monitoring/   Uptime Kuma
├── backups/      scripts
└── data/
    ├── postgres-crm/
    ├── storage-public/
    └── storage-private/     ← nunca bajo una raíz web
```

## Estado

**Nada de esto está desplegado todavía.** El VPS actual (2 vCPU / 3,83 GiB) no
tiene capacidad: ver `docs/migration/00-vps-capacity-audit.md`. Los ficheros
están dimensionados para 4 vCPU / 8 GB.

## Orden de despliegue

Una vez ampliado el VPS:

```bash
# 1. Red compartida (una sola vez)
docker network create socialpro_edge

# 2. Conectar el Caddy existente. NO reinicia el contenedor: n8n sigue sirviendo.
docker network connect socialpro_edge socialpro-automation-caddy-1

# 3. Secretos, root-only
sudo install -d -m 700 /opt/socialpro/crm/secrets
openssl rand -base64 32 | sudo tee /opt/socialpro/crm/secrets/postgres_password >/dev/null
sudo chmod 600 /opt/socialpro/crm/secrets/postgres_password

# 4. Entorno
cp crm/env/app.env.example crm/env/app.env   # rellenar y chmod 600

# 5. Arrancar
CRM_IMAGE=socialpro:$(git rev-parse --short HEAD) \
  docker compose -f crm/compose.yaml up -d
```

## Lo que no se toca de n8n

Perder cualquiera de estas cosas significa perder las credenciales guardadas o
los certificados:

- `N8N_ENCRYPTION_KEY`
- volumen `socialpro-automation_n8n_data`
- base de datos de n8n
- volúmenes `caddy_data` y `caddy_config`

El Caddyfile de `edge/` **amplía** el que ya existe; no lo sustituye. El bloque
de n8n se conserva palabra por palabra porque ese dominio ya tiene certificado
emitido y funcionando.

## Decisiones que conviene no revertir sin pensarlo

**Dos PostgreSQL, no uno.** El de n8n (16) se queda donde está. Compartirlos
ataría el ciclo de vida de dos sistemas que no tienen por qué caer juntos, y
una restauración del CRM obligaría a parar la automatización.

**La aplicación no puede alterar el esquema.** `socialpro_app` tiene permisos
de datos, no de DDL. Así un fallo en tiempo de ejecución no puede convertirse
en un cambio de estructura.

**El healthcheck de la app apunta a `live`, no a `ready`.** Si apuntara a
`ready`, una caída de la base haría que Docker reiniciara en bucle un
contenedor que está perfectamente sano.

**El backup no depende del CRM.** Habla directamente con los contenedores de
PostgreSQL. Un backup que necesita que la aplicación responda deja de funcionar
justo el día que hace falta.

**Sistema de ficheros, no MinIO.** Para el volumen actual, un servidor S3
añadiría un servicio, un modo de fallo y superficie de ataque a cambio de nada.
La interfaz de almacenamiento ya permite añadirlo después sin tocar a los
consumidores.
