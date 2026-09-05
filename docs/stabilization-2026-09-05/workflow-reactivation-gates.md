# Reactivación controlada — histórico, autorización y gates técnicos

Actualización documental: 2026-09-05, tras aprobación explícita del usuario. **Este documento no registra activaciones nuevas ni convierte pruebas pendientes en PASS.** Las versiones efectivas, instantes, IDs y resultados reales se conservan en el registro privado del operador, sin publicar secretos/PII.

## Autorización vigente — implementación, no otra propuesta

El usuario autoriza diagnosticar → corregir → configurar → probar → activar individualmente el circuito **SocialPro CRM ↔ n8n ↔ Discord interno de SocialPro**, y dejar activos los workflows seguros que superen sus gates. Incluye pipeline/deals, notificaciones internas, resumen diario, KPI y el recorrido de vuelta al CRM cuando exista. No requiere una nueva aprobación por cada workflow A ni por repetir la comprobación técnica del mismo alcance.

- **A — seguro activar:** únicamente efectos internos y reversibles; auth/URLs, idempotencia, ausencia de efectos sensibles y E2E acreditados. Activar y observar; no retener A porque otra familia sea C.
- **B — activar con gates:** implementar y demostrar las barreras necesarias; cuando cumpla A, su activación ya está autorizada. Un nombre de workflow o su estado success no demuestra esta clasificación.
- **C — mantener desactivado:** efectos fuera de alcance. Separar/bloquear las ramas sensibles para recuperar la parte interna posible, sin activar la familia completa por compartir credencial.
- **Permitido:** un mensaje inequívoco `[TEST SocialPro Automation]` en un canal interno ya configurado, dentro del servidor SocialPro correcto; no clientes, influencers, canales públicos ni servidores externos. Mantener el evento de prueba claramente identificado si queda en histórico; no borrar históricos de negocio.
- **Excluido:** facturas reales, pagos/movimientos bancarios, sincronizaciones bancarias destructivas, emails/mensajes a clientes, mensajes a influencers, contratos, gastos, importes/reglas comerciales, procesamiento masivo del backlog, replay de dead-letter históricos y borrado de históricos. Los gates de email/factura/Drive/Telegram que siguen abajo son controles históricos o de diseño, no permiso nuevo para ejecutar esos efectos.
- Worker/schedules: determinar la dependencia real de cada recorrido. Activar solo lo imprescindible para este circuito, verificando PostgreSQL correcto/sin Neon desactivado, leases, consumo, cancelación, retry, dedupe, shutdown y salud funcional. No activar siete horarios indiscriminadamente ni gastar/consumir un modelo adicional por esta autorización interna.
- Las aprobaciones vigentes no eliminan los permisos de herramientas ni autorizan nuevas transferencias de datos, destinos o efectos. Un bloqueo específico no detiene el trabajo seguro independiente.

## Punto de partida declarado e histórico

La aprobación parte de la última comprobación comunicada: Search Console activo; ocho workflows pausados; vínculo n8n → CRM reparado; worker principal detenido; siete horarios apagados; sin ejecuciones no terminales en el grupo revisado. **Es una observación de partida, no una lectura runtime realizada por esta edición.** Refrescar solo precondiciones susceptibles de cambio, sin repetir toda la auditoría ni consumir históricos para comprobarlas.

Alcance histórico de la revisión: nueve workflows con autenticación compartida, plantillas/rutas versionadas y metadatos sanitizados de Telegram. La contención inicial de la tabla no revoca la autorización posterior; sus riesgos técnicos sí deben resolverse.

## Límites de la validación histórica

