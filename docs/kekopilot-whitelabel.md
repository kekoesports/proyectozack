# KekoPilot white-label

El panel puede venderse como un despliegue de marca blanca aislado por cliente.
La identidad se define en el entorno del contenedor, sin recompilar componentes
ni mantener una copia distinta del frontend.

## Configuración por cliente

```dotenv
KEKOPILOT_PANEL_BRAND_NAME=Northrail OS
KEKOPILOT_PANEL_APP_URL=https://panel.northrail.example
KEKOPILOT_PANEL_ASSISTANT_NAME=Atlas Operaciones
KEKOPILOT_PANEL_AGENT_NAME=Atlas
KEKOPILOT_PANEL_ACCENT_COLOR=#1849a9
KEKOPILOT_PANEL_REFERENCE_PREFIX=NR
KEKOPILOT_PANEL_SUPPORT_URL=https://northrail.example/support
KEKOPILOT_PANEL_LOGO_PATH=/brands/northrail.svg
KEKOPILOT_PANEL_WORKSPACE_NAME=Northrail Agency
KEKOPILOT_PANEL_WORKSPACE_META=Workspace comercial
KEKOPILOT_PANEL_WORKSPACE_INITIALS=NA
KEKOPILOT_PANEL_HOME_PATH=/admin
```

`KEKOPILOT_PANEL_APP_URL` fija el dominio canónico y evita que metadatos de otra
marca aparezcan en buscadores, tarjetas sociales o pestañas. `KEKOPILOT_PANEL_LOGO_PATH`
es opcional. Debe apuntar a un recurso público del
mismo despliegue; si falta, el panel genera una marca con las iniciales. El
color de texto sobre el acento se calcula automáticamente para conservar
contraste.

La configuración se aplica al acceso, metadatos, navegación, Command Center,
referencias de deals, fuentes de actividad y llamadas al asistente. Los valores
se validan al arrancar y una configuración inválida impide publicar un panel a
medias.

## Modelo comercial seguro

La modalidad soportada ahora es **un despliegue y una base de datos por
cliente**. Así quedan aislados identidad, usuarios, documentos y datos
operativos. Para una instalación gestionada:

1. Crear un dominio o subdominio del cliente en Cloudflare.
2. Crear un entorno, almacenamiento y PostgreSQL aislados en el VPS.
3. Añadir el logo al directorio público del artefacto y configurar las variables.
4. Ejecutar migraciones, crear el administrador inicial y validar `/api/health/ready`.
5. Publicar el upstream solo después de comprobar acceso, permisos y backups.

No deben mezclarse varios clientes en la misma base de datos. El esquema actual
no aplica todavía un `workspace_id` a todas las entidades, por lo que presentarlo
como multitenant compartido crearía riesgo de exposición cruzada. Ese modelo
requiere una fase separada de tenancy, facturación, provisión y auditoría.

## KekoPilot y SocialPro

KekoPilot conserva su dominio, producto y panel propios. La web pública incluye
una atribución contextual y un enlace de pie a `https://socialpro.es`; el panel
de cada cliente no muestra la marca SocialPro salvo que se configure así de
forma explícita.
