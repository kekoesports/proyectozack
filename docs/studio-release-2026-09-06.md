---
read_when: using Studio in production, deploying the visual Studio release, or diagnosing creator access
---

# Studio: revisión visual y publicación

## Estado

Online desde el 6 de septiembre a las 16:41 UTC. Este registro sustituye las
notas históricas «solo local». Publicar la aplicación no hace públicos sus medios.

- URL canónica de esta entrega: `https://socialpro.es/studio`.
- Agencia: `https://socialpro.es/admin/studio`, usuarios admin/manager existentes.
- `app.socialpro.es` no tiene DNS. Su activación queda pendiente de IONOS,
  certificado, orígenes de autenticación y callbacks; no basta con un CNAME.
- Imagen de apertura: `socialpro:studio-f68e6a73`, fuente `f68e6a73`.
- Imagen vigente desde las 16:47 UTC: `socialpro:studio-29ebbf41`, fuente
  `29ebbf41`, servicio `socialpro-studio-final-web-1`. Añade compatibilidad de
  login con contraseñas válidas anteriores a la política nueva de alta.
- PR [446](https://github.com/kekoesports/proyectozack/pull/446) integrada mediante
  merge `36696c5a`. No se reescribió historia ni se sustituyeron cambios ajenos.
- Worker: `socialpro-studio-worker:eea5ecc4`; código de render idéntico al de la
  revisión web. Los cambios posteriores afectan proxy, upload HTTP e infraestructura.
- Misma base PostgreSQL, secreto de Better Auth y almacenes privados. Se conservan
  148 talentos y 8 cuentas; no se importan fixtures ni se restablecen contraseñas.

## Qué puede hacer cada usuario

La agencia entra con su cuenta habitual y ve el roster real, crea enlaces de
invitación y revisa guiones/exportaciones. Tener una ficha de talento **no** crea
una cuenta ni concede acceso automáticamente. La invitación vincula el correo
con la ficha existente. No se enviaron invitaciones en este despliegue.

Un creador con membresía activa accede a su inicio, proyectos, biblioteca,
plantillas, estadísticas, campañas, ideas, calendario e identidad. El servidor
filtra todas las lecturas/escrituras por esa membresía. Un admin sin membresía
se dirige a la gestión de agencia; todavía no existe un selector para editar
el espacio de cualquier talento como CM.

El material personal del piloto KEKO sigue en el almacén local de pruebas.
No hay ficha KEKO/Pablo en el roster de producción: no se inventó una asociación
ni se subieron su voz, retrato o máster a otro talento.

## Revisión visual

- Navegación agrupada, menú móvil, búsqueda y filtros de proyectos.
- Inicio con próximos pasos y recuentos calculados de proyectos/archivos propios.
- Gráficos SVG con selector de red y 7/30/90 días, puntos inspeccionables y tabla
  accesible. Procedencia/fecha visibles; sin cifras inventadas ni ceros que
  sustituyan datos ausentes. Variaciones solo con observaciones comparables.
- Roster CRM con fotos reales, búsqueda y carga progresiva.
- Motion Collection con profundidad al puntero y animación breve, sin WebGL
  pesado. Respeta `prefers-reduced-motion`; móvil sin desbordamiento en las vistas probadas.

## Motor activo y límites

HyperFrames 0.8.30 + Chromium Debian + FFmpeg trabajan en un contenedor separado,
como usuario no privilegiado, sin puertos públicos, sobre la red interna del CRM.
Una exportación por proceso; 2 CPU, 2 GiB RAM, 256 PIDs, raíz de solo lectura,
directorios temporales acotados y volumen privado compartido con Next.

Tres plantillas deterministas versionadas; exportación 9:16, 1:1 y 16:9. Los
recursos de entrada no se regeneran: cambiar una cartela no vuelve a sintetizar
cara o voz. Máximo 8 escenas, 120 segundos, 20 MiB por archivo; no es un editor
multipista de VODs largos. Se mantienen revisión humana y descarga privada.

Higgsfield **apagado** en esta entrega; no hay voz de proveedor ni compras
automáticas. Sin AI Gateway está disponible el asistente editorial de reglas,
no un chat libre de modelo. Whisper, lip-sync, OAuth/insights privados de las
redes y publicación automática siguen pendientes. Las métricas existentes del
CRM sí son reutilizables; un handle declarado no equivale a conexión OAuth.

## Pruebas ejecutadas

- Tipos, lint y tests de componentes/datos; aislamiento 42 checks y producción
  offline 39 checks. CI completo sobre la entrega original; correcciones
  posteriores verificadas por tipos/tests y reconstrucción del runtime.
- Restauración de un dump de producción en PostgreSQL 17 aislado en el VPS;
  cuatro migraciones 0151–0154 y repetición idempotente, conservando 148/8.
- Login real Better Auth con tres cuentas **sintéticas, solo en el clon**;
  SSR de Studio/estadísticas/plantillas/crear y panel de agencia.
- Subida privada, rangos 206, denegación a otro creador y a anónimos;
  WAV válido de exactamente 20 MiB aceptado y exceso rechazado con 413.
- Render nativo de tres formatos en Linux sin red; trabajo en cola termina
  `ready` y genera un recurso privado con el contenedor restringido real.
- Runtime web final: comprobación PDF/OCR y ausencia de dotenv empaquetados.
  Persisten advertencias no fatales del smoke PDF sobre canvas/Path2D.
- Producción: migraciones versionadas aplicadas con rol DDL separado;
  candidato sano, consultas con rol de app y rutas privadas protegidas.
- HTTPS público: login de Studio, inicio SocialPro y KekoPilot correctos;
  base/migraciones sanas. Navegador real sin errores en la entrada publicada.
- Contraseña corta heredada: autenticación Better Auth real en el clon y
  formulario de navegador local comprobados. Las nuevas altas conservan mínimo
  12 caracteres, también validado por el servidor.

## Operación y reversión

Release privada: `/opt/socialpro/studio-release-20260906`. Los env, dumps y
configuración Caddy con credenciales no están en Git ni en las imágenes.
`pre-studio-final.dump` tiene SHA256
`6a311eb78b51e9d6b9c112107197764dedb0b295764798f4b71216d3d8c63072`.
La restauración de ensayo se hizo con el primer dump de esta misma entrega.

Los servicios nuevos se gestionan con `infra/studio/web.yaml` y
`infra/studio/compose.yaml`, variables de imagen inmutable/env indicadas en los
archivos. No ejecutar `compose down` sobre el CRM. El contenedor anterior
`socialpro-crm-app-1` se conserva, sin modificar scheduler, n8n ni KekoPilot.

Proyecto Compose web vigente: `socialpro-studio-final`; configuración desplegada
en `source-auth/infra/studio/web.yaml` dentro del release, `STUDIO_WEB_IMAGE`
según la imagen vigente y `STUDIO_WEB_ENV` apuntando a `production-studio.env`.
El trabajador usa proyecto `socialpro-studio`, `source-upload/infra/studio/compose.yaml`
y el archivo mínimo privado `worker.env` (sin credenciales de proveedor).
Los contenedores de ensayo y el candidato intermedio están detenidos. La cuenta
temporal de build de solo lectura quedó `NOLOGIN`; se retiró únicamente la red
extra del builder añadida para esta prueba. Los dumps permanecen privados.

Caddy cambia **solo** el upstream de `socialpro.es`. Subidas Studio admiten
22 MB de cuerpo multipart; el resto conserva 12 MB. Next permite un buffer de
22 MiB, y el endpoint mantiene la validación propia de 20 MiB. El origen de
subida se compara con el dominio configurado, no con el hostname interno de Next.

Rollback: restaurar el archivo privado `Caddyfile.before-studio` únicamente si
el actual sigue coincidiendo con `Caddyfile.studio`, preservar su inode, validar
y recargar Caddy. El helper privado `studio-edge.mjs rollback` incorpora esa
comparación. Detener únicamente el worker nuevo si procede. No eliminar las
tablas nuevas ni restaurar toda la base sobre escrituras posteriores.

Pendientes de validación operativa: acceso/2FA del usuario real, correo de
verificación con un destinatario autorizado, carga sostenida y proceso de
retención/borrado de medios. La prueba aislada no los certifica.