- La revisión original y las canaries enumeradas al final no enviaron mensajes reales de prueba, correos ni facturas: **0 envíos externos de prueba y 0 facturas de prueba en esas evidencias**. La nueva prueba Discord está autorizada, pero solo su ejecución y registro podrán acreditarla. Nada de esto niega entregas/facturas históricas.
- Las canaries de worker usan datos ficticios, PostgreSQL aislado, herramientas de lectura y modelo simulado. Su PASS no acredita entrega Discord/Telegram/email, consulta real a Google, uso del proveedor IA ni ejecución n8n completa.
- Reparar una credencial compartida habilita potencialmente varias rutas de escritura. No debe interpretarse como autorización para reactivar todos los consumidores.
- SHADOW restringe herramientas, pero puede consumir un modelo y generar coste. Un evento encolado no equivale a trabajo del agente completado.
- No se rehabilitan pagos, emisión/envío de facturas, recordatorios históricos ni WhatsApp por cumplir una sonda técnica.

## Gates técnicos comunes de reanudación

1. Conservar configuración efectiva y asociaciones. Si hace falta intervenir de nuevo en un vínculo compartido, detener solo los consumidores afectados y verificar que no quedan ejecuciones en curso; no repetir la reparación ya acreditada ni detener familias sanas por rutina.
2. Probar autenticación con una ruta que rechace un ID inválido antes de consultar datos: 401 sin autorización y 400 con autorización válida. Un 200 artificial no es el objetivo.
3. Definir un corte temporal **T0 fijo** y conservar por separado los elementos anteriores para revisión. No recalcular T0 en cada ejecución ni simular ACK para ocultar históricos.
4. Mantener cerradas las ramas fuera de alcance. Habilitar una familia interna cada vez, incluido el TEST Discord autorizado, con destinatario/actor/canal verificados, identidad estable y evidencia del flujo concreto; no exigir otra aprobación si cumple el mismo alcance.
5. Si una operación pudo ser aceptada externamente pero falta confirmación interna, clasificarla como **entrega incierta**; no repetir a ciegas.
6. Ante un efecto inesperado, detener solo el consumidor implicado y preservar evidencia. No reiniciar una aplicación o base de datos sana para obtener un estado verde en el workflow.

## Matriz técnica por familia — no es inventario runtime

La columna de contención conserva el diagnóstico inicial. “Retener/condicional” significa que falta evidencia o un control técnico, **no autorización del usuario para el circuito interno ya aprobado**. Cada versión efectiva debe clasificarse A/B/C con el efecto completo de su grafo; las familias externas permanecen C salvo aislamiento de una parte interna autorizada.

| Familia (nueve workflows) | Efecto real y razón para retener | Contención inicial | Gate de revisión |
|---|---|---|---|
| Snapshot de Search Console | Lee rendimiento Google y escribe inbox; el consumidor SEO puede usar IA. No publica ni envía correo | Primer candidato condicional: una ventana actual, sin replay de días fallidos; consumidor acotado | Google devuelve datos válidos, POST acepta identidad del snapshot, evento durable y resultado del consumidor registrados por separado. OAuth de lectura sin ampliación de scopes |
| Alta interna de borrador | Inserta borrador idempotente; no aprueba campaña. La plantilla termina en NOOP pese al nombre de un nodo Discord | Entrada nueva y autenticada, solo después de confirmar que runtime mantiene ese NOOP | Solicitud nueva y replay conservan un solo borrador; cero campaña/documento/mensaje. Clave de origen obligatoria y productor conocido |
| Lector del canal de tratos | Lee mensajes, crea borradores/eventos y añade reacciones. Sin watermark puede recoger históricos; errores HTTP pueden producir reacción de fallo y workflow success | Retener; candidato de ingestión futura con reacciones cerradas y T0 comprobado | Sin novedades → cero CRM/reacciones. Replay ya visto → sin reacción. Fallo/resultado parcial no avanza watermark ni se declara healthy; eventos y borradores se verifican por separado |
| Comandos KPI | Algunos comandos leen; otros crean borradores de factura. La plantilla no verifica actor/rol autorizado | Retener; deshabilitar comandos de factura antes del HTTP, ajustar ayuda y limitar operadores/novedades | Todos los alias financieros → cero POST de factura. Lectura autorizada nueva funciona sin históricos; aceptación parcial de respuesta no desencadena repetición indiscriminada |
| Entrada y estado de refill Telegram | Crea tarea y responde al chat. Runtime filtra bots/comandos, pero no chat/actor/fecha. La consulta de tarea no vincula propiedad al chat | Retener; allowlist, corte temporal y consulta de estado cerrada hasta controlar autorización | No autorizado/antiguo → cero CRM/respuesta. Replay idéntico y mismo ID con payload alterado se prueban aparte. Una consulta no revela título/estado de tareas ajenas |
| Confirmación de trato en Discord | Envía y después registra ACK; webhook y respaldo pueden concurrir sin claim de entrega | Retener; comprobar nuevos elementos y tratamiento de entrega incierta | Cero pendientes → cero envíos, sin inferir entrega pasada. Mensaje aceptado y ACK se acreditan por separado; pérdida de ACK no habilita repetición ciega |
| Resumen diario de tratos | Lectura CRM seguida de publicación; no ledger de unicidad diaria | Retener publicación; lectura aislada admisible. Luego solo siguiente horario futuro aprobado | Un lote actual con fecha correcta, sin recuperar días perdidos ni duplicar la publicación para probar conexión |
| Copia de documento de seguimiento | Copia externa sin identidad de petición/lookup; retries y fallback del caller pueden duplicar una copia cuya respuesta se perdió | Retener; solicitud nueva identificada, destino permitido y recuperación del resultado antes de repetir | Una solicitud lógica → un archivo referenciado. Respuesta perdida → localizar resultado o revisión, nunca copia automática adicional por desconocimiento |
| Sincronización de progreso | Sync escribe seguimiento y abre ramas independientes de avisos, borradores de factura y recordatorios email | Retener flujo completo. Variante sync-only solo con aristas sensibles cortadas y grafo probado | Total/synced/failed inspeccionados; cero llamadas a factura/reminders/send/ACK en modo contenido, incluso cuando hay alertas |

