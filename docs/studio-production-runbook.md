---
read_when: deploying or operating SocialPro Studio workers, investigating failed renders or voice generation
---

# SocialPro Studio — operación y despliegue pendiente

## Arquitectura instalada, no despliegue realizado

| Proceso | Responsabilidad | Datos/credenciales |
| --- | --- | --- |
| Next.js `/studio` | Acceso de creador, biblioteca, guion, chat, editor, planificación | PostgreSQL y almacenamiento privado; AI Gateway opcional |
| Next.js `/admin/studio` | Invitaciones, revisión de guion/render y aprobación exacta de voz | Roles admin/manager; ninguna aprobación implica publicar |
| `npm run studio:worker` | Cola HyperFrames + FFmpeg, una exportación por proceso | Misma base y almacenamiento; Chrome, FFmpeg/FFprobe; sin credencial Higgsfield |
| `npm run studio:voice-worker` | Cotización y narración autorizada | Misma base/almacenamiento; binario CLI y sesión Higgsfield del usuario de servicio |

El montaje no ejecuta HTML, scripts ni filtros enviados por un creador. Usa escenas declarativas validadas y argumentos fijos de FFmpeg. Todo archivo de entrada debe pertenecer al talento; los temporales se crean por trabajo y solo se limpia ese directorio.

### HyperFrames: Motion Collection 01

- Dependencia fijada: `hyperframes@0.8.30`; Node >=22. En este equipo se probó Node 24.11.1 y Chrome headless 147.0.7727.57.
- El worker necesita el paquete completo de npm y su CLI; no basta el standalone de Next. Aprovisionar Chrome en la imagen/usuario de servicio antes de habilitar la cola, con `node node_modules/hyperframes/bin/hyperframes.mjs browser ensure`.
- Se construye HTML propio, con fuentes locales y sin recursos de red; no se recibe HTML libre del usuario. Animación por timeline determinista, sin dependencia de GSAP.
- CLI: un trabajador Chrome por escena, caché de extracción deshabilitada, timeout de 240 s, telemetría deshabilitada por entorno del subproceso. Los binarios FFmpeg/FFprobe configurados se trasladan al subproceso.
- No usar las credenciales de Higgsfield en este worker. Limitar CPU, memoria, PIDs, disco y vida del proceso completo en el supervisor/contenedor; un timeout del CLI no sustituye esos límites del servidor.
- Mantener las versiones de plantilla: un cambio visual incompatible requiere un nuevo ID, no reinterpretar documentos antiguos.
- Verificación offline: `node --import tsx scripts/test-studio-motion-layout.ts`; render nativo: `node --conditions=react-server --import tsx scripts/test-studio-motion.ts` con las variables sintéticas del test, nunca secretos de producción. Los tests conservan sus MP4 sintéticos bajo `.scratch` para inspección.

## Variables y precondiciones

