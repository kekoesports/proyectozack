---
read_when: continuing SocialPro Studio, reviewing the creator portal, or preparing its first deployment
---

# SocialPro Studio — estado de implementación

**Estado vigente de diseño/despliegue:** [publicación del 6 de septiembre](studio-release-2026-09-06.md).
Las secciones siguientes conservan el historial del piloto, no el estado operativo actual.

## Ampliación vigente: Motion Collection 01 (6 septiembre 2026)

Se ha integrado **HyperFrames 0.8.30** en el trabajador de montaje existente. `/studio/templates` ofrece tres diseños propios versionados; el editor permite añadir secuencias sin sustituir escenas, previsualizar texto real en un documento aislado y exportar con HyperFrames + FFmpeg. Los montajes sin `motion` conservan el render anterior. No hay DDL adicional.

Demo nueva e independiente: `/studio/projects/fb23fd44-ee04-4018-adae-233565f7f85c` → Revisión, MP4 privado de 15,021 s y 720×1280, sin narración. Probados creación, guardado, cola, reproducción y descarga disponible desde la UI. No es una regeneración del avatar ni una edición del máster. SHA256 del máster aprobado verificado sin cambios.

Verificación: build de producción correcto (220 páginas estáticas + rutas dinámicas), TypeScript y ESLint correctos; 39 tests unitarios seleccionados, 39 checks de producción y 42 de aislamiento; render nativo HyperFrames + FFmpeg en tres formatos; 18 combinaciones de layout, texto al límite y movimiento efectivo comprobadas en Chrome. Sin generaciones de pago ni publicación. El render continúa siendo local, no está desplegado en Vercel/VPS.

La estrategia y las integraciones posteriores se detallan en [decisión de stack](studio-stack-decision-2026-09.md). Sustituye cualquier indicación histórica de que HyperFrames todavía no está conectado; Whisper, OAuth social y avatar/lip-sync siguen pendientes en este editor.

## Estado vigente: espacio de producción visual (6 septiembre 2026)

Esta sección sustituye los pendientes de las entregas históricas que aparecen más abajo. Destino previsto: `app.socialpro.es/studio`; **todavía no desplegado**. La demo corre en `http://localhost:3106/studio` y los trabajadores en este equipo, no en el VPS.

### Disponible y comprobado

- Editor visual por proyecto: escenas de vídeo, imagen y cartela; orden, duración y recorte temporal; formatos 9:16 / 1:1 / 16:9; audio opcional; biblioteca privada y guardado con control de versión. La previsualización de una escena no pretende ser el render final.
- Cola real de FFmpeg fuera de las peticiones web. Genera un MP4 privado, reproducible/descargable en Revisión. El ensayo desde el navegador produjo un vídeo de cartelas de 13 segundos a 720×1280. Es un montaje editorial de prueba, **no otro vídeo terminado del avatar**. No gastó créditos de Higgsfield.
- Historial de chat por proyecto y propuestas aplicables a una nueva versión. El asistente editorial de reglas funciona sin créditos. El adaptador de chat libre usa AI SDK + AI Gateway con salida estructurada, pero está **desactivado por falta de credencial**; no se presenta como un modelo funcionando.
- Clon KEKO existente comprobado en la cuenta de Higgsfield y vinculado a la ficha privada. Consulta de coste real desde el proyecto → trabajador → 1,5 créditos devueltos para el guion de prueba. **No se autorizó ni ejecutó esa narración de pago.**
- Aprobación de voz por agencia ligada al texto/versiones/precio, caducidad 15 minutos y recotización antes de enviar. Resultado ambiguo queda `uncertain`: no repite un gasto automáticamente. La compatibilidad de la generación completa y descarga de audio todavía necesita un canario de pago aprobado.
- Revisión de exportaciones por la agencia, separada de la revisión del guion. No aprueba como actual un montaje de versiones antiguas.
- Calendario editorial persistente. La fecha de prueba no programa una publicación externa. Campañas propias leen una proyección mínima del CRM; en el piloto no hay campañas asignadas y los casos públicos se muestran aparte.
- Mis redes con los cinco handles `kekoesports`, declarados por el fundador; no equivalen a OAuth ni certifican que una cuenta se haya sincronizado. Conector de estadísticas públicas de YouTube implementado; falta `YOUTUBE_API_KEY`. No se inventan métricas, históricos ni tendencias.
- Pantalla «Herramientas» distingue componentes disponibles, configurados y pendientes. Diseño responsive revisado a 390 px sin desbordamiento.

