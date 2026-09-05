# Restauración del circuito interno CRM ↔ n8n ↔ Discord

**Corte de evidencia: 5 de septiembre de 2026, 14:06 UTC. Edición pública saneada.** Este informe combina resultados runtime comunicados por el operador con revisión local del guard y sus contratos. La redacción y el saneamiento no ejecutaron inspecciones remotas. El original exacto y las referencias operativas se conservan en custodia privada.

## Resultado y alcance

- En el corte indicado, seis de las ocho familias intervenidas estaban activas con sus ramas sensibles retiradas y protección persistente. Refills Telegram y copia Drive permanecían desactivadas. Search Console seguía activo por separado.
- Funcionaban los disparadores programados de las familias restauradas. La entrada de borradores era por webhook; la confirmación de trato combinaba webhook y respaldo programado.
- El worker principal IA y sus horarios permanecían detenidos. Esta restauración determinista no hizo peticiones a modelos ni habilitó autonomía de agentes.
- Se acreditó una identidad E2E sintética, un borrador técnico y un mensaje Discord. Se comprobó retry controlado antes de entrega, replay de la misma identidad y persistencia tras reiniciar el guard.
- En aquella intervención no se desplegó ni reinició la aplicación CRM, ni cambió su diseño. Sí se desplegó el guard y se publicaron las versiones n8n acotadas; la aplicación y n8n conservaron sus tiempos de arranque.
- Se conservaron fallos parciales reales del proveedor de hojas y se recuperaron las unidades afectadas individualmente. No se transformaron retrospectivamente en éxitos.
- No se emitieron facturas, pagos, contratos ni mensajes a clientes o creadores. No se habilitaron bancos, recordatorios email ni WhatsApp; las exclusiones financieras vigentes se conservaron.

**No equivale a haber probado una aprobación real desde la UI ni un comando humano real de KPI.** El primer resumen diario natural siguiente al corte todavía no estaba observado. Los estados de este informe son históricos, no una consulta de salud actual.

## Qué se cambió

Se añadió un servicio determinista con journal persistente y se sustituyeron los grafos mixtos de las familias restauradas por entradas autenticadas y operaciones internas permitidas. No necesitan el worker IA. Código y límites en el [README del guard](../../infra/n8n/guard/README.md).

Fuentes versionadas: [operaciones internas y E2E](../../infra/n8n/guard/handlers.cjs), [lectores con checkpoint](../../infra/n8n/guard/pollers.cjs), [progreso](../../infra/n8n/guard/progress.cjs), [cliente y recibos](../../infra/n8n/guard/clients.cjs), [journal](../../infra/n8n/guard/store.cjs), [adaptación de workflows](../../infra/n8n/guard/workflow-patch.cjs) y [pruebas de progreso](../../infra/n8n/guard/progress.test.cjs). Estos contratos no reemplazan la evidencia runtime.

El guard no contiene credenciales de base de datos ni usa APIs de factura, banco, email o contrato. Sí utiliza las APIs del CRM y Discord; progreso lee hojas a través del CRM y actualiza su seguimiento. Sus destinos HTTP están restringidos por código: **esto no se presenta como un firewall de red**.

La operación usa una instancia, configuración privada de lectura, journal persistente, usuario no root, filesystem raíz de lectura y límites de recursos. El journal y los snapshots son custodia operativa, no archivos desechables. Deben incluirse en la política de copias cifradas antes de reconstruir el host; este informe no acredita por sí solo esa cobertura ni una restauración completa.

## Credenciales y fronteras

Se reutilizaron las credenciales existentes de entrada autenticada, API interna, bot Discord y proveedores correspondientes. **No se publican cuentas, identificadores de credencial, destinos, tokens, cabeceras, URLs de webhook ni enlaces internos.** La correspondencia entre familias, versiones y recursos se conserva exclusivamente en la evidencia privada.

El CRM originó la prueba con la configuración ya disponible en su runtime. No se usaron sesión de navegador, OTP ni bypass de 2FA. Los webhooks n8n y todas las rutas del guard, incluida salud, requieren autenticación.

## Matriz de familias intervenidas

**A** identifica una versión interna acotada que superó sus controles de activación; **B→A**, un grafo anterior que necesitaba aislamiento; **C**, una familia conservada cerrada por efectos o gates pendientes. A no acredita cada entrada de negocio futura.

