# CRM SocialPro — Creadores Target, Zack y copias

Fecha: 25 de agosto de 2026.

## Creadores Target mundial

El buscador de `/admin/targets` permite:

- buscar canales de CS2 sin limitar el `regionCode` de YouTube con **Todo el mundo**;
- filtrar cualquier idioma o español, inglés, portugués, alemán y francés;
- exigir 8 vídeos dentro de 60 o 90 días;
- exigir al menos 1.000 vistas en cada vídeo auditado;
- separar `Marketplace sin azar` de `Cajas / gambling`;
- guardar país, actividad, decisión de cumplimiento, fuente y fecha de revisión.

La etiqueta es **Preseleccionado**, no “legalmente aprobado”.

### Marketplace sin azar

Se usa únicamente para compraventa de skins sin apuesta, azar ni premio. Un
canal con país declarado y métricas suficientes puede guardarse, pero antes del
contacto deben comprobarse las condiciones de la marca y del país.

### Cajas / gambling

Solo se preselecciona cuando el CRM tiene una fuente oficial que confirma que
existe una vía regulada. La marca concreta debe aparecer como operador
autorizado y su publicidad debe cumplir las reglas locales. Si no hay fuente o
el canal no declara país, queda en revisión manual.

Fuentes regulatorias integradas:

- España: DGOJ, buscador de operadores con licencia.
- Reino Unido: Gambling Commission, esports y skins betting.
- Portugal: SRIJ, entidades licenciadas.
- Alemania: GGL, whitelist oficial.
- Suecia: Spelinspektionen, directorio de licencias.
- Dinamarca: Spillemyndigheden, licencia de casino online.
- Colombia: Coljuegos, operadores online autorizados.
- Perú: MINCETUR, autorización de plataformas a distancia.
- Francia: ANJ, casino online marcado como oferta ilegal; las cajas quedan bloqueadas.

Esta matriz es un control operativo prudente, no asesoramiento jurídico. Los
mercados sin fuente validada se pueden descubrir, pero no aprobar para cajas.

## Navegación simplificada

Los accesos principales quedan reducidos a:

1. Panel.
2. Tratos.
3. Tareas.
4. Talentos.
5. Finanzas, solo para roles autorizados.

El resto permanece disponible dentro de `Más`, agrupado como Operaciones,
Crecimiento, Contenido, Administración y Sistema. No se ha eliminado ninguna
ruta ni función.

## Zack Operaciones

`Asistente IA` pasa a llamarse `Zack Operaciones`. Sigue siendo de solo lectura
y añade un resumen de:

- Creadores Target totales, pendientes y con preselección de cumplimiento;
- oportunidades de prensa gratuita y estado de outreach;
- alertas editoriales no leídas y publicaciones programadas;
- estado y antigüedad de la copia cifrada del VPS;
- campañas y finanzas mediante las herramientas ya existentes.

CRM Steward y Growth pueden usar la misma herramienta de resumen con sus
allowlists y permisos habituales. No pueden contactar, publicar ni modificar
registros mediante esta herramienta.

## Copias de seguridad

La pantalla `/admin/backups` deja de presentar el cron JSON antiguo de Vercel
como si fuera la copia principal. Ahora muestra:

- la copia completa cifrada del VPS a Google Drive;
- última copia verificada, antigüedad y frecuencia de seis horas;
- el export JSON manual como opción independiente, si está configurado.

El timer `socialpro-backup-remote.timer` es la fuente de verdad. El script solo
actualiza `/var/lib/socialpro-guardian/backup-last-success` después de que
`rclone copy` y `rclone check` terminen bien. Guardian publica `backup.failed`
si la unidad falla y `backup.heartbeat` usando exclusivamente esa marca de
éxito.
