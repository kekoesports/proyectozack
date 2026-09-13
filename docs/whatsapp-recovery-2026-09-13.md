---
read_when: Operar, desplegar, revisar incidencias o continuar la recuperación de WhatsApp de septiembre de 2026.
---

# Recuperación de WhatsApp · 13 de septiembre de 2026

Este documento describe hechos comprobados y distingue el piloto de la atención general. No contiene credenciales ni mensajes de clientes. Las evidencias completas están únicamente en el VPS, en una carpeta privada con acceso restringido.

## Qué se encontró

La fuente publicada era `socialpro-keydrop-curly-zack-20260911`, posterior a la versión de notas mencionada en el encargo. WhatsApp funcionaba en otro contenedor con código montado desde `socialpro-waha-onboarding-v2-20260910`. Ninguno coincidía completamente con `master`.

El proveedor es WAHA 2026.8.2 CORE, motor GOWS, con imagen fijada por digest. No se encontraron workflows ni credenciales de WhatsApp en la base de n8n. La recepción del bot llega directamente a un servicio privado.

Había tres conversaciones de WhatsApp correspondientes a **dos teléfonos**, según consulta autenticada al proveedor. Dos conversaciones del teléfono del piloto estaban separadas por el identificador de ejecución. La conversación LID pertenece a otra persona: no se ha unido al teléfono del piloto. El contacto de las 05:41 estaba fuera de la lista autorizada para respuestas automáticas. Devolver ese contacto al estado de asistente no ampliaba esa lista. El estado humano tampoco autoriza respuestas automáticas.

La configuración mantenía un solo chat para respuestas y 30 reservas de IA totales, 21 consumidas al comenzar la auditoría. No se han borrado reservas ni autorizado gastos nuevos. La solicitud de presupuesto para atención general sigue pendiente de respuesta del propietario.

## Cambios implementados

- Una identidad estable por teléfono verificado, con alias del proveedor separados. No se infieren teléfonos a partir de un LID ni del nombre de la persona.
- Historiales anteriores vinculados, conservando mensajes, controles, envíos y enlaces antiguos. Solo el contacto canónico aparece como conversación accionable.
- Recepción persistente antes de confirmar el webhook. Cola ordenada incluso si dos mensajes llegan en el mismo milisegundo, exclusión entre consumidores, recuperación de bloqueos caducados y reintentos limitados.
- Los mensajes que han envejecido durante una interrupción se conservan para revisión; no se contestan fuera de contexto. El CRM permite revisar fallos y reintentar únicamente entradas recientes.
- Los errores comprobados antes de intentar enviar se pueden reintentar. Una entrega incierta nunca se reenvía a ciegas: requiere revisión, evitando respuestas dobles.
- La intervención del propietario pausa el contacto completo. La devolución al asistente solo habilita mensajes nuevos; no reproduce el historial. No se añadió expiración automática de la atención humana.
- Monitor del servicio, sesión, cola, errores, respuestas sin confirmar, conversaciones sin respuesta, duplicados, reservas operativas, reinicios y recursos. Avisos privados con comprobación del destinatario, confirmación de aceptación y supresión de repeticiones.
- Compilaciones serializadas mediante bloqueo de host y constructor limitado a 5 GB y dos CPU. Imágenes reutilizables; el arranque no compila ni migra.

El saludo, las respuestas aprobadas, el catálogo público v5, las reglas de clasificación y el extractor conservan el texto publicado. Esta reparación no sustituye el flujo por el cuestionario histórico del documento de encargo. No se incorporaron contratos, tarifas privadas, banca, claves ni historial de Drive al conocimiento del bot. Los datos dinámicos sin una consulta autorizada no se inventan: el catálogo remite al equipo.

## Qué hacer en el CRM