### Datos, permisos y coste

Se añadieron `0153_studio_production_workspace` (montajes, conversaciones, exportaciones, canales, observaciones y calendario) y `0154_studio_narration_approvals`, generadas desde Drizzle. Ambas se prueban sobre bases aisladas; no se aplicaron a producción.

Las consultas de creador filtran pertenencia activa dentro de SQL. Recursos y resultados siguen siendo privados; la ruta de revisión administrativa exige rol de agencia. Tableros y render quedan ligados a versiones; el máster aprobado se conserva como recurso independiente, no como destino sobrescribible. Exportar otra proporción contiene el material entero, sin regenerar cara/dientes/ojos. Cambiar el audio del montaje **no** vuelve a sincronizar los labios.

Límites del piloto: 8 escenas / 120 s, 10 solicitudes de render por proyecto/día, 30 turnos de chat por proyecto/día, 20 MB por recurso/exportación, 100 recursos / 500 MB por talento. El modelo no recibe secretos ni dispone de herramientas de generación o publicación. El trabajador de voz usa la sesión del CLI en su cuenta de sistema; el navegador y Next no reciben esos tokens.

### Verificación de esta ampliación

- TypeScript y build completos correctos con el ajuste de encaje de cartelas. ESLint completo comprobado en la entrega; sin migraciones durante el build.
- Suite server: 365 suites / 6047 pruebas correctas, una omitida; persiste el aviso de recursos abiertos de la suite general. Además, 15 pruebas específicas de las nuevas fronteras de producción.
- `test:studio:isolation`: 42 comprobaciones. `test:studio:production`: 39 comprobaciones (propiedad, revisiones, idempotencia, revocación, canales, calendario y autorización exacta/caducada de voz). Sin llamadas de pago.
- Navegador con sesiones Better Auth de creador, agencia y otra cuenta: edición, propuesta aplicada como nueva versión, exportación y reproducción real, presupuesto de voz y calendario. Otra cuenta recibe 404 para el proyecto, el máster y el render.
- El primer build compiló código y tipos, pero se interrumpió al consultar la fixture PGlite. Después de reiniciar exclusivamente la fixture sintética, el build completo terminó correctamente (220 rutas estáticas). No es evidencia de un fallo de PostgreSQL de producción; tampoco reemplaza una prueba de carga.
- Prueba nativa adicional: exportación MP4 de cartelas largas en 9:16, 1:1 y 16:9; dimensiones, duración y tamaño validados, previews cuadrada y horizontal inspeccionadas sin solapamientos ni recortes. SHA256 del máster revalidado sin cambios.
- `npx drizzle-kit check` y `git diff --check` correctos. No commit, push, merge, migración real ni despliegue en esta ampliación.

### Pendientes reales (no simulados)

1. Chat libre: credencial de AI Gateway, presupuesto operativo y prueba real del modelo.
2. Higgsfield: canario de narración aprobado; sincronía labial/avatar aún sin integrar. No asumir que la suscripción web cubre Higgsfield Cloud.
3. HyperFrames y Whisper: el runtime anterior no está conectado a este editor. Este montaje utiliza FFmpeg + tipografía Canvas, no reproduce todavía toda la plantilla premium del vídeo aprobado.
4. OAuth e insights de Instagram/TikTok, claves/conexiones de las otras redes y sincronización periódica. La autorización del usuario para usar sus redes no sustituye el consentimiento OAuth ni la revisión de las aplicaciones proveedoras.
5. Publicación automática, evidencias de campaña y medición posterior. De momento revisión y descarga manuales.
6. VPS y `app.socialpro.es`: despliegue, credenciales de servicio, almacenamiento privado compartido, migraciones reconciliadas y canario de aislamiento. Ver [runbook del Studio](studio-production-runbook.md).

