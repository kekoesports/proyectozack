---
read_when: Reviewing, testing or authorizing activation of CRM quick notes and task notices.
---

# Notas rápidas y avisos de tareas — 11 septiembre 2026

## Estado actual

**ACTIVO Y FUNCIONANDO desde el 11-09-2026.** El usuario autorizó expresamente la activación después del commit/push. Se ha desplegado sobre la versión viva, migrado mediante el runner del proyecto y verificado en la web publicada, con limpieza de todos los registros sintéticos. Evidencia y parada reversible: [activación](quick-notes-activation-2026-09-11.md).

**Atención para futuros despliegues:** producción ya tenía `0161_creator_intake`; la migración de notas se generó como **0162** sobre ese esquema y diario. No aplicar la `0161_quick_notes_task_notices` de esta rama contra producción ni desplegar master sobre las mejoras vivas sin integrarlas. El documento de activación identifica el artefacto completo conservado.

## Estado y alcance de la entrega inicial — historial anterior a la activación

- **IMPLEMENTADO:** en `codex/quick-notes-overdue-alerts`, copia separada `socialpro-quick-notes`, basada en `origin/master` `bcb29449a46cb4da265eee16b551a9facfc05a13`.
- **PROBADO:** lógica con PostgreSQL en memoria, migración incremental, permisos, acciones reales y recorrido de navegador en escritorio/móvil. Detalles y límites abajo.
- **ACTIVO EN PRODUCCIÓN: NO.** Interruptor apagado por defecto; ejemplo de cron sin cargar. No se ha hecho despliegue, migración real ni activación. La carpeta original con cambios anteriores se ha conservado.
- La entrega inicial autorizaba desarrollo y pruebas aisladas. Después, el usuario pidió explícitamente **commit y push a master**; esa autorización sustituye el límite anterior de publicación del código. No incluye migraciones reales ni activación de la función.
- Limpieza: servidor local y PostgreSQL en memoria detenidos al terminar; puertos 3451, 55441 y 55442 sin servicio de prueba. Los registros sintéticos desaparecieron con la base desechable. Se conservan solamente código, capturas y evidencias locales.

## Uso para Pablo y Alfonso

1. En cualquier pantalla autorizada del CRM, pulsar **＋ Nota rápida**. Solo hace falta escribir el texto.
2. **Auto** crea una tarea propia de prioridad media si reconoce una acción clara. **Solo nota** nunca convierte automáticamente. **Crear tarea** usa los mismos valores seguros; pide revisión si hay varias acciones, menciones o fechas ambiguas.
3. «Mañana pedir a Rinna la aprobación de la miniatura» programa trabajo para mañana, sin inventar fecha límite. «Rinna prefiere las miniaturas rosas» se conserva como información. Los nombres en el texto no crean relaciones con entidades.
4. Una mención como `@Alfonso` se resuelve contra usuarios existentes. Se confirma el responsable, título, fechas y el contenido que esa persona verá. La nota original sigue siendo privada.
5. Tras crear la tarea aparecen su responsable, prioridad, fechas y enlaces para abrir/editar. **Deshacer conversión** archiva únicamente una tarea pendiente que no se ha gestionado y para la que el autor conserva permisos. Se guarda el historial y no se permite crear otra tarea con la misma conversión.
6. **Más → Notas** ofrece Mis notas, Compartidas conmigo, búsqueda, filtros, estado de tarea, edición, archivo y conversión manual. Compartir el texto actual/original es explícito; desmarcar destinatarios revoca el acceso.
7. En **Avisos de tareas** se agrupan las tareas altas vencidas y los recordatorios programados. Cerrar marca leído; **Recordar en 1 hora** o **Otro momento** posponen el aviso. Ninguna de estas opciones completa la tarea.
8. Horario inicial: lunes a viernes, 09:00–20:00, Europe/Madrid. Se puede cambiar en el panel de avisos. Fuera del horario sigue disponible la consulta manual, sin aviso automático. No hay Web Push con la web cerrada.

## Implementación y reutilización