No basta con deshabilitar el nodo IF de alertas: factura y recordatorios son ramas hermanas de la sincronización. Tampoco basta con poner un nodo en disabled sin comprobar si el grafo deja pasar los items a su sucesor.

## Dedupe interna no significa entrega exactamente una vez

| Frontera | Protección constatada en fuente | Hueco que conserva | Gate mínimo antes de habilitar el efecto |
|---|---|---|---|
| Snapshot → inbox | Clave lógica derivada del origen, tipo e identidad de snapshot | Fingerprint no es coalescencia; misma fecha no garantiza refrescar un snapshot ya aceptado | Replay aislado: una identidad; inspeccionar deduplicated y estado durable, sin confundirlo con finalización SEO |
| Mensaje → borrador | Unicidad de origen + externalId | Guardado del borrador y encolado del evento del agente no son una única aceptación demostrada; el replay existente no repara necesariamente el evento faltante | Verificar ambos registros; no crear otro borrador para reparar la cola |
| Update Telegram → tarea | Lock transaccional por updateId y comparación de descripción completa | No hay unique por updateId; mismo ID con contenido alterado puede crear otra tarea | Identidad estable o rechazo de payload contradictorio; conservar autorización de chat/actor |
| Discord send → ACK | ACK posterior y, en umbrales, estado monótono | Respuesta/ACK perdido, múltiples disparadores o aceptación parcial pueden duplicar mensajes | Claim/ledger o supervisión de una identidad nueva; estado incierto recuperable y sin reintento ciego |
| Email → estado CRM | Clave de idempotencia del proveedor por campaña y baseline | Envío precede persistencia; semántica/ventana del proveedor y fallos de red no equivalen a exactly-once | Probar aceptación del proveedor, respuesta ambigua y persistencia por separado; no marcar enviado si no hay evidencia |
| Copia Drive → callback | Validación sintáctica de IDs/nombre | No requestId/lookup; aceptación sin callback puede activar retries/fallback | Resultado asociado a una identidad de solicitud; resolver existencia antes de copiar otra vez |
| Candidato → factura | Clave por trato y comprobación de factura existente | Numeración se reserva antes del insert; una carrera puede consumir número sin segunda factura | Mantener creación cerrada hasta prueba de concurrencia/numeración y exclusiones globales de talento; no usar facturas reales como test |