## Histórico de entregas anteriores

Los estados y pendientes siguientes documentan cada entrega en su momento; no prevalecen sobre el estado vigente anterior.

Fecha: 2026-09-06. Rama: `feat/socialpro-studio-portal`, base `origin/master` c26c8e1d.

## Estado, sin confundir implementación con activación

- IMPLEMENTADO: portal de creadores por membresía, proyectos/guiones versionados, storyboard, biblioteca privada, datos propios existentes y revisión interna.
- PROBADO: PostgreSQL en memoria PGlite con la migración generada; aislamiento A/B; autenticación real y recorrido en navegador con datos sintéticos.
- ACTIVO EN PRODUCCIÓN: no. `STUDIO_ENABLED` está apagado por defecto. No se han enviado invitaciones reales, cambiado variables de producción, aplicado migraciones reales, hecho merge ni desplegado.
- VÍDEO COMPLETO DESDE LA APP: todavía no. El storyboard es guion, no preview de un render. Ya hay ficha privada con retrato/audio de referencia y reproducción del máster importado, pero no generación de avatar/voz, cola de render ni publicación.

Se conserva el posicionamiento SocialPro: creadores, colaboraciones y resultados de agencia; no un editor genérico ni una web pública de rankings. FragForge sigue independiente. Tratos mantiene su autoridad financiera y ninguna función del Studio escribe importes, márgenes, facturas o splits.

## Separación de producto

| Superficie | Entrega actual | Siguiente alcance |
| --- | --- | --- |
| `/studio` — creador | Mi espacio, crear brief/guion, biblioteca, ideas editoriales, estadísticas propias | Render de plantillas aprobadas, variantes por red, campañas/evidencias, media kit |
| `/admin/studio` — agencia | Invitaciones, revocación, revisión de versión de guion | Revisión del vídeo, costes, permisos de identidad/voz, programación y control de calidad |
| Worker de vídeo | No conectado aquí | Proceso separado en VPS; HyperFrames/FFmpeg, subtítulos opcionales, cola y presupuestos |
| Medición y Radar | Sin cambios en esta entrega | Métricas por evidencia, fuentes/fiabilidad y muestreo controlado en worker independiente |

## Datos y límites

Migración `0151_studio_creator_portal`: `talent_users`, `studio_invitations`, `studio_projects`, `studio_versions`, `studio_assets`, `studio_reviews`.

- Un talento por usuario en el piloto; un talento puede tener varias cuentas autorizadas.
- El ID del talento se resuelve desde la sesión en el servidor y se filtra dentro de SQL.
- Guiones: revisión optimista por número de versión, historial inmutable; editar un guion aprobado lo devuelve a borrador. No aprueba un entregable comercial ni autoriza una publicación.
- Recursos: tipos binarios admitidos JPG/PNG/WebP/MP4/WAV/OGG; 20 MB por archivo, 100 recursos y 500 MB por talento. 100 proyectos. Cuotas comprobadas en transacción con bloqueo por talento.
- Almacenamiento mediante la abstracción existente; objetos privados, UUID de ruta, checksum, declaración de derechos y descarga autenticada `no-store`. No se expone una URL pública de Blob.
- Las estadísticas leen solo proyecciones permitidas de `talent_channel_snapshots` y `talent_content_performance`; no se hace una nueva sincronización social. Ausencia de filas no se convierte en métricas ficticias. Se muestran fuente y fecha; los contadores legacy conservan su semántica.
- Los entregables propios son una proyección de lectura mínima; todavía no hay envío de evidencias ni vista de cobros/contratos.
- Las ideas son estructuras editoriales SocialPro, etiquetadas como tales; no se atribuyen a tendencias detectadas ni a un análisis IA del canal.

