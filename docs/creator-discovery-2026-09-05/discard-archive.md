# Archivo recuperable y reevaluación de Leads CC

Implementación local del 05/09/2026; este documento no acredita aplicación ni limpieza en producción.

## Archivo sin borrado

- Se reutiliza `targets.status = descartado`: no hay migración nueva ni transformación masiva de históricos.
- La consulta ordinaria, el portal de marcas, el total activo y «Todos» excluyen descartados. El administrador conserva acceso por la pestaña explícita «Descartado».
- «Archivar» sustituye las acciones de borrado de Leads CC. Conserva filas, identidad, cuentas, notas, fechas anteriores y decisiones; el cambio de estado tiene historial y actor, bajo bloqueo de fila y transacción.
- Los nombres internos `deleteTargets`/`deleteAllTargets` se conservan por compatibilidad, pero no ejecutan DELETE. Archivar explícitamente una fila ya descartada sustituye un motivo anterior de rendimiento por una decisión `other` no reabrible automáticamente; repetirlo cuando la última decisión ya es ese archivo no añade otra transición.
- Restaurar manualmente sigue siendo una decisión explícita con los permisos existentes. No se envía contacto, propuesta, contrato ni correo.
- El redescubrimiento por ID inmutable conserva el mismo target. Cambiar de nombre no elimina su supresión; las colisiones de identidad requieren revisión.

## Cuándo puede volver a revisión automática

Sólo para YouTube y una última decisión humana explícita `audience_low` o `inactive`:

1. El target está bloqueado antes de leer su decisión; el cambio manual concurrente no se sobreescribe. Se elige la última decisión por ID de inserción bajo ese bloqueo, no por el timestamp de inicio de una transacción antigua. Las nuevas decisiones manuales registran la fecha después de adquirir el bloqueo.
2. Existe una muestra anterior al descarte todavía dentro de la retención autorizada. No se fabrica una baseline con la primera búsqueda posterior.
3. Ambas muestras acreditan cobertura completa, la misma ventana y la versión `youtube-recent-publications-v1`. Una página parcial, un marcador ausente o un cambio de definición impide la reapertura.
4. Los datos nuevos necesarios son disponibles, de fuente esperada, observados después del descarte y dentro de las últimas 24 horas; fechas futuras/ inválidas y last-good con estado error/stale no pasan.
5. Cumple publicación mínima, mediana objetivo, actividad reciente, contenido y filtros de idioma/país del perfil actual. Un cero medido sigue siendo cero; null no pasa como cero.
6. Por audiencia: la mediana nueva supera realmente a la anterior. Por inactividad: hay publicaciones posteriores al descarte y aumenta el recuento comparable.
7. Se escribe primero una decisión automática `evidence_improved` con referencias al descarte, baseline y run; después vuelve a `pendiente`/revisión. No equivale a contacto ni aceptación comercial.

Una objeción de representación, incompatibilidad o falta de interés en el target/identidad conocida bloquea la reapertura automática aunque otra métrica mejore. Un creador vinculado al roster tampoco se reabre.

## Límites deliberados

- Descartes legados sin motivo o baseline verificable permanecen archivados; no se adivina por qué se descartaron. Se pueden recuperar mediante revisión manual explícita.
- Twitch/Kick en directo e Instagram no aportan aquí un histórico comparable suficiente: no se reabren por una observación puntual.
- Las medianas son vistas acumuladas observadas de vídeos publicados en la ventana; no son vistas ganadas durante el período ni una tasa de crecimiento exacta.
- El CSV/importador legado puede enriquecer metadatos, pero nunca levanta el estado descartado automáticamente. La decisión de reapertura sólo pertenece al flujo con evidencia versionada.
- El replay de una observación por account/run no repite el historial ni levanta la supresión. Una escritura incierta no autoriza reintentos fuera de ese contrato.

## Verificación

- Tests deterministas de elegibilidad: `creator-discard-reevaluation.test.ts`.
- Integración de identidad, bloqueo, historial, persistencia y replay con DB simulada: `creator-discard-storage.test.ts`; no demuestra contención real entre procesos PostgreSQL.
- SQL compilado, archivo recuperable y permisos de ámbito de marca: `target-archive.test.ts`.
- Recorrido de tabla con filtros, acceso explícito al archivo y selección masiva visible: `targets-platform-filter.test.tsx`; acciones simuladas, no mensajes reales.
- Despliegue, contraste de datos reales y prueba de listado productivo corresponden al operador y deben registrarse aparte. No se afirma limpieza productiva sólo por pasar tipos/lint/tests.