Las exclusiones financieras vigentes se conservan en configuración/registro privado. Una lista de tres campañas no satisface una exclusión por creador para todos sus tratos futuros. No registrar nombres ambiguos ni modificar facturas históricas para demostrar conectividad.

## Matriz de errores, callback perdido y evidencia pendiente

Esta matriz es un contrato de pruebas por ejecutar o acreditar; no una lista de casos ya PASS. Las evidencias locales existentes se delimitan en la sección siguiente.

| Caso | Inyección aislada | Resultado requerido | Interpretación que queda prohibida |
|---|---|---|---|
| Auth incorrecta o ausente | Credencial ficticia inválida contra handler/sonda sin datos | 401, sin acceso a DB ni efectos; con válida + ID inválido, 400 | “El workflow success demuestra auth” |
| Nada nuevo | Mensajes vacíos, bots, comandos ajenos o elementos anteriores a T0 | Cero llamada CRM, reacción y respuesta cuando corresponda a ingestión por mensajes | Resetear watermark al final para esconder entradas antiguas |
| Mismo evento aceptado, respuesta perdida | Cortar respuesta después de persistir y repetir identidad | Un registro lógico; resultado existing/deduplicated observable | Igualar dedupe del evento a entrega externa exactly-once |
| Mismo ID, contenido distinto | Reutilizar identidad de fixture con payload alterado | Rechazo de conflicto o política explícita, nunca duplicado silencioso | Dar por cubierto este caso con replay idéntico |
| Discord aceptó, falta ACK | Simular aceptación del proveedor y fallo posterior interno | Conservar entrega incierta y no enviar otra vez automáticamente | Marcar ACK sin envío o afirmar entrega nunca ocurrió |
| Lote Discord parcialmente aceptado | Aceptar primeros items y fallar otro | Registrar cada identidad/resultado y reintentar solo lo inequívocamente no aceptado | Repetir todo el lote porque el workflow terminó error |
| Copia aceptada, callback perdido | Crear archivo ficticio y perder respuesta | Recuperar referencia; cero segunda copia por retry o fallback | Reducir retries a uno y declararlo idempotente |
| Email aceptado, update perdido | Proveedor simulado acepta; falla persistencia posterior | Resolver resultado mediante identidad y evidencia; no duplicación ciega | Considerar el estado local pendiente una prueba de que no salió |
| Dos disparadores concurrentes | Ejecutar identidades iguales por webhook/respaldo aislados | Una reclamación del efecto o estado incierto controlado | Usar una canary de SQL claim del worker como prueba de concurrencia del bot |
| Google falla o payload incompleto | Fallo de nodo de lectura o métricas ausentes | No presentar ausencias como “cero tráfico” ni snapshot completo válido | Un item de n8n equivale a datos completos |
| Sync parcialmente fallido | Resultado con failed>0 y algunos synced | Estado parcial visible, sin ramificar a efectos durante contención | HTTP 200 u ok=true equivale a sincronización completa |

## Evidencia existente y lo que no demuestra

- [Canary funcional](evidence/worker-canary-2026-09-05.json): ingesta firmada directa, rechazo sin firma válida, repetición de identidad, worker y herramienta READ real contra datos ficticios; no proxy, UI ni proveedor externo.
- [Canary de recuperación](evidence/worker-recovery-canary-2026-09-05.json): backlog sintético clasificado, terminales conservados y un ganador entre claims SQL concurrentes. No prueba dos loops completos, crash del proceso durante un envío ni entrega Discord/Telegram.
- [Canary de salud definitiva](evidence/worker-health-canary.json): fixture con esquema Drizzle real y sonda sin escrituras. La primera fixture parcial queda explícitamente superseded; ninguna de las dos acredita resultado de negocio.
- `src/__tests__/server/search-console-automation-route.test.ts` sustituye auth/ingestión por mocks. Verifica contrato del endpoint, no Google real ni dedupe PostgreSQL específico de un snapshot. No se ejecutó de nuevo durante esta revisión documental.
- `src/__tests__/server/automation-telegram-refills.test.ts` verifica schema/formato. No demuestra autorización de chat/actor, unicidad real de updateId ni pérdida de respuesta del bot. No se ejecutó de nuevo durante esta revisión documental.
- La revisión de fuente detecta riesgos y controles, pero no convierte la matriz de fallos anterior en PASS. Las pruebas de callbacks perdidos/entregas no están acreditadas por esas canaries. La nueva autorización sí permite el TEST Discord interno y el fallo controlado seguro; sus resultados siguen necesitando evidencia. No extenderla a las fronteras externas excluidas.