## Seguridad de acceso

1. El rol `creator` sirve de destino de login, pero no se añade al conjunto de roles internos del CRM.
2. `requireCreator()` es el guard específico de los endpoints del portal: flag + sesión Better Auth real + membresía activa. No utiliza el bypass administrativo de desarrollo. Esta separación es necesaria porque `requireAnyRole()` intencionadamente no autoriza al creador como personal interno.
3. La agencia usa el guard existente con `admin`/`manager`. Los endpoints, no solo la navegación, comprueban permisos.
4. Invitaciones de 32 bytes aleatorios; solo hash en base, vigencia 48 horas, uso único, coincidencia de cuenta y correo verificado. El enlace lleva el secreto en el fragmento, no en query string.
5. Crear una invitación no envía correo. El destinatario puede solicitar verificación transaccional de su correo; Better Auth la envía solo si hay invitación vigente. No cambia la política de login de usuarios históricos del CRM. Caducidad de verificación: una hora, sin auto-login; clave de idempotencia de envío derivada del token.
6. Revocar impide nuevas sesiones de creador y bloquea consultas/escrituras de sesiones existentes; no borra proyectos ni revoca invitaciones de otras cuentas del mismo talento. Recuperar un acceso revocado necesita todavía un flujo administrativo explícito; no lo reactiva una invitación vieja.
7. Cuerpo de subida limitado por bytes reales, comprobación de origen y firma binaria; IDs/acciones validados con Zod. Si falla el registro del recurso, se intenta compensar solo el objeto recién creado.

## Verificación realizada

`npm run build`, TypeScript y `npm run lint -- --quiet`: completados sin errores. `npx drizzle-kit check`: correcto. El build usó exclusivamente la base sintética y credenciales ficticias; no ejecutó migraciones ni despliegue. Persisten avisos existentes sobre Edge Runtime de otras rutas.

`npm run test:studio:isolation`: 35 comprobaciones. Construye una base sintética desde Drizzle excluyendo las seis tablas nuevas y aplica el SQL real de 0151. Cubre invitación errónea/no verificada/caducada/reutilizada, A/B en proyectos/ediciones/revisión/historial/recursos/métricas, aprobación exacta, edición obsoleta, revocación y cuotas.

No prueba toda la cadena histórica de migraciones ni concurrencia/carga del PostgreSQL de producción. Docker estaba instalado pero sin daemon operativo; se usó PGlite. Nada apunta a una base real.

Pruebas Jest específicas: 18 tests de guards, validación, tipos de archivos, proyecciones de propiedad, logger de autenticación y correo transaccional con el envío simulado. La suite global pasó 392 suites y 6263 tests antes del último test adicional del logger (una suite/test omitidos); emitió aviso de worker con recursos abiertos al terminar. No atribuir ni ocultar ese aviso: queda pendiente su diagnóstico antes de considerar la suite libre de fugas.

Navegador con sesiones Better Auth, sin bypass: login, creación, guardar, solicitar revisión, aprobación desde CRM, regreso del creador, editar aprobado → borrador v2; subir y abrir un PNG privado; otro creador no puede leer proyecto/recurso por URL ni entrar al CRM. Vista móvil de 390 px sin desbordamiento de página. Axe en el dashboard de escritorio: cero violaciones automáticas; los degradados quedan para inspección manual. Capturas revisadas visualmente.

El envío de correo real y el callback completo desde una bandeja real no se han probado. No se han solicitado generaciones de pago.

Al verificar la demo después del build hubo una conexión terminada en la fixture de PostgreSQL. Se reiniciaron la fixture sintética y el servidor de desarrollo: se comprobó `SELECT 1`, login y dashboard de nuevo. La demo vuelve al proyecto sintético inicial. Ese fallo permitió corregir la legibilidad de carga/error y evitar que Better Auth y la salida de error del router propaguen parámetros SQL que pueden contener tokens. No se atribuye ese comportamiento de la fixture a la base real ni se sustituye una prueba de carga por esta comprobación.

