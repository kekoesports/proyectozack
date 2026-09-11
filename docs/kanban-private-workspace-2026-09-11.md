---
read_when: Operating or deploying the personal tasks, Kanban and quick-notes workspace.
---

# Tareas personales y post-it — 2026-09-11

Actualización posterior, 09:55 UTC: [borrado confirmado de notas](quick-note-deletion-2026-09-11.md) documenta el contenedor y la reversión actuales. Se conserva aquí la evidencia de Kanban y privacidad.

## Decisión vigente

Kanban es la primera vista de `/admin/tareas`. Lista y Calendario siguen disponibles. Las notas rápidas permanecen recogidas en un post-it personal arriba a la derecha; permite desplegar las últimas notas, minimizar y escribir sin abandonar la página.

Las tarjetas tienen **Completar** y, con permiso de borrado, **Eliminar** con confirmación. Cancelar conserva la tarea. Borrar una tarea no elimina la nota original vinculada.

Todos los roles, incluido `admin`, ven y gestionan únicamente tareas de las que son responsables o a las que están asignados. Ser autor de una tarea asignada a otra persona no concede acceso. El filtro alcanza consultas de lista/calendario, búsqueda global, enlaces directos y acciones del servidor. Las operaciones internas sin sesión mantienen su contrato de equipo.

## Implementación y pruebas

- Commit de implementación: `32f44268944f41c268065d326374bf7e1ae48170`, publicado en master.
- Tipos, lint de archivos afectados y metadatos Drizzle correctos. CI de master terminado correctamente. No hay cambios de esquema ni migraciones nuevas.
- 62 pruebas de acciones, propiedad y roles correctas. Incluyen admin y admin limitado: propias permitidas, ajenas rechazadas, borrado en lote y revisión de tareas arrastradas.
- Primera imagen compilada: navegador con PostgreSQL 17 aislado y cinco identidades sintéticas, contraseña real Better Auth 1.7.3. Kanban inicial, privacidad, enlace directo rechazado, enlace propio, completar persistido, cancelar/borrar con confirmación, nota conservada, post-it de escritorio y móvil, cero errores JS. Acciones forjadas entre ambas identidades rechazadas por el servidor.
- Pruebas fuera de producción; no se crearon usuarios, tareas ni notas sintéticas en el CRM real.

## Integración con la versión publicada

La comprobación previa detectó que otra tarea había publicado `socialpro-crm-platform-review-20260911`. El cambio de Caddy se detuvo antes de modificarlo. Se coordinó una versión conjunta con los 14 archivos de los manifiestos `web-source-manifest.json` y `web-v2-source-manifest.json`, verificando sus hashes.

Fuente conjunta: `/home/deploy/socialpro-kanban-platform-20260911`. Conserva el código vivo de autenticación, captación, contenido, contratos y la migración `0162_quick_notes_task_notices`. **No desplegar master sin reconciliar estas mejoras vivas.**

La compilación conjunta agotó memoria; también se probaron límites de memoria y Webpack sin éxito. Se identificaron seis versiones retiradas de la web que seguían consumiendo memoria. Antes de detenerlas se comprobó que no tenían puertos ni alias, ni referencias en Caddy, crontabs, entornos de contenedores o workflows n8n. Se conservaron contenedores, imágenes y datos para reversión. No se modificaron servicios activos ni el scheduler. Tras liberar memoria se restauraron el Dockerfile y la configuración Next originales para compilar con Turbopack y el guard de base de datos de solo lectura.

Evidencias y configuración privada: `/home/deploy/.config/socialpro/kanban-20260911/`. No copiar credenciales, archivos de entorno ni copias de datos a Git.

## Estado final

| Estado | Evidencia |
| --- | --- |
| IMPLEMENTED | Commit `32f44268`, integrado con los 14 archivos de plataforma |
| TESTED | 62 pruebas, CI, build definitivo y navegador sobre la imagen final correctos |
| ACTIVE | Publicado el 11-09-2026 a las 09:42:50 UTC |
| FUNCTIONING | Sesión real de Pablo: Kanban seleccionado, 19 tareas propias, botones visibles y nota existente cargada en el post-it |

Navegador final aislado: se repitieron los recorridos anteriores y la búsqueda global, que excluye tareas ajenas aunque el administrador las haya creado. Contraseñas reales; sin bypass de autenticación. Escrituras y borrados se probaron únicamente en la base aislada. La comprobación pública fue de lectura, sin modificar tareas del usuario.

- Contenedor activo: `socialpro-crm-kanban-platform-20260911`.
- Imagen: `socialpro:kanban-platform-20260911`, digest `sha256:48b5a92e2d18ab2c60d9ec2fcc5e9b6c3a4fcd5ed7ef6e6d0fd434efa19465c6`.
- Caddy: solo se sustituyó el upstream de SocialPro, con comparación del hash previo. Configuración final: `23a6b25b9e99b8a8f51e46047bdff11ed35adf6320243ce16af86fa45b73c560`.
- Entorno y montajes idénticos a la versión anterior, salvo identificación de versión. Base y diario sin cambios: 214 migraciones. Portada y readiness correctos; contenido y enlace TikTok presentes.
- El scheduler conserva su configuración; el cron de notas sigue usando el contenedor `socialpro-crm-quick-notes-20260911`, que permanece operativo.
- Eliminados el servidor de prueba, PostgreSQL aislado, volumen, red, túnel y credenciales temporales. Cero tareas de esta prueba en la base real.

Reversión: devolver exclusivamente el upstream de SocialPro a `socialpro-crm-platform-review-20260911`, conservado operativo. Mantener datos, notas y migraciones; no restaurar la base ni borrar tablas. Las seis versiones históricas retiradas están documentadas en `retired-stopped.json` y se pueden arrancar individualmente si una reversión antigua lo requiere.
