---
read_when: Operating or redeploying the live CRM quick-notes and task-notices feature.
---

# Activación de notas rápidas — 11 septiembre 2026

Actualización posterior, 09:42 UTC: la web publicada y el procedimiento de reversión actuales están en [Tareas personales y post-it](kanban-private-workspace-2026-09-11.md). Este documento conserva la evidencia de la activación inicial; su contenedor sigue atendiendo el cron de avisos.

## Estado y autorización

- **IMPLEMENTADO:** commit `ad1894faa6490b1e615c6ab20655b14a24e5ba31`, ya en master.
- **PROBADO:** comprobaciones de código, PostgreSQL 17, navegador de escritorio/móvil, contraseña y doble factor reales, y recorrido en producción.
- **ACTIVO:** `QUICK_NOTES_ENABLED=true`; web publicada y un único cron nuevo cada minuto.
- **FUNCIONANDO:** nota → tarea → aviso persistido → presentación/ACK → repetición sin duplicado → posposición → finalización y resolución del aviso.
- Autoridad: el usuario pidió «activa la función y comprueba que todo funcione para usarlo ahora». Sustituye los límites anteriores de activación. No se cambiaron contraseñas, permisos ni configuraciones de otros usuarios.

## Versión instalada y conservación de la web

La versión viva contenía mejoras posteriores al checkout: acceso/2FA, captación, bot, prensa, talentos y contenido de vídeo. Se integró la función sobre `/home/deploy/socialpro-keydrop-eruby-20260910`, conservando esos archivos y las dependencias publicadas (Better Auth 1.7.3).

- Fuente completa: `/home/deploy/socialpro-quick-notes-20260911`.
- Contenedor: `socialpro-crm-quick-notes-20260911`.
- Imagen: `socialpro:quick-notes-live-20260911`.
- Procedencia y hashes de archivos: `quick-notes-manifest.json` dentro de la fuente.
- Overlay: `/home/deploy/notes-overlay-20260911.tar.gz`, SHA-256 `d9b3a7c35bad042f11a686ba66f40f02202b0e2d1b9cf0227730fa82a926d17d`.
- Conflictos integrados de forma explícita: layout (conservando el alta de 2FA), navegación (conservando Captación) e índice de esquemas.
- Configuración de autenticación, esquema de cuentas, auth guard, incorporación a 2FA y ambos archivos de dependencias: idénticos a la versión viva anterior.
- Compilación definitiva con conexión de solo lectura y datos públicos reales. Sin claves de correo, bancos o IA en la configuración de compilación. Credenciales temporales eliminadas.
- Solo se cambió el upstream de `socialpro.es`. Otros dominios, Studio, bots y trabajadores conservaron su configuración. Portada, bloque de contenido y enlaces TikTok comprobados antes/después.

## Migración y seguridad de datos

Producción ya tenía `0161_creator_intake`. Drizzle generó `0162_quick_notes_task_notices` sobre el esquema/diario de esa versión viva; su SQL es idéntico al SQL aditivo revisado para notas. Se conservaron la migración de captación, su snapshot y todas las entradas anteriores del diario.

Preflight: exactamente una migración pendiente, timestamp posterior al máximo real. Destino PostgreSQL `socialpro`, roles existentes `socialpro_app`/`socialpro_migrator`. No se alteró el historial de migraciones para forzar el resultado.

Copia completa restaurada y comprobada en PostgreSQL aislado: 280 tareas, 8 usuarios y 213 entradas del diario. La restauración de prueba se eliminó. Segunda copia inmediatamente antes de aplicar, guardada de forma privada. Migración mediante **`npm run migrate`**, con tiempo de espera de bloqueo limitado; diario posterior: 214 entradas. Permisos efectivos del rol de aplicación comprobados en las cinco tablas nuevas. No hubo cambios de filas históricas ni otros DDL.

Evidencia privada del servidor: `/home/deploy/.config/socialpro/quick-notes-20260911/`. Contiene copias de seguridad, logs de migración, manifest, comprobaciones, configuración anterior de Caddy y del scheduler. No copiar las copias de datos a Git.