| Familia | Estado y trigger en el corte | Acciones permitidas | Idempotencia y límite |
|---|---|---|---|
| Entrada interna de borrador | B→A, activa; webhook autenticado. | `POST /run/intake` → `POST /api/automation/deal-drafts`; origen interno nuevo o TEST explícitamente permitido. Notifica el borrador sin aprobar campaña. | Origen + externalId, fingerprint y resultado durable. Snowflake posterior a T0; rechaza payload contradictorio. Sin importación histórica ni API arbitraria. |
| Lector pipeline | B→A, activo; cada dos minutos. | Mensajes internos nuevos → `POST /api/automation/discord/pipeline-deals`; sólo reacciones propias a resultados acreditados. | Checkpoint y pendiente antes del efecto. Sin mensaje nuevo, sin llamada CRM ni reacción. Resultado incierto/parcial bloquea la unidad, sin avanzar cursor ni repetir POST a ciegas. |
| Comandos KPI | B→A, activos; cada minuto. | Actor autorizado y comando nuevo: `zack revisa`, `zack detalle <consulta>`, `zack ayuda`. Lee digest/detalle y responde internamente. | Allowlist de actores y partes/recibos persistidos. Los alias financieros no facturan. No se acreditó un comando humano real en esta iteración. |
| Confirmación de trato | B→A, activa; webhook y respaldo cada dos minutos. | `GET /api/automation/discord/deal-created`, lectura del borrador, notificación interna y `POST /api/automation/discord/deal-created/:draftId/ack`. Reutiliza resultado de hoja/compartición existente. | reviewedAt posterior a T0, plan y recibo antes del ACK. Omite históricos sin ACK falso. No se probó aprobación real UI → hoja/compartición. |
| Resumen diario | B→A, activo; 10:00 Europe/Madrid. | `POST /run/digest` → `GET /api/automation/deals/digest`; plan inmutable multiparte. | Identidad por fecha Madrid y parte. Fuera de horario no envía ni recupera días perdidos. Probe sólo lee/formatea; primer envío natural pendiente en el corte. |
| Progreso | B→A, activo; cada hora, con resultados parciales conservados. | `POST /api/automation/deals/sync`, lectura del digest y futuros hitos internos 70/80/100; `POST /api/automation/deals/:campaignId/alerts/ack` sólo tras recibo. | Primera baseline fresca sin aviso histórico. Rebaseline si cambia fuente/objetivo. Sólo filas sanas y recién observadas; fallidas/stale intactas y ok=false. Lote limitado no equivale a cartera completa. |
| Refills Telegram | C, desactivada. | No se rehabilitan creación de tareas ni respuestas; credenciales preservadas. | Pendientes gates de actor/chat/fecha, identidad/conflicto y propiedad de consulta. No se dispara para comprobarlo. |
| Copia de seguimiento Drive | C, desactivada. | No se rehabilita la copia externa ni se altera el flujo manual existente. | Debe asociarse copia y resultado a una identidad recuperable ante callback perdido. Sin documentos de prueba ni copias históricas. |

Las familias externas desactivadas son entradas por evento, no horarios IA. No adquirieron un tramo Discord habilitado por esta restauración.

### Versiones y Search Console

El operador contrastó las versiones activas y la correspondencia del código de progreso con la fuente revisada. Manifest, snapshots, identificadores y hashes de custodia permanecen en el registro privado; el saneamiento no alteró esos registros.

Search Console seguía programado a las 10:15 Europe/Madrid. Lee Search Analytics y entrega el snapshot a `POST /api/automation/seo/search-console`. La ejecución natural observada confirmó ingestión y ACK deduplicado. **No acredita análisis SEO nuevo por el worker detenido, cobertura de indexación ni resolución de incidencias históricas.**

## Evidencia E2E y replay

Se utilizó una única identidad sintética marcada inequívocamente TEST. No se publican sus identificadores ni el destino del mensaje.

| Frontera | Evidencia observada |
|---|---|
| Origen CRM → n8n | Petición desde el contenedor CRM con su configuración de webhook y autorización existente; no aprobación de negocio desde UI. |
| Escritura y lectura CRM | Un borrador técnico TEST/NO aprobar, sin campaña; lectura posterior comprobó la misma externalId. No trato real, factura ni contrato. |
| Fallo controlado | Respuesta 503 persistida antes de entrega; el retry completó la misma identidad. No se provocó caída del CRM o Discord. |
| Discord | Un mensaje inequívocamente TEST, con aceptación y recibo conservados en privado. |
| Vuelta y persistencia | Resultado durable con borrador y recibo; un registro lógico CRM y un mensaje. |
| Replay idéntico | Sin segundo borrador ni segundo mensaje. |
| Reinicio | Resultado y deduplicación persistieron tras reiniciar el guard. No prueba restauración de backup ni pérdida del host. |
| Auth negativa | Rechazo del webhook sin token o con token inválido, sin publicar valores de cabeceras. |

Resultado acreditado: **CRM → n8n → guard → escritura/lectura CRM → Discord → resultado durable**, con un borrador y un mensaje incluso tras retry y replay. No demuestra entrega exactamente una vez frente a cualquier fallo ni sustituye una aprobación futura desde la UI.

El probe autenticado del resumen confirmó lectura/formateo multiparte y cero envíos. No equivale al resumen diario natural; no se forzó una publicación fuera de hora para marcarlo como probado.

## Progreso: fallos parciales y recuperación

