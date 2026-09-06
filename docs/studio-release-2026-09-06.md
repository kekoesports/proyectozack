---
read_when: using Studio in production, deploying the visual Studio release, or diagnosing creator access
---

# Studio: revisión visual y publicación

## Estado

Online desde el 6 de septiembre a las 16:41 UTC. Este registro sustituye las
notas históricas «solo local». Publicar la aplicación no hace públicos sus medios.

- Entrada de Studio desde las 17:02 UTC: `https://app.socialpro.es`.
  `https://socialpro.es/studio` continúa disponible. La web pública conserva su
  dominio canónico `socialpro.es`.
- Agencia: `/admin/studio` en ambos dominios, usuarios admin/manager existentes.
- IONOS: único registro añadido `A app → 159.195.112.100`, TTL 300,
  id `1498445897`. Confirmado en DNS autoritativo y resolver público; HTTPS
  válido emitido automáticamente por Caddy, sin desactivar protección de dominio.
- Imagen de apertura: `socialpro:studio-f68e6a73`, fuente `f68e6a73`.
- Imagen anterior desde las 16:47 UTC: `socialpro:studio-29ebbf41`, fuente
  `29ebbf41`, servicio `socialpro-studio-final-web-1`. Añade compatibilidad de
  login con contraseñas válidas anteriores a la política nueva de alta.
- Imagen anterior desde las 17:02 UTC: `socialpro:studio-app-0730b356`, fuente
  `0730b356e1ca29768f7fca518e2c16e7234fc214`, servicio
  `socialpro-studio-app-web-1`, imagen SHA256
  `f46dd0767a79cd8c5f90fb221a8765d55b4a8ed928702564a6095c0c8ccda119`.
  Añade el origen explícito de la app a auth y subida privada. Cookies host-only,
  sin comodines ni ampliación a otros subdominios; puede requerir iniciar sesión
  de nuevo, con las mismas credenciales. No es SSO entre cookies de ambos hosts.