## Verificación

- CI del commit: terminado correctamente, incluida compilación y runtime Docker.
- Tipos del código integrado: correctos; compilación definitiva también completó TypeScript.
- Lint del código integrado: cero errores; dos avisos previos de navegación en el alta 2FA y filtros P&L.
- Metadatos Drizzle y comparación del SQL generado: correctos.
- PostgreSQL 17 aislado, pool de diez conexiones: los 15 escenarios de notas, permisos, concurrencia, fechas, deshacer y avisos pasan. Sustituye el límite de serialización de PGlite documentado en la entrega inicial.
- Navegador sobre la imagen compilada aislada: contraseña real Better Auth 1.7.3, privacidad por petición directa, compartir/revocar, tarea futura, cambio real de tarea, dos pestañas, posposición, escritorio y móvil; sin errores de aplicación.
- Autenticación aislada: contraseña incorrecta y OTP incorrecto rechazados, alta de 2FA verificada, nuevo login exige OTP y permite abrir notas después. No hubo bypass de autenticación.
- Los primeros intentos de los harness encontraron límites de memoria/red, límite de login por pruebas paralelas y cierre de rutas de Playwright. Se corrigió el entorno/harness, se separaron las pruebas de login y se completaron de nuevo; no se relajó ninguna protección de la aplicación.

### Recorrido publicado (UTC)

Identidad sintética exacta: `notes-activation-20260911`, rol staff; eliminada al terminar.

| Paso | Evidencia |
| --- | --- |
| Nota guardada | `af061ce8-abe8-4589-99b8-9cdb79eb1b53`, 08:37:38.826 |
| Conversión persistida | Una tarea, ID 1819; edición real a prioridad alta/fecha vencida |
| Aviso persistido | ID 35, 08:38:08.577 |
| Presentación/ACK | 08:38:08.658; una sola pestaña con banner |
| Cron por red/credencial reales del scheduler | Primera ejecución creó seis avisos reales adicionales; repetición creó cero |
| Posposición y recarga | Verificadas en navegador; tarea no completada por posponer |
| Finalización real | Aviso resuelto 08:38:44.355; navegador terminó 08:38:44.561, sin errores JS |
| Scheduler automático | Ejecuciones de 08:39 y 08:40 correctas; una única línea nueva |
| Limpieza | Cuenta, credenciales, sesiones, nota, historial de esa nota, ajustes, tarea y aviso sintéticos eliminados; comprobación posterior sin esos registros |

Se eliminaron también el servidor y PostgreSQL aislados, su volumen anónimo, la red de pruebas y los archivos temporales de credenciales. Se conservan evidencias y código de prueba fuera de la web.

## Operación y parada reversible

- Acceso: `/admin/notas` y botón **＋ Nota rápida** en el CRM para roles autorizados.
- Avisos con el CRM abierto: sondeo cada 30 segundos; sincronización persistida cada minuto. Horario inicial lunes–viernes 09:00–20:00, Madrid, configurable. No es Web Push con el navegador cerrado.
- Cron real: `/home/deploy/.config/socialpro/zack-20260911/scheduler-crontab`, endpoint interno del nuevo contenedor `/api/cron/sync-task-notices`. Credencial existente comprobada. El resto de líneas permaneció igual. Recarga mediante SIGUSR2, conforme a la documentación de [Supercronic](https://github.com/aptible/supercronic#reload-crontab).
- Para parar: retirar solo esa línea y recargar el scheduler; recrear la web con `QUICK_NOTES_ENABLED=false` o devolver únicamente el upstream de SocialPro al contenedor anterior conservado `socialpro-crm-keydrop-eruby-20260910`.
- Conservar tablas, notas e historial durante una reversión. No revertir con DROP ni restaurar toda la base sobre cambios posteriores.
- Para redesplegar: partir de la fuente/manifest completos identificados arriba, o reconciliar previamente en Git todas las mejoras vivas y la secuencia de migraciones. **Master sin esa integración no representa toda la versión instalada.**