- Se reutilizan `crm_tasks`, `crm_alerts`, usuarios, permisos del módulo tareas, relaciones del CRM, componentes y colores del panel. Se conservan lista, Kanban y calendario.
- Se corrige el guardado de `startDate` en creación/edición y se distingue de `dueDate` y del nuevo `remindAt`. Los editores anteriores no borran un recordatorio que no hayan enviado.
- La ruta `/admin/tareas/[id]` comprueba acceso independientemente de la semana. El enlace a la nota original solo aparece a quien pueda leerla.
- Se guarda la nota en una transacción anterior a la interpretación. Una caída de interpretación/conversión no elimina la nota; un fallo de transporte mantiene el borrador abierto.
- Interpretación local determinista y conservadora, validada con Zod. No se usa un proveedor de IA ni se envían datos fuera. Negaciones, ideas, menciones ambiguas, varias acciones y fechas no interpretables requieren revisión.
- Fechas relativas ancladas a la creación de la nota en Madrid; horas inexistentes o ambiguas por cambio horario se rechazan para que se revisen.
- Notas privadas incluso frente a otros administradores; compartir no concede permiso para editar, ni acceso a un trato/talento/marca restringido. Se conserva el alcance de `admin_limited_tasks`. Destinatarios de tareas: los roles asignables ya existentes.
- Idempotencia: UUID de guardado, bloqueo transaccional de la nota, una conversión por nota mediante clave primaria, tarea única por conversión y auditoría de edición/compartición/archivo/deshacer. Editar la nota no modifica la tarea.
- Avisos: clave única por tarea, destinatario y tipo; lectura, posposición con hora, presentación y reserva temporal por pestaña separadas. Confirmación de presentación después de renderizar. La reclamación y deduplicación son del servidor, no de localStorage.
- Sondeo con CRM abierto cada 30 segundos y al recuperar foco. El endpoint de cron sincroniza el estado persistido; completar, archivar, bajar prioridad, cambiar fecha/responsable o quitar un recordatorio resuelve el aviso obsoleto. No modifica tareas históricas.
- Las nuevas alertas no usan el límite de tres tareas del resumen antiguo ni entran en sus notificaciones personales de asignación.

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Correcto |
| `npm run lint` | 0 errores; un aviso previo en `PnLFilters.tsx` |
| `npm test -- --runInBand --forceExit` | 418 suites y 6507 pruebas correctas; 1 suite/prueba omitida por la configuración existente |
| Seis suites específicas de tareas/permisos | 71 pruebas correctas, incluidas dos regresiones nuevas de fechas |
| `npx drizzle-kit check` con URL sintética | Correcto; solo metadatos |
| `npx tsx scripts/test-quick-notes-isolation.ts` | 15 escenarios correctos |
| `npx tsx scripts/test-quick-notes-browser.ts` | Recorrido correcto en Chrome escritorio 1440×1000 y móvil 390×844 |
| Revisión visual | Capturas de notas, tarea y panel móvil inspeccionadas |

La prueba aislada genera la base previa desde el snapshot 0160, inserta un testigo histórico y aplica **el SQL generado 0161**, comprobando que conserva ese registro. También compara el snapshot 0161 con el esquema actual: sin diferencias. No acredita el arranque de toda la cadena histórica ni el esquema de producción.

Los 15 escenarios cubren persistencia, información/acción, reintentos concurrentes, versiones, privacidad por lectura/escritura directa, compartir/revocar, asignación permitida/denegada, fallo de interpretación, fechas/DST, tarea futura, deshacer seguro, más de tres tareas vencidas, ACK entre pestañas, posposición/lectura/cancelación, horario y recordatorios precisos reprogramados.

El navegador verifica fallo de transporte sin pérdida del borrador, recarga, restauración de foco, tarea futura y edición real, petición directa de otro usuario a una nota privada, compartir/revocar, asignación revisada a Alfonso, confirmación con prioridad correcta, dos pestañas, posposición persistida, finalización y cancelación por cron, rechazo del cron sin credencial, panel móvil y Escape. Sin errores JavaScript no capturados. Capturas y log general en `.scratch/quick-notes/evidence/` (local, no versionado).

## Límites observados