## Prueba real interna obligatoria y replay

1. Crear una única identidad sintética `SOCIALPRO_N8N_E2E_TEST_<timestamp>` y verificar canal/servidor SocialPro interno, credencial adecuada, actor permitido y formato `[TEST SocialPro Automation]` antes de enviar. Nunca utilizar un trato real ni una factura como fixture.
2. Recorrer **CRM → evento → n8n → procesamiento → Discord → resultado registrado**, y **n8n → CRM** donde corresponda al workflow. Exigir una entrada lógica, un procesamiento, un resultado y un mensaje; registrar separadamente respuesta CRM, ejecución/nodos n8n, aceptación Discord y ACK/persistencia.
3. Repetir el mismo identificador: cero segundo mensaje y cero segundo efecto. Comprobar el estado durable y la entrega, no solo `deduplicated=true` en una frontera. Un fallo no autoriza otra identidad ni repetir el lote completo.
4. Probar fallo transitorio → retry → éxito en una frontera controlada solo si no afecta a producción; no provocar caídas del CRM/Discord ni interrumpir tráfico real. Una respuesta perdida después de aceptación es entrega incierta: recuperar el resultado antes de cualquier repetición.
5. Conservar una evidencia identificable de prueba, con ID, timestamps, versión/workflow, ejecución n8n, respuestas y resultado del replay. Sanitizar el resumen público. No afirmar que este procedimiento ya se ejecutó por estar escrito.

## Cierre funcional y activación individual

Registrar por cada uno de los ocho pausados finalidad, trigger, accesos CRM/Discord, endpoints y credenciales por identidad no secreta, otros efectos, dedupe/duplicación, dependencia de worker/schedules, clasificación A/B/C y gate acreditado. Aplicar cambios a B y activar si alcanza A; C conserva su motivo técnico concreto. No usar un efecto financiero hermano para dejar inutilizada una notificación interna que puede aislarse.

El cierre debe distinguir **IMPLEMENTADO / PROBADO / ACTIVO / FUNCIONANDO**, no terminar en “preparado localmente”. Informar con evidencia actual:

| Resultado solicitado | Evidencia mínima |
|---|---|
| CRM ↔ n8n: FUNCIONA / NO FUNCIONA | Ambas direcciones aplicables, respuesta y efecto registrado; indicar tramo no probado sin inventar un PASS. |
| n8n → Discord: FUNCIONA / NO FUNCIONA | Canal interno correcto, aceptación del mensaje de prueba y registro asociado. |
| Evento E2E: CORRECTO / FALLIDO; idempotencia: CORRECTA / FALLIDA | Identidad única, un efecto y replay sin segundo mensaje; evidencia pendiente no equivale a correcta. |
| Workflows seguros activos X/Y; bloqueados deliberadamente X/Y | Inventario/versiones, clasificación, razón técnica y estado observado. |
| Schedules necesarios activos X; worker estado + última operación útil | Dependencia justificada, leases/consumo/shutdown y salud funcional, no solo presencia/healthy. |
| Última ejecución real correcta; último TEST Discord | Fecha/hora/zona, workflow y correlación privada verificables. |

Documentar errores parciales y rollback probado o pendiente. Si una parte no puede completarse, resolver las independientes y señalar el bloqueo real; la autorización interna del usuario ya existe. Este cambio documental por sí mismo no activa nada ni cierra el trabajo operativo.
