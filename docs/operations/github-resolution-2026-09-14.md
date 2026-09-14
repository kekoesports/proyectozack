# Resolución de PR, issue y alertas — 14 septiembre 2026

Autorización: resolver los hallazgos revisados, hacer commit y push a `master`.
No incluye desplegar el conjunto en el VPS ni modificar datos comerciales.

## Cambios

- Integración con historial de los PR [469](https://github.com/kekoesports/proyectozack/pull/469), [471](https://github.com/kekoesports/proyectozack/pull/471), [472](https://github.com/kekoesports/proyectozack/pull/472) y [473](https://github.com/kekoesports/proyectozack/pull/473): límites de presupuesto/rate limiting, recuperación y persistencia de WhatsApp, dependencias de producción y Tailwind.
- `js-yaml` 4.3.2, `hono` 4.13.7 y `adm-zip` 0.6.1 en el lockfile. La actualización de Hono sustituye al PR [468](https://github.com/kekoesports/proyectozack/pull/468).
- Node 24 continúa siendo el runtime de aplicación, workers y CI; sus tipos permanecen en la misma versión principal. Los PR [475](https://github.com/kekoesports/proyectozack/pull/475) y [476](https://github.com/kekoesports/proyectozack/pull/476) se sustituyen por una política de actualización coordinada. Dependabot sigue proponiendo actualizaciones compatibles; los saltos principales de Node y sus tipos requieren revisión específica.
- ESLint 9 conserva compatibilidad con `eslint-plugin-react` 7.37.5, cuya declaración peer no admite ESLint 10. El PR [474](https://github.com/kekoesports/proyectozack/pull/474) se sustituye por dependencias explícitas de `@eslint/js`, `espree` y `globals`; no se fuerza un árbol incompatible. Dependabot no repetirá el salto principal mientras siga esta política.
- Corrección de la fixture de notas rápidas tras renumerar su migración a 0162: aplica 0161/0162/0163/0164 y contrasta el snapshot final. No modifica la historia de una base persistente.
- Las pruebas de la cola WhatsApp pasan a ejecutarse también con cada push a master. CI incorpora una regresión funcional de extracción de ZIP y la prueba real de PDF/OCR en Chromium y WebKit.

## Seguridad

La revisión inicial devolvía cinco alertas de Dependabot: una alta de YAML, tres medias de Hono y una media de adm-zip. No había alertas abiertas de code scanning ni secret scanning.

La [alerta de adm-zip](https://github.com/advisories/GHSA-vwc7-r8mq-g2x9) todavía mostraba «None» en patched versions al revisar, pero el [cambio upstream de 0.6.0 a 0.6.1](https://github.com/cthackers/adm-zip/compare/v0.6.0...v0.6.1) incluye el rechazo de enlaces simbólicos en el destino. Se verificó funcionalmente, no solo por el número de versión: extracción completa, por entrada y asíncrona rechazan un destino enlazado y conservan intacto el archivo externo. La extracción normal sigue funcionando. No se ha desestimado ninguna alerta manualmente.

`npm audit` completo y solo producción: cero vulnerabilidades conocidas en el lockfile corregido. Esto describe las dependencias del repositorio; no demuestra que los contenedores del VPS ya ejecuten estas versiones.

## PDF.js y el issue 277

La migración solicitada por [277](https://github.com/kekoesports/proyectozack/issues/277) ya estaba implementada, incluido el commit `ab202e9f11d0f922cd95d2f60c129be960b2996a`. El repositorio usa PDF.js 6.3.289 y un worker servido localmente de la misma versión.

La comprobación añadida genera una nómina sintética, ejecuta el parser real del servidor y el orquestador OCR real del navegador con PDF.js, canvas y Tesseract. Chromium y WebKit extraen la página y reconocen el periodo y el líquido esperados. Solo se sirve contenido desde loopback y no se crean nóminas, facturas ni pagos. WebKit es una comprobación del motor, no una prueba manual en un dispositivo Safari.

## Evidencia y límites

- `npx tsc --noEmit`: correcto. `npm run lint`: sin errores; quedan dos avisos preexistentes de navegación interna en componentes ajenos a estos cambios.
- `npm run build`: correcto con PostgreSQL en memoria expuesto únicamente por loopback y valores sintéticos. Sin archivos dotenv ni credenciales productivas en este checkout.
- `npx drizzle-kit check`: correcto antes de los pushes. La fixture aplica las migraciones versionadas nuevas sobre una base en memoria, preservando su registro histórico sintético. No equivale a validar toda la cadena histórica de migraciones desde cero.
- Pruebas locales ZIP: 4/4. Watchdog: 10/10. Comprobaciones de baseline PDF: 3/3 y guard de publicación: 8/8. La prueba OCR verifica resultado y valores en ambos motores.
- La batería completa de CI sobre `2cf72997c5d20824b14d348bfc950165b8c347e7` devuelve 432 suites y 6.624 tests correctos; un test opcional queda omitido. ZIP, OCR Chromium/WebKit, aislamiento de Studio, lint/typecheck y CodeQL pasan en ese mismo conjunto.
- [CI completo 34821003204](https://github.com/kekoesports/proyectozack/actions/runs/34821003204): correcto, incluido build, construcción de la imagen de producción, PDF/OCR nativo dentro de esa imagen y arranque del worker con kill switch desactivado. La documentación posterior no cambia el código validado.
- PostgreSQL 17 desechable en GitHub: 73 pruebas de intake y siete escenarios de persistencia, identidad, concurrencia, replay, intervención humana y fallos, sin llamadas reales a proveedores. [Ejecución verificada](https://github.com/kekoesports/proyectozack/actions/runs/34821003225).
- El PR de integración [477](https://github.com/kekoesports/proyectozack/pull/477) conserva los checks de CI y CodeQL del conjunto. Las primeras ejecuciones detectaron el lockfile incompleto entre versiones de npm y una aserción demasiado estricta sobre ramas bloqueadas; ambos problemas se corrigieron y se repitieron las comprobaciones afectadas.
- La revisión automática de permisos bloqueó el arranque de Docker Desktop y del servidor web local para QA visual. La prueba PDF/OCR aislada sí se ejecutó; las comprobaciones de contenedores y concurrencia se realizan en GitHub. No se afirma una revisión visual manual completa del CRM.

## Publicación y seguimiento diario

El push de código se realiza sin el efecto lateral `sync:press` del hook local, que escribiría en el CRM. Se mantienen desactivados los despliegues Git de Vercel para master y para la rama de integración. No se ejecutan migraciones, IndexNow ni despliegues al VPS desde esta tarea.

Zack Guardian sigue revisando a las 08:30 y Zack Dev a las 08:45, Europe/Madrid, en modo shadow. Sus ejecuciones 307 y 308 del 14/09 se comprobaron en registros persistidos. El control Codex **SocialPro — Revisión GitHub y Zack** complementa esos informes a las 09:00 con acceso directo a PR, issues y alertas. No se atribuye a Zack una herramienta GitHub que todavía no está instalada ni se modifica su presupuesto.

La corrección del repositorio y el estado de producción son evidencias distintas. La recuperación WhatsApp conserva sus límites de piloto y los casos de reconciliación manual descritos en su documentación; integrar el código no autoriza a resolver identidades ambiguas por suposición ni a ampliar destinatarios.