- PR [446](https://github.com/kekoesports/proyectozack/pull/446) integrada mediante
  merge `36696c5a`. No se reescribió historia ni se sustituyeron cambios ajenos.
- Subdominio: PR [447](https://github.com/kekoesports/proyectozack/pull/447),
  merge `4df65033`. Lint/tipos y tests unitarios/integración/fuzz aprobados en CI;
  build y smoke Docker finales también aprobados directamente en el VPS.
- Edición de agencia activa desde las 18:14 UTC: web
  `socialpro:studio-agency-dcbd17d8`, fuente
  `dcbd17d8de62bd42ba1c94e0a7048e03e8968676`, contenedor
  `socialpro-studio-agency-web-1`, imagen SHA256
  `cf31499304779a3018e0b9729442d735c16b5b28a3f2c72f25b2015925e4885c`.
- Worker vigente: `socialpro-studio-worker:afe32966`, fuente
  `afe329666f22df7902d81ed6e750924781a56749`, imagen SHA256
  `e87e665374464ad98ba9531d4eb49b31a1619b55a124a8cf75d62676fa6eade1`.
  Recupera el talento del proyecto en cola y verifica los permisos reales del
  solicitante; el worker anterior `eea5ecc4` no admite trabajos de agencia.
- PR [448](https://github.com/kekoesports/proyectozack/pull/448) integrada con
  merge `100ce6cad21e1c01c585ecd6910c5fce5eddd45f`. Las cuatro comprobaciones de
  CI aprobaron: lint/tipos, tests/integración/fuzz, build y runtime Docker PDF/OCR.
- Misma base PostgreSQL, secreto de Better Auth y almacenes privados. Se conservan
  148 talentos y 8 cuentas; no se importan fixtures ni se restablecen contraseñas.

## Qué puede hacer cada usuario

La agencia entra con su cuenta habitual y ve el roster real, abre el editor con
**Abrir Studio**, crea enlaces de invitación y revisa guiones/exportaciones.
El aviso **Editando para [talento]** identifica el espacio, y **Volver a la
agencia** cierra la selección. Tener una ficha de talento **no** crea
una cuenta ni concede acceso automáticamente. La invitación vincula el correo
con la ficha existente. No se enviaron invitaciones en este despliegue.

Un creador con membresía activa accede a su inicio, proyectos, biblioteca,
plantillas, estadísticas, campañas, ideas, calendario e identidad. El servidor
filtra todas las lecturas/escrituras por esa membresía. Admin/manager pueden
seleccionar un talento sin crearle membresías; los demás roles no se amplían.
El servidor vuelve a comprobar el rol real y la selección en cada consulta.
Las pestañas antiguas no pueden guardar en un espacio seleccionado después.
Recorrido, límites y controles: `docs/studio-agency-workspaces.md`.

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
- Subdominio: 12 tests de orígenes, TypeScript, lint y `drizzle-kit check`.
  Docker final construido con base pública de solo lectura, sin credenciales
  de producción en el build; no se aplicó ninguna migración adicional.
- Misma imagen final en clon aislado: logins Better Auth de creador en ambos
  dominios, otro creador y agencia en `app`; sesión Secure/HttpOnly/SameSite=Lax,
  sin Domain. SSR de inicio/stats/plantillas/crear/biblioteca y agencia; upload
  privado real, lectura 206 y denegación 404 a otro talento. Auth y upload rechazan
  orígenes HTTP, subdominios no autorizados y dominios parecidos maliciosos.
- Navegador de producción: sesión real de Pablo/ADMIN y 148 fichas verificadas
  en `socialpro.es/admin/studio`. En `app`, entrada redirige correctamente al
  login, formulario completo y sin errores JS; móvil 390 px sin overflow.
  Prueba autenticada del usuario real en el nuevo host pendiente de su login.
- Edición de agencia: 45 pruebas SQL de permisos y cola, 42 de aislamiento y
  39 de producción en memoria; 36 tests de acceso/upload, tipos y lint completos.
  Las tres suites SQL se incorporan a CI. Suite general local: 6354 tests aprobados,
  uno omitido; la cobertura completa también aprobó en CI de la PR 448.
- Clon PostgreSQL 17: login real de cuenta sintética de agencia → selección
  de talento → proyecto → montaje HyperFrames → ayuda editorial → render en
  worker restringido → MP4 privado reproducido en navegador, 720×1280,
  4,02 segundos. El solicitante sigue siendo agencia y no se crea membresía.
- Dos pestañas: cambiar a otro talento rechaza el guardado antiguo antes de
  escribir y su archivo devuelve 404. Upload antiguo/sin espacio devuelve 409;
  una cookie de agencia falsificada no amplía los permisos de un creador.
  Upload válido y lectura privada 206 comprobados. Móvil 390 px sin overflow.
- Producción tras activar: Pablo abre TODOCS2 desde el roster con su sesión
  real y vuelve a la agencia. No se crean proyectos de prueba, cuentas ni
  membresías. Persisten 148 talentos/8 usuarios/0 proyectos/0 renders/0 fixtures.
  HTTPS válido en app, rutas privadas y KekoPilot intactos; logs de arranque
  del nuevo web y worker sin errores. Higgsfield continúa apagado.

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

Proyecto Compose web vigente: `socialpro-studio-agency`; configuración desplegada
en `source-agency/infra/studio/web.yaml` dentro del release, `STUDIO_WEB_IMAGE`
según la imagen vigente y `STUDIO_WEB_ENV` apuntando a `production-studio.env`.
El trabajador usa proyecto `socialpro-studio`, `source-agency-worker/infra/studio/compose.yaml`
y el archivo mínimo privado `worker.env` (sin credenciales de proveedor).
Los contenedores de ensayo, navegador y proxy de QA están detenidos, y el túnel
temporal está cerrado. Se conserva el web anterior para reversión. La cuenta
temporal de build de solo lectura quedó `NOLOGIN`; se retiró únicamente la red
extra del builder añadida para esta prueba. Los dumps permanecen privados.

Caddy añade `app.socialpro.es` y cambia el upstream de `socialpro.es` al mismo
servicio nuevo. n8n, KekoPilot, los dominios alternativos y el correo no cambian.
El bloque versionado está en `infra/studio/app.Caddyfile`; raíz → `/studio`,
`X-Robots-Tag: noindex, nofollow, noarchive`, TLS automático. Subidas Studio admiten
22 MB de cuerpo multipart; el resto conserva 12 MB. Next permite un buffer de
22 MiB, y el endpoint mantiene la validación propia de 20 MiB. El origen de
subida se compara con el dominio configurado o el origen exacto de `app`, nunca
con el hostname interno de Next ni un Host reenviado por el cliente.

Rollback **de edición de agencia**: `studio-agency-edge.mjs rollback` restaura
`Caddyfile.before-agency` únicamente si el actual coincide con
`Caddyfile.with-agency`. Preserva inode; validar y recargar Caddy. Devuelve ambos
dominios al web `0730b356` sin cambiar DNS ni datos. El worker nuevo es compatible
con los trabajos previos y debe conservarse mientras existan trabajos de agencia;
no restaurar el worker antiguo sobre esa cola. No revertir tablas ni medios.

Rollback histórico **del subdominio**, después del rollback anterior:
`studio-app-edge.mjs rollback` restaura
`Caddyfile.before-app` solo si el actual coincide con `Caddyfile.with-app`.
Preserva inode; validar y recargar Caddy. Devuelve SocialPro a la imagen
`29ebbf41` y retira el vhost app, sin tocar DB ni los demás dominios. El DNS
seguiría presente: retirarlo únicamente si también se decide retirar la app.

Rollback histórico del primer Studio: restaurar `Caddyfile.before-studio` únicamente si
el actual sigue coincidiendo con `Caddyfile.studio`, preservar su inode, validar
y recargar Caddy. El helper privado `studio-edge.mjs rollback` incorpora esa
comparación. Detener únicamente el worker nuevo si procede. No eliminar las
tablas nuevas ni restaurar toda la base sobre escrituras posteriores.

Pendientes de validación operativa: acceso/2FA del usuario real, correo de
verificación con un destinatario autorizado, carga sostenida y proceso de
retención/borrado de medios. La prueba aislada no los certifica.