- **Inicio de sesión por contraseña bloqueado en esta copia:** Better Auth instalado **1.7.2** filtra las cuentas de credenciales por `issuer`; `src/db/schema/auth.ts` no contiene ese campo. Con una contraseña sintética cuyo hash se comprobó, `/api/auth/sign-in/email` respondió 401. No se cambió autenticación ni se ha comprobado este problema en producción.
- El recorrido usa sesiones sintéticas persistidas y firmadas exclusivamente con el secreto del servidor desechable. `ENABLE_DEV_AUTH_BYPASS=false`: Better Auth valida la sesión real; sesiones ausentes o manipuladas son rechazadas. No se ha validado login por contraseña ni el flujo de 2FA de extremo a extremo.
- PGlite es un backend de PostgreSQL en memoria y usa una conexión para serializar transacciones. Se probaron reintentos concurrentes y dos pestañas reales, además de las restricciones de base de datos; falta una prueba de contención con múltiples conexiones de PostgreSQL convencional antes de activar en producción.
- Se bloquearon medios/telemetría de terceros en el navegador. No hay IA, correo, WhatsApp ni otros proveedores llamados por esta funcionalidad.
- La primera ejecución general encontró que una prueba de paridad de cron interpretaba también un comando comentado. El ejemplo se trasladó a un archivo no cargado; la ejecución completa posterior pasó. Jest dejó manejadores abiertos y se completó con `--forceExit`; no se atribuye su causa a esta funcionalidad.
- No se ha ejecutado build/despliegue de producción. Las comprobaciones visuales corresponden al servidor Next local.

## Reproducir sin datos reales

En esta copia separada, sin archivos `.env*`:

```text
npm ci --ignore-scripts --no-audit --no-fund
npx tsx scripts/test-quick-notes-isolation.ts
npx tsx scripts/quick-notes-browser-server.ts
# En otra terminal:
npx tsx scripts/test-quick-notes-browser.ts
```

El primer test usa PostgreSQL en memoria en loopback 55441. El servidor de navegador usa 55442 y Next en `http://127.0.0.1:3451`. El harness rehúsa arrancar si existen archivos de entorno y lanza Next con configuración sintética explícita. El test de navegador verifica las cinco identidades esperadas antes de escribir. Requiere Chrome instalado. Los datos desaparecen al detener el proceso de la base en memoria; nunca se copian a producción.

## Plan de activación original — autorización ya recibida y trabajo ejecutado

1. Revisar los cambios y resolver/verificar el bloqueo de autenticación en la rama que se vaya a publicar. Comprobar también contención con conexiones independientes en PostgreSQL desechable.
2. Revisar el esquema y diario reales, copia de seguridad y destino antes de aplicar **`drizzle/0161_quick_notes_task_notices.sql` mediante `npm run migrate`**. No usar `drizzle-kit push` ni marcar migraciones manualmente.
3. La migración es aditiva: cinco tablas, campos horarios nullable e índices. No hay backfill ni modificación de filas antiguas. Los `ALTER TABLE` y el índice único de alertas pueden bloquear brevemente tablas; revisar tamaño y ventana antes de ejecutar. No desplegar el nuevo esquema TypeScript contra una base sin migrar, aunque el interruptor siga apagado.
4. La publicación del código en master está autorizada. El despliegue, la migración real y configurar `QUICK_NOTES_ENABLED=true` requieren autorización para el destino correspondiente.
5. Con permiso de activación, incorporar al scheduler existente la línea de `infra/crm/scheduler/quick-notes.crontab.example`, que reutiliza su `CRON_SECRET` y red interna. El archivo de ejemplo no se carga automáticamente. Verificar un caso sintético con persistencia, entrega/ACK y repetición sin duplicado; limpiar esos datos sintéticos al terminar.
6. Parada reversible: quitar/deshabilitar esa línea y poner `QUICK_NOTES_ENABLED=false`. Conservar tablas e historial; no borrar columnas como estrategia de rollback. Si hace falta volver al código anterior, las columnas nullable añadidas permiten conservar los datos.

No se solicita una nueva aprobación para el commit y push a master ya autorizados. Desplegar, migrar datos reales o activar el cron requieren una autorización posterior explícita del usuario.