- `STUDIO_ENABLED` y `STUDIO_RENDER_ENABLED`, apagados por defecto.
- `STUDIO_FFMPEG_BIN`, `STUDIO_FFPROBE_BIN`: ejecutables disponibles en el trabajador. Instalar también dependencias nativas de Canvas y conservar `public/fonts/studio/` con sus licencias OFL.
- `STUDIO_HIGGSFIELD_ENABLED` y `STUDIO_HIGGSFIELD_BIN`: solo activar tras comprobar la cuenta/voz autorizadas. En Windows usar el ejecutable nativo, no un `.cmd` con shell. No copiar la sesión personal completa ni registrar tokens. En VPS, aprovisionar de forma explícita el usuario de servicio y sus permisos.
- `AI_GATEWAY_API_KEY` y `STUDIO_AI_MODEL`: solo servidor, nunca variables `NEXT_PUBLIC_*`. Sin clave, queda activo el asistente editorial de reglas, claramente identificado.
- `YOUTUBE_API_KEY`: consulta pública de canal por handle. No obtiene insights privados, retención ni ingresos. Fuentes: [channels.list](https://developers.google.com/youtube/v3/docs/channels/list), [semántica de estadísticas](https://developers.google.com/youtube/v3/docs/channels).
- PostgreSQL, Better Auth y correo: seguir las variables ya existentes del proyecto. No emplear credenciales de las fixtures en staging/producción.
- Almacenamiento: Next y ambos trabajadores necesitan **el mismo almacén privado**. `STORAGE_DRIVER=local` solo sirve si comparten volumen seguro. Next en Vercel + trabajador en VPS no comparten disco: configurar y probar el proveedor privado común antes de habilitar colas.

La implementación CLI de voz se apoya en el [CLI oficial de Higgsfield](https://github.com/higgsfield-ai/cli), modelo `text2speech_v2`, variante `elevenlabs` y voz de tipo `element`. La cotización fue comprobada; no dar por validado el canario de generación hasta escuchar/descargar su resultado.

## Orden obligatorio antes del despliegue

1. Revisar cambios y reconciliar journal/schema de la rama con master y la base de destino. Los prototipos antiguos 0149/0150 de otro worktree colisionaban por numeración: **no** copiarlos ni ejecutar `drizzle-kit push`.
2. Confirmar `__drizzle_migrations` en destino; aplicar y ensayar exclusivamente SQL versionado 0151–0154 en una rama/canario según la política de migraciones del repo. No validar contra producción por comodidad.
3. Resolver secretos, aislamiento de credenciales, volumen/Blob privado, remitente/verificación de invitaciones, backups, retención y borrado de medios.
4. Arrancar procesos supervisados independientes con usuario sin privilegios, límites de CPU/memoria, red saliente acotada y apagado ordenado. No ejecutar FFmpeg dentro de funciones HTTP de Vercel.
5. Probar login/2FA de agencia, invitación real, dos creadores aislados, revocación, cuotas concurrentes, descarga privada/rangos, caída de trabajadores y observabilidad sin PII.
6. Habilitar primero biblioteca/editor/montaje; después, si se aprueba, una narración de prueba con coste exacto. Publicación y nuevas integraciones sociales requieren sus verificaciones separadas.
7. Promover a `app.socialpro.es/studio` solo tras aprobación de revisión/despliegue. El dominio no se ha modificado en la entrega local.

## Voz: no repetir un cobro a ciegas

`quote_requested → quoting → quoted → approved → submitting → complete`.

- El creador solicita coste; la agencia autoriza el importe y revisión guardados.
- El trabajador vuelve a comprobar identidad, acceso, revisión, antigüedad y precio antes del único envío.
- Si el precio cambia o vence, vuelve a `quoted` y exige otra aprobación.
- Un fallo ambiguo tras enviar produce `uncertain`. Inspeccionar el historial del proveedor y conciliar el trabajo; **nunca** resetearlo a `approved` para probar otra vez.
- Una interrupción en `submitting` se clasifica como incierta al superar 12 minutos. Antes de relanzar nada comprobar si el proveedor ya consumió saldo.
- El almacenamiento posterior puede fallar aunque la generación se haya cobrado. Si hay `providerJobId`, recuperar ese resultado sin generar de nuevo. Todavía no hay pantalla administrativa de conciliación; exige una intervención operativa revisada.

## Pruebas reproducibles

- `npm run test:studio:isolation` — acceso y migraciones en PostgreSQL aislado.
- `npm run test:studio:production` — edición, render, chat, perfiles sociales, calendario y presupuestos sin proveedores.
- `node --import tsx --require ./scripts/worker-preload.cjs scripts/test-studio-render.ts` — MP4 nativos 9:16/1:1/16:9 con cartelas sintéticas largas; conserva previews bajo `.scratch/studio-render-check-*` para inspección. Requiere las variables de entorno válidas de una fixture, FFmpeg y FFprobe; no consulta DB ni proveedor.
- `npx tsc --noEmit`, `npm run lint`, `npx drizzle-kit check`, `npm run build` contra una base **sintética separada**. No utilizar `build:with-migrate` para diagnosticar.

PGlite permite verificar el piloto sin acceder a producción, pero no acredita carga, disponibilidad ni concurrencia del PostgreSQL desplegado. Si su servidor TCP se interrumpe, diagnosticar/reiniciar únicamente esa fixture y registrar el resultado real del build.

## Alcance visual actual

El editor aplica contención sin recorte espacial, cartelas SocialPro ajustadas al formato, entrada/salida suave y audio opcional. No cambia la geometría facial ni vuelve a sintetizar la identidad por editar una cartela. Tampoco es aún una línea de tiempo multipista ni la plantilla completa de motion graphics del máster aprobado. HyperFrames, Whisper y lipsync no se anuncian como conectados.