Abrir [Captación](https://socialpro.es/admin/captacion). «Tomar conversación» pausa al asistente; responder desde el móvil también. «Devolver al asistente» permite responder al siguiente mensaje nuevo de un contacto habilitado. Un contacto fuera del piloto requiere atención personal; el CRM lo explica y rechaza una devolución engañosa al asistente.

«Aceptado por el canal» significa que el proveedor confirmó el envío; no demuestra que la persona lo haya leído. Una entrega por revisar debe comprobarse en WhatsApp antes de responder manualmente. Una entrada antigua de la bandeja de errores puede marcarse revisada, pero no se reenvía automáticamente.

Las métricas recibidas siguen siendo declaradas, no verificadas. El bot no promete campañas, precios, contratos ni ingresos. La prueba final se limita al teléfono personal autorizado del propietario.

## Reconciliación y migraciones

Rama de recuperación: `codex/whatsapp-recovery-20260913`, desde `origin/master` en `f778b3f0`. Se incorporaron 86 diferencias de código/configuración de la web viva y los archivos de ejecución del worker. Se comprobaron además 178 archivos públicos y de configuración. Se mantiene la protección de 2FA, captación, notas, rankings y cambios publicados de sorteos. Las pruebas antiguas de Discord/hojas/sorteos se actualizaron según ese comportamiento publicado.

La cadena real contiene `0161_creator_intake` y `0162_quick_notes_task_notices`. Las 163 entradas previas coinciden en fecha y contenido con el diario: 77 hashes exactos y 86 tras normalizar únicamente CRLF a LF. No se modificó el diario de producción. La variante huérfana `0161_quick_notes_task_notices.sql` de master se retira de esta rama: no era la cadena aplicada en este VPS. Esto exige revisar otros destinos antes de fusionar; no habilita desplegar automáticamente la rama en otro entorno.

Las migraciones nuevas, generadas desde Drizzle, son `0163_whatsapp_reliability` y `0164_whatsapp_queue_order`. Añaden dos tablas, un vínculo nullable de historial y una secuencia de orden. No eliminan tablas, columnas ni datos. El migrador soportado las aplicó primero sobre una restauración aislada y después sobre producción con el rol migrador existente.

La aplicación anterior puede leer sus tablas tras estas adiciones. El **worker antiguo no debe reactivarse sobre identidades canónicas** sin una reversión de datos revisada: volvería a usar identidades dependientes de la ejecución. Conservarlo no equivale a considerarlo compatible.

## Copias y operación

Directorio privado: `/home/deploy/.config/socialpro/whatsapp-audit-20260913/`, permisos 0700 y archivos privados 0600. Contiene fuentes originales, configuraciones de contenedores, copia lógica anterior y previa a activación, mapa verificado de identidad y evidencias. La copia completa se restauró solo en PostgreSQL desechable aislado; nunca sobre la base real.

Servicio nuevo: `socialpro-waha-reliability`, recepción/estado en loopback 3033. Proveedor conservado: `socialpro-waha-pilot`, loopback 3031, sesión persistente original. El webhook pasa al nuevo receptor, con reintentos de entrega limitados a 120 intentos cada cinco segundos. El procesamiento tiene un límite de antigüedad menor y exige revisión si vence; las dos protecciones tienen finalidades distintas.

El monitor usa el crontab del usuario deploy porque su sesión systemd no tiene persistencia al cerrar sesión. `infra/creator-intake/install-watchdog.py` conserva las tareas ajenas, instala una única entrada y guarda la copia anterior. Sus estados y registros acotados viven en `~/.config/socialpro/whatsapp-reliability/`.

Para una parada operativa segura del procesamiento, `python3 infra/creator-intake/deploy.py pause` conserva el receptor y su cola. `resume` permite procesar únicamente entradas que sigan siendo recientes. No borra la sesión, no solicita un QR y no reproduce historia antigua. Los procesos reciben cierre ordenado y reinicio de Docker; el monitor limita las recuperaciones para evitar un bucle.

Cuatro contenedores antiguos de web, sin referencia de Caddy, cron o entorno activo, se detuvieron conservando sus imágenes y configuración. La memoria disponible pasó aproximadamente de 4,5 GB a 6,4 GB. No se modificaron Caddy ni los otros dominios por esta limpieza. No se desactivó ni vació la swap.

## Evidencia y límites actuales

**IMPLEMENTADO:** identidad, cola, recuperación segura, revisión, monitor, despliegue reproducible y reconciliación de fuentes.

**PROBADO:** 73 pruebas específicas de captación; siete recorridos sobre PostgreSQL real aislado (con transporte e IA simulados); siete pruebas del monitor; dos pruebas de sincronización con Sheets simulado; tipos y lint sin errores, con dos avisos preexistentes de navegación. La última ejecución general tuvo 6600 pruebas correctas, una omitida y un fallo en la expectativa del bloqueo de publicación; las ocho pruebas de esa suite pasan tras incluir la nueva rama bloqueada. El proceso general dejaba handles abiertos y se ejecutó con `--forceExit`: no se presenta como un problema resuelto del bot.

**ACTIVO:** migraciones, vínculo conservador de un par duplicado, receptor nuevo, sesión reconectada, CRM con sesión real de administrador verificada y monitor de un minuto. Prueba privada del monitor aceptada por Telegram y repetición sin segundo envío. La vuelta al upstream anterior y la reactivación de la nueva web se probaron conservando los demás destinos de Caddy. Una actualización del worker rechazada por formato de fecha recuperó automáticamente la versión compatible anterior; el formato se corrigió y la actualización posterior arrancó correctamente.

**POR CERRAR:** imágenes definitivas identificadas por commit, prueba real nueva de WhatsApp con el propietario, activación del registro de contactos protegido, commit/PR y evidencia final. Este apartado se actualizará con resultados; no equivale a finalización.

El journal del kernel se pudo consultar usando un contenedor auxiliar sin red, con todos los capabilities retirados y únicamente el ejecutable, sus bibliotecas y el journal montados en solo lectura. Se registraron ocho cierres de `next-build` entre el 8 y el 11 de septiembre y uno de `MainThread` el 11 a las 09:36 UTC. No aparecen cierres OOM en torno al mensaje del 13 a las 03:41 UTC (05:41 Madrid). No se atribuye ese silencio al OOM. El monitor incorpora esta lectura. Un monitor en el propio VPS no puede avisar mientras todo el VPS está apagado.

El registro de contactos de Drive llevaba fallando por `contacts-sheet-readback-mismatch` antes de la migración. La vista previa mostró 24 contactos intentando modificar 12 filas compartidas y 76 escrituras repetidas sobre las mismas celdas. Se detuvo ese proceso, se conservó su configuración y se añadió una protección: las filas ambiguas se omiten y cuentan como conflictos, sin fusionar personas por conjeturas. La nueva vista previa encuentra 92 contactos, cero altas, cero modificaciones necesarias y 12 filas que necesitan revisión de identidad. No se realizó una limpieza ni un reprocesamiento histórico de esas filas.

La comprobación de fuentes no encontró coincidencias exactas con 37 credenciales activas en 3754 archivos revisados. Un análisis de cuatro familias de patrones sensibles sobre 11129 blobs históricos de Git tampoco encontró coincidencias; nueve blobs de más de 2 MB quedaron fuera de ese análisis por patrones. Esto no constituye una garantía matemática sobre cualquier secreto posible.

No se garantiza respuesta automática completa en inglés por las pruebas actuales: se preservó el catálogo aprobado en español y se comprobó la entrada en ambos idiomas con extracción simulada. Extender las respuestas aprobadas sería una decisión editorial adicional.

La rama deshabilita despliegue automático de Vercel. Antes del push se revisa el hook que ejecuta `sync:press`; se aísla ese efecto ajeno, manteniendo las comprobaciones de ingeniería. No se fuerza push ni se fusiona una recuperación incompleta.

Las contraseñas de los paneles compartidas anteriormente deben rotarse por el propietario. No se reproducen, no se guardaron en el repositorio y no se modifican otros accesos como parte de esta reparación.