- Se observaron fallos Google 503 en unidades concretas de lotes de sincronización. Se conservaron las ejecuciones parciales como tales y se recuperó individualmente cada unidad afectada, sin repetir toda la cartera ni crear facturas.
- El guard se corrigió para que una hoja fallida no impida establecer baselines o avisos futuros de otras filas sanas recién observadas. Las filas fallidas, stale o no observadas en el lote conservan su estado anterior.
- La primera baseline no envía mensajes históricos. El resultado parcial mantiene ok=false; reproducir un job terminado sólo recompone su estado de observabilidad, nunca reprocesa sus efectos.
- La ejecución natural posterior verificó baselines de filas sanas, exclusión de histórico y diferimiento de filas no observadas. No hubo mensajes de hito ni ACK en ese arranque.
- La comprobación final del operador no mostraba errores de sincronización pendientes tras las recuperaciones individuales. **Los lotes anteriores siguieron siendo parciales; esto no acredita cobertura completa ni saneamiento de toda la cartera.**

No se publica el tamaño real de la cartera, el estado de campañas concretas, sus objetivos, resultados ni referencias. Las categorías del digest pueden solaparse; no deben sumarse para reconstruir un total. Una etiqueta diagnóstica de facturación no ejecuta facturas, y stale no habilita recordatorios.

No se promete sincronizar toda la cartera en una hora ni un SLA de dos horas. La rotación del lote, errores y cuotas externas limitan la cobertura. Recuperar una hoja no demuestra por sí solo que se haya entregado un aviso de hito.

## Qué estaba demostrado y qué seguía pendiente

| Componente | Evidencia y límite del corte |
|---|---|
| KPI y pipeline | Últimas ejecuciones técnicas correctas; sin nueva entrada no demuestran comando humano ni alta real. |
| Confirmaciones | Éxito técnico y entrega del TEST descrito; aprobación real UI pendiente. |
| Operaciones en curso | Sin ejecuciones en vuelo ni locks pendientes en el cierre observado; no afirmación sobre el estado actual. |
| Persistencia | Se conservaron el borrador y el mensaje sintéticos únicos. |
| IA | Worker y horarios detenidos; historial terminal conservado sin replay. Una prueba IA anterior es ajena a esta restauración. |
| Aplicación y n8n | Disponibles sin cambio de sus arranques por esta intervención; sin despliegue visual. |
| Entradas futuras | Resumen natural, mensaje humano pipeline, comando KPI autorizado, aprobación UI y primer hito futuro: observar cuando ocurran, no fabricarlos sobre negocio. |
| Fuera de alcance | Telegram/Drive cerrados; finanzas, bancos, emails, contratos y worker IA no se habilitan por un resultado verde interno. |

## Controles, pruebas y reversión

- Journal durable antes del efecto: escritura atómica, fsync, lectura posterior y locks por familia/entrega. Un checkpoint ausente no se reinicializa durante una petición. Los locks de crash requieren revisión, no autorreclamación indiscriminada.
- Discord añade nonce/enforce_nonce como protección auxiliar de ventana corta, no garantía permanente de exactly-once. Una entrega incierta sólo se recupera con identidad de bot, destino, nonce, contenido y recibo coincidentes; de lo contrario se retiene sin reenvío ciego.
- Los lectores no saltan páginas completas de mensajes nuevos fuera del checkpoint. Un backlog superior a la ventana exige paginación/reconciliación, no reiniciar T0. La lista limitada de confirmaciones puede necesitar cursor; nunca usar ACK falso para despejar históricos.
- Validación comunicada para aquel corte: 144 pruebas del guard y 25 pruebas Jest en siete suites, lint y TypeScript PASS. La revisión independiente repitió 23 pruebas de progreso, subconjunto de las anteriores. No son cobertura de todos los botones/proveedores ni resultados de CI del commit actual.
- Rollback: despublicar sólo las versiones internas afectadas y detener el guard cuando esté idle; conservar journal y snapshots. No republicar automáticamente grafos antiguos con facturas, email o recordatorios ni reiniciar una aplicación/DB sana para ocultar un fallo.
- No borrar locks, resetear T0, restaurar una copia dudosa ni crear otra identidad para evadir una entrega incierta. Mantener independientes las familias que continúen siendo seguras.

## Instrucciones y entrega

El [registro de cambios de instrucciones aprobados](approved-instructions-changes.md) es documental y separado de las activaciones: no crea autoridad nueva ni demuestra runtime.

**IMPLEMENTADO:** guard y grafos acotados. **PROBADO:** E2E real sintético, replay/reinicio, lecturas y fallos parciales. **ACTIVO EN EL CORTE:** familias internas restauradas y GSC, con las exclusiones indicadas. **FUNCIONAMIENTO ACREDITADO:** recorrido sintético bidireccional y unidades sincronizadas con éxito; resumen e inputs humanos futuros conservaban sus límites y el error histórico permanecía visible.