## Reproducir la demo local

1. `npm ci --ignore-scripts` (runtime/dependencias disponibles en el equipo).
2. `npx tsx scripts/studio-fixture-server.ts`: PostgreSQL sintético en memoria, TCP solo `127.0.0.1:55439`; no carga archivos de entorno.
3. Arrancar Next en `localhost:3106`, con `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55439/postgres`, credenciales de servicios ficticias, `NEXT_PUBLIC_SITE_URL=http://localhost:3106`, `STUDIO_ENABLED=true`, `ENABLE_DEV_AUTH_BYPASS=false`, `STORAGE_DRIVER=local` y raíz local fuera de `public/`.
4. Abrir `/studio/login`. Usuarios sintéticos: `creator@studio.test`, `other@studio.test`, `agency@studio.test`; contraseña compartida solo para estas fixtures: `Studio-fixture-only-2026!`. La agencia revisa en `/admin/studio`.

La base desaparece al parar la fixture. Los archivos de ensayo quedan en `.scratch/studio-qa/storage`, fuera del repositorio versionado. Nunca importar estas cuentas en producción.

## Antes de activar el piloto real

- Conciliar la cadena **realmente aplicada** y las ramas concurrentes. El checkout antiguo `codex/cs2-partner-lead-radar` conserva prototipos 0149/0150 que colisionan por número con discovery de master. Esta rama no los importa ni los reescribe. El 0151 local se generó sobre el journal de master; volver a comprobar antes del merge.
- Probar canario PostgreSQL y migraciones con la estrategia vigente del repositorio. No ejecutar `migrate`, `push` o el build de despliegue contra producción como diagnóstico.
- Rate limiting persistente compartido, cuotas operativas y monitorización: Better Auth usa su almacenamiento por defecto; el límite de verificación configurado por IP no constituye una defensa distribuida completa.
- Validar correo en staging, remitente/DNS, tratamiento de bounces, callback, redacción de tokens en logs y recuperación/reincorporación de cuentas revocadas. No exponer secretos de verificación en telemetría.
- Validar almacenamiento privado del proveedor real, límites del proxy para subidas, streaming/rangos de vídeo, limpieza de huérfanos, retención/borrado solicitado y backups. El límite de 20 MB está pensado para piloto, no para VODs completos.
- Realizar pruebas de carga y fallos concurrentes; probar flag apagado en despliegue de staging y sesión real/2FA de staff.
- Aprobación de revisión/merge, despliegue controlado y dos cuentas piloto invitadas por la agencia. No habilitar generación ni publicación por esa sola aprobación.

## Próxima entrega concreta

V1: recuperar la plantilla del vídeo aprobado y hacerla reproducible desde recursos/escenas estructurados, con preview y exportación local/VPS, **sin regenerar cara ni voz** por cambios de banners. Cola con idempotencia, versiones y costes antes de conectar generaciones Higgsfield. V2 permitirá al creador recorrer ese render desde su proyecto. Medición interna y Radar mantienen sus propias tareas; no se simulan como funcionalidades terminadas de este portal.

## Ampliación: piloto privado con material real (6 septiembre)

Destino acordado: `app.socialpro.es`. Sigue siendo **local**, sin DNS, despliegue ni activación en ese dominio. No se ha hecho commit, merge ni push.

Implementado:

- `0152_studio_private_profiles`, generado con Drizzle: contexto editorial privado por talento, procedencia, reglas de imagen/voz, referencias y notas de publicación. JSON validado con Zod; lectura limitada por membresía activa en SQL. No almacena credenciales ni certifica la conexión de un clon externo.
- Inicio con reproductor del máster aprobado y descarga; biblioteca con previsualización de imágenes, vídeo y audio. Rutas privadas con respuestas 206/416, rangos de bytes acotados en memoria, caché `no-store` y descarga con nombre de archivo.
- Corregida la lista de extensiones del almacenamiento común: ahora permite MP4/WAV/OGG ya validados por la frontera del Studio. Anteriormente el formulario los admitía, pero el proveedor los rechazaba.
- «Mi identidad»: retrato, grabación, logo, permisos y reglas. Las referencias a recursos se cruzan con la biblioteca autorizada antes de mostrarlos.
- «Campañas y referencias»: casos públicos con fuente/fecha, separados del historial propio y sin importar cifras comerciales como estadísticas de la cuenta.
- Tres guiones en borrador adaptados a Instagram, TikTok y Shorts, con objetivo, CTA y material pendiente. Son propuestas editoriales, no tendencias detectadas, vídeos generados ni encargos de marcas.
- Estadísticas sin datos importados explícitas por red. No se han sincronizado cuentas sociales ni inventado métricas.

Material personal y semilla real **fuera de Git**: `.scratch/studio-pilot/`. Cuatro archivos privados, incluida copia exacta del último máster aprobado (42,233 s; 720×1280), sin transcodificación. Se conservan separadamente las instrucciones musicales de la producción anterior. La nueva base PGlite persiste en disco local, escucha solo en 127.0.0.1:55440 y no carga variables de producción. La fixture sintética anterior en 55439 no se ha borrado.

Arranque local privado: `node --conditions=react-server --import tsx .scratch/studio-pilot/server.ts`. El servidor Next sigue en 3106, ahora apunta al puerto 55440 y a `.scratch/studio-pilot/storage`. Las cuentas son de prueba local, nunca invitaciones o altas de usuarios reales. No exponer este servidor ni importar sus cuentas en producción.

La semilla crea una base de demostración desde el esquema de Drizzle y aplica los SQL reales 0151/0152 sobre el baseline aislado. Esto **no** concilia ni acredita el historial `__drizzle_migrations` de producción. Antes de desplegar sigue siendo obligatorio revisar esa cadena y posibles colisiones de numeración.

Verificación de la ampliación:

- 40 comprobaciones de aislamiento en PostgreSQL en memoria, incluyendo lectura de identidad por propietario, denegación a otro creador/no miembro y pérdida de acceso tras revocación.
- 17 tests específicos nuevos: contexto acotado, enlaces seguros, descarte de propiedades extra, extensiones multimedia, rangos y cancelación de streams.
- Suite server: 365 suites / 6047 tests correctos, 1 suite/test omitidos. Mostró el aviso existente de recursos abiertos al terminar; no se considera resuelto por esta entrega.
- TypeScript y ESLint sin errores. Build correcto usando la fixture sintética separada, flag Studio desactivado y sin ejecutar migraciones; avisos existentes de Edge Runtime. Revisión final incremental de tipos/lint después de los pequeños ajustes de texto y validación de query.
- Navegador real: login, reproducción y salto al segundo 13, descarga `attachment`, rango 0–31 devuelve exactamente 32 bytes con 206; acceso de otra cuenta al vídeo devuelve 404 y su ficha no muestra identidad ajena. Guardado de una segunda versión del brief sin alterar su texto.
- Vistas de inicio, identidad, ideas, proyecto, campañas y estadísticas revisadas; móvil 390 px sin desbordamiento en las vistas comprobadas. Sin errores de navegador detectados en el recorrido del propietario.

La revisión de React mantiene lecturas en servidor, consultas independientes en paralelo, metadatos mínimos y recursos privados sin optimizador público. Las guías editorial/social separan hechos suministrados por el fundador, referencias publicadas y propuestas creativas.

Pendiente: chat del CM con contexto y permisos, integración real del clon/voz con la API disponible, worker de render y aprobaciones de gasto, OAuth/analíticas y sincronización del historial propio de campañas. Ningún botón de esta demo simula ejecutar esas capacidades.
