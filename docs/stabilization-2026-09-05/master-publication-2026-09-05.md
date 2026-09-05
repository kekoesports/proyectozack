# Publicación controlada en master — 2026-09-05

## Alcance

Autorización expresa del usuario: actualizar primero y commitear/subir a master los cambios pertinentes. La integración parte de `origin/master` actualizado (`6b967d5a`), sin fusionar los 24 commits de auditoría/prototipos como un bloque.

Incluye Creator Discovery y sus pruebas, guard y plantillas n8n internas, instrucciones aprobadas, login compartido sin rediseño y protección de compilación/publicación. No cambia portada, estilos globales, activos públicos, dependencias ni prototipos. No publica archivos privados de QA, credenciales ni datos concretos de campañas.

## Aislamiento de publicación

- GitHub: cero webhooks de repositorio observados; master sin protección a la lectura previa.
- Vercel: cero proyectos en el equipo conectado. La configuración rechaza despliegues Git de master/estabilización; un guard sin dependencias bloquea esas referencias o una referencia desconocida antes de migración, compilación e IndexNow.
- Hook de prensa: no se ejecuta `sync:press` como efecto del push. Las comprobaciones se ejecutan explícitamente; no se sustituye su resultado por omitir un hook.
- CI y E2E: PostgreSQL efímero y configuración sintética, sin credenciales productivas.
- VPS: subir código no migra la base ni reemplaza contenedores. El despliegue sigue siendo una operación separada con su propia validación y reversión.

## Verificación de esta integración

- TypeScript: PASS.
- Metadatos Drizzle: PASS; generación canario sin cambios de esquema ni archivos nuevos.
- Lint global: PASS.
- Jest completo sobre el árbol integrado: 378 suites y 6.050 tests PASS; una suite/un test omitido requiere una fixture financiera privada y no se ejecutó. Sin cobertura; máximo dos workers y conexiones externas bloqueadas.
- El primer pase detectó seis expectativas obsoletas en cuatro tests idénticos al master previo. Se incorporaron sólo sus correcciones de fixtures/expectativas ya revisadas; ningún archivo de lógica financiera fue modificado.
- Guard n8n: 176/176 PASS; protección de publicación: 8/8 PASS, incluida en Jest y contrastada independientemente.
- Aviso residual del runner: un worker Jest necesitó cierre forzado al finalizar. Todas las aserciones y el proceso principal terminaron correctamente; el aviso no se presenta como limpieza completa de timers.
- Build Linux y comprobaciones remotas se observan después del push; los resultados de fixtures no se presentan como despliegue real.
- La rama original y sus prototipos archivados quedan conservados localmente, no se borran ni se publican como diseño activo.

## Estado operativo

Esta publicación de código no acredita activación del nuevo discovery o digest. Las migraciones 0149/0150 siguen separadas del push. La documentación de proveedores permanece pendiente de presentación: no se registra como recibida ni se inventan condiciones de conservación o uso.

El usuario también autorizó una credencial temporal de compilación limitada a lectura de datos públicos necesarios. Esa autorización no habilita copiar el archivo general de producción ni claves bancarias. Su creación, uso y revocación deben verificarse en el despliegue, no darse por realizados con este commit.
