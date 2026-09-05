# Creator Discovery — informe de entrega en 22 puntos

Fecha: **5 de septiembre de 2026**. Este informe recoge la implementación y las pruebas comunicadas por el operador, junto con la revisión local independiente. La última conectividad real de proveedores corresponde a **15:16:28 UTC**; las validaciones locales posteriores no actualizan esa fecha de evidencia productiva.

## Resultado y alcance

Se ha implementado el nuevo motor de creadores y comprobado su persistencia en una base aislada. **No se ha desplegado ni activado el nuevo circuito en producción.** La web conserva la versión `6b967d5a`; las migraciones 0149 y 0150 se aplicaron exclusivamente a fixtures. El discovery legado continúa con su horario anterior, sin sustituirlo ni duplicarlo.

Por tanto, el objetivo solicitado de discovery nuevo diario y digest real activo **todavía no está cumplido**. Este documento entrega trabajo verificable, no una declaración de finalización operativa. No se cambiaron finanzas, bancos, facturas, precios, diseño visual ni históricos; tampoco se contactó a creadores o marcas.

### Evidencia de QA al cierre

| Comprobación | Resultado | Qué demuestra y qué no |
|---|---|---|
| Batería Creator Discovery | **42 suites / 644 tests PASS** | Contratos y regresiones locales; no equivale a 644 pruebas productivas. |
| Guard de automatizaciones | **176 tests PASS** | Validaciones, idempotencia y errores con fixtures; no envío real nuevo. |
| Regresión de autenticación | **15 tests PASS** | Alcance de esa batería, no todos los roles/recorridos del CRM. |
| TypeScript en audit y carpeta de release | **PASS**, con tipos de Next generados | Coherencia de tipos; no sustituye compilación completa. |
| PostgreSQL 17 aislado | **8 checks PASS** | CAS/leases, identidad, observaciones, presupuestos concurrentes y outbox/ACK sintéticos. |
| Recorrido local con autenticación real | **PASS**: alta sintética, login por navegador y creación de perfil pausado | Aplicación y base de QA; no cuenta, sesión o perfil productivos. |
| Recorridos adicionales en navegador/fixture | **PASS**: activación bloqueada sin conexión/permisos, filtros/atrás y feedback persistido | Un target ficticio pasó a Descartado con motivo/nota; cero envíos. No es QA completa de todas las acciones. |
| Compilación completa Windows aislada | **PASS**, salida 0; TypeScript y 218/218 páginas procesadas | Sólo configuración sintética y PostgreSQL fixture con preflight read-only. No imagen Linux ni contenido productivo. |
| Servidor compilado standalone local | **PASS**: sesión oficial y Leads CC cargan; 8 comprobaciones HTTP/PG pasan | 401 sin token/incorrecto, 400 entradas inválidas, digest vacío 200 y cron con perfiles pausados 200/0 ejecutados; contadores de creadores intactos. Sin proveedor/Discord real. |
| Definición n8n de Creator Digest | **18 tests específicos PASS** | Sólo plantilla inactiva y contrato; no importada ni activada. |
| Build completo Linux/producción | **NO COMPLETADO** | No se declara release publicable ni despliegue validado. |
| Proveedores reales | YouTube/Twitch: HTTP 200, un elemento cada uno, **cero guardado** | Conectividad limitada; no discovery nuevo de extremo a extremo. |

Estas baterías tienen alcances distintos y pueden solaparse: no sumarlas como una única cobertura E2E. Las cifras finales fueron comunicadas por el operador; la redacción de este informe no volvió a ejecutar pruebas ni consultas externas.

## 1. Inventario de bots existentes

Se reutilizó el [inventario con las ocho columnas solicitadas](inventory-and-status.md#fase-0--evidencia-productiva-reutilizada): sistema, función, estado, última operación útil, dependencias, coste, problema y decisión. Incluye Leads CC, discovery y proveedores, skills/Firecrawl, importación, perfiles, identidad, enriquecimiento, scoring, feedback, cron, ledger/registry, worker IA, n8n/guard/Discord, GSC y procesos paralelos.

El último discovery legado observado terminó parcialmente; sus resultados comerciales se conservan en la evidencia privada. Son resultados de reglas anteriores, **no del motor nuevo**. El worker IA principal y sus siete horarios permanecían contenidos según el inventario; no se reactivaron para esta tarea. La [restauración interna anterior](../stabilization-2026-09-05/internal-automation-restoration.md) es evidencia de otras familias, no del nuevo digest de creadores.

## 2. Bots y componentes reparados

- Leads CC: fuente única de filtros de plataforma en URL, multiselección y navegación atrás; se corrigió que la pestaña de una red mantuviera filas de otra. Las acciones masivas sólo alcanzan filas visibles según plataforma, estado y búsqueda.
- Discovery: paginación acotada, errores parciales, cuotas internas, permisos, fechas y métricas ausentes. Un error no crea un cero medido ni borra el último dato válido.
- Ejecución: perfil persistente con control de versión/lease; marcar o guardar un perfil no dispara accidentalmente una búsqueda.
- Reporting: etapas verificadas por observaciones del run, recuperación acotada del informe sin repetir APIs y separación entre aviso pendiente y entrega confirmada.

Importación, exportación, notas y contacto conservan sus límites existentes; no se certifica una prueba real nueva de cada botón ni se envió contacto externo. No hubo rediseño.

En navegador con fixture, YouTube mostró cero filas y Twitch una; volver atrás restauró Twitch y la audiencia desconocida se mostró como `—`. El cambio de un target ficticio de Pendiente a Descartado, motivo `other` y nota de QA, devolvió respuesta 200 y confirmó una decisión registrada/cero envíos; recarga y pestaña Descartado verificaron persistencia. La pestaña de estado se reinicia a Pendiente al recargar, comportamiento legado todavía presente; el filtro de plataforma sí permanece en URL.

## 3. Bots eliminados o sustituidos

**No se eliminó ningún bot, target ni histórico.** La consulta privada de fichas Kick se sustituyó en código por endpoints oficiales. Firecrawl y las guías de scraping se conservaron como referencias: no son el fallback automático del nuevo camino diario cuando faltan credenciales, permisos o cuota. No se creó un segundo discovery paralelo.

## 4. Componentes nuevos

Se añadieron al CRM perfiles de búsqueda, identidades/cuentas, observaciones por ejecución, feedback estructurado, permisos declarados por proveedor, reservas diarias de intentos, registro de automatizaciones y outbox del digest. Se extendió el guard existente con la familia `creators`.

No se añadió un daemon IA independiente ni un agente que contacte, negocie o cambie criterios comerciales por su cuenta. Los cálculos y el enriquecimiento implementados son deterministas.

## 5. Arquitectura integrada

```text
Disparo existente / Ejecutar ahora
  → perfil debido + autorización + lease + presupuesto
  → API oficial → normalización → identidad y deduplicación
  → observaciones con fuente/fecha → sugerencias públicas → score explicable
  → CRM + ejecución terminal → registro de etapas → outbox persistente
  → guard existente → recibo Discord → ACK CRM
```

Los perfiles bloqueados o sin permisos no se convierten en búsquedas exitosas. Un fallo de reporting después de guardar la ejecución se comunica como informe pendiente; la recuperación puede reconstruirlo desde el resultado guardado, sin consultar de nuevo al proveedor. No se promete recuperación universal ante cualquier caída ni entrega exactamente una vez bajo todos los fallos externos.

## 6. APIs utilizadas

YouTube Data API y Twitch Helix/OAuth reutilizan las integraciones existentes. Kick incorpora interfaces oficiales de categorías, directos, canales y usuarios. Instagram incorpora Business Discovery para un username profesional conocido, no un buscador general por palabras.

Los endpoints, permisos y fuentes primarias de Kick/Meta están en [plataformas y límites oficiales](platforms.md). No hay scraping de respaldo ni elusión de captcha, permisos o rate limits. Los adaptadores de Kick/Instagram no acreditan conexión real ni autorización técnica concedida por el proveedor.

## 7. Credenciales y configuración

Se reutilizaron las credenciales existentes de YouTube/Twitch para pruebas de lectura limitadas. **No se acredita creación de credenciales nuevas en esta entrega.** Kick y Meta/Instagram no estaban configurados en el runtime inspeccionado.

Se prepararon contratos de configuración para la cuenta profesional/versión API de Meta, destino interno fijo del digest y fecha de inicio del circuito. No se publican claves, tokens, sesiones, IDs de cuenta ni destinos privados.

El usuario ha comunicado que dispone de las autorizaciones de los proveedores y aportará su documentación la semana próxima. Se registra como **autorización comunicada**, sin pedirla otra vez; el soporte escrito todavía no está recibido, archivado o revisado. No se afirma un plazo de retención o permiso comercial documentalmente verificado ni se aceptaron acuerdos nuevos.

## 8. Search Profiles creados

Existe la plantilla local **CS2 WORLDWIDE**: cuatro plataformas, mercado mundial, idiomas configurables, ventana de 90 días, mínimo 3 vídeos recientes y mediana objetivo de 1.000 vistas. Incluye 36 candidatos máximos por plataforma y ocho páginas de búsqueda diarias de perfil como valores iniciales internos. Hora: 08:30, zona `Europe/Madrid`; empieza pausada.

La UI permite crear, editar, pausar, activar, ejecutar y consultar horarios/resultados con sus gates. Se creó un perfil sintético pausado mediante navegador en QA. **No se ha creado ni activado una fila equivalente en producción.** CS2 España/LATAM, VALORANT y otros son configuraciones posibles, no perfiles productivos ya creados.

Intentar activar la fixture sin credenciales mostró el error de conexión/permiso de uso pendiente y conservó el perfil pausado en la base. Prueba negativa real local; no acredita permisos efectivos ni activación productiva.

## 9. Resultado YouTube

Prueba real limitada a **05/09/2026 15:16:28 UTC**: búsqueda HTTP 200, un elemento, **cero persistencia**. Confirma acceso, no el recorrido nuevo completo.

La implementación local obtiene vídeos/canales, conserva IDs y procedencia, pagina con límites y trata suscriptores ocultos o métricas ausentes como desconocidos. La cualificación usa actividad y mediana; un vídeo aislado bajo no invalida por sí solo al canal. Los tests cubren cobertura incompleta, fallos, orden de vídeos y cuotas. La mediana de vistas acumuladas de vídeos recientes no equivale a vistas generadas durante esos 90 días.

## 10. Resultado Twitch

Prueba real del mismo corte: OAuth, categoría y consulta Helix respondieron HTTP 200; se observó un directo y **no se guardaron candidatos**. No demuestra acceso autorizado a seguidores ni una búsqueda nueva completa.

El motor local usa categoría y directos oficiales, conserva IDs y observaciones de audiencia instantánea. Followers sin el permiso necesario queda desconocido; no se siguen lanzando lotes tras fallos que invalidan esa lectura. Las observaciones están preparadas para comparaciones posteriores, pero no hay una serie nueva suficiente para afirmar crecimiento, consistencia o media histórica.

## 11. Resultado Kick

Adaptador oficial **implementado y probado localmente**, sin prueba real nueva por ausencia de credenciales. Usa categorías/directos V2 y fichas V1 de canal/usuario; se eliminaron dependencias privadas para ese lookup.

No se atribuyen seguidores, VODs, clips o historial no obtenidos. La audiencia oculta no se convierte en cero real. La disponibilidad de interfaces oficiales no demuestra cobertura de todos los creadores. Su activación sigue requiriendo configuración técnica y validación del alcance aplicable, sin inventar permisos, coste o retención. Véase [Kick](platforms.md#kick).

## 12. Resultado Instagram

Adaptador de Business Discovery **implementado y probado localmente** para cuenta profesional conocida. Configuración/permisos se validan explícitamente; datos ausentes siguen siendo `null` y los cursores se reconstruyen sin seguir destinos remotos arbitrarios.

No está conectado al discovery mundial automático ni hubo consulta real nueva: faltan la configuración y permisos efectivos de Meta. No se implementó búsqueda general por keywords/hashtags, scraping ni extracción de emails privados. Instagram no tiene paridad funcional con YouTube/Twitch en este alcance. Véase [Instagram](platforms.md#instagram).

## 13. Deduplicación e identidad

Se usa plataforma + ID oficial inmutable, no sólo el nombre. Se conservan primer/último encuentro, procedencia y observaciones; la repetición de una misma ejecución no incrementa artificialmente sus resultados. El canary PostgreSQL probó rename, replay, concurrencia, conservación de estados/notas y una observación por cuenta/run.

La conexión al roster reutiliza evidencias de alta confianza. Cross-links ambiguos se proponen para revisión y no fusionan personas automáticamente. La ausencia de duplicados exactos en el inventario legado no demuestra que cada persona tenga una sola identidad entre redes; la promoción de prospecto a roster conserva límites pendientes. No se borraron ni reabrieron descartados para llenar resultados.

## 14. Scoring

Rubric local explicable y versionado: contenido 25, audiencia 20, actividad 15, crecimiento 15, mercado 10, contactabilidad 5 y encaje de marca 10. Se conservan razones y evidencia disponible; followers no es el único criterio.

Los componentes desconocidos no se presentan como medidos. No se han demostrado crecimiento, contacto verificado o rentabilidad futura por haber calculado una cifra. Los marcadores de procesamiento acreditan que el cálculo de esa versión se ejecutó; no confunden `qualified > 0` con análisis completado. No hay entrenamiento ni cambios automáticos a partir del criterio del usuario.

## 15. Enrichment

Helper puro, sin nuevas peticiones web ni IA, conectado a la biografía pública de YouTube. Extrae únicamente contexto profesional explícito, web válida, management visible y cross-links de las cuatro redes, con fuente, fecha y confianza.

Las sugerencias se guardan en `review:*`, con revisión obligatoria y sin auto-merge. No sustituyen contacto/notas manuales ni puntúan CONTACTABILITY como confirmada. No se infieren país, género o emails privados. Un título de directo no se usa como bio. La ausencia de biografía se registra como tal y no hace aparecer enriquecimiento saludable.

## 16. Scheduler

**Activo: el horario legado**, sin cambios: 06:30 UTC, equivalente a 08:30 Madrid en la fecha observada; no garantiza esa misma hora local durante todo el año.

**No activo: el scheduler nuevo por perfiles.** Su código selecciona perfiles debidos, valida zona horaria y lease y limita concurrencia; queda pendiente conectar/publicar esa versión sobre un único disparador y observar una ejecución natural. No se añadió un calendario n8n paralelo, no se reactivó el worker IA y no se presenta la creación pausada en QA como programación productiva.

## 17. Discord digest

Resumen interno implementado con resultados por plataforma, incidencias, duración, candidatos destacados y límites de uso. Outbox persistente y evento estable evitan volver a encolar el mismo run. El guard valida destino fijo, identidad, corte temporal y recibo antes del ACK; una página sin novedades genera cero envíos.

Los tests cubren replays, ACK perdido, envío incierto y contenido/destino cambiado; PostgreSQL probó ACK con recibos **sintéticos**. Pendiente no equivale a enviado, y un timeout no autoriza reenviar a ciegas. **Ningún envío real ni activación nueva del digest de creadores está acreditado.** Falta TEST autorizado completo, recibo real, replay y persistencia tras reinicio. [Contrato del guard](../../infra/n8n/guard/creators.md).

Se dejó una [definición n8n inactiva](../../infra/n8n/workflows/socialpro-creator-discovery-digest.json): cada dos minutos despierta únicamente `/run/creators` con cuerpo vacío y la referencia a la credencial existente. No inicia discovery, no crea otro bot ni contiene claves. Sus 18 tests de contrato, lint y TypeScript pasan. No se importó ni activó; no confundir esta preparación con la entrega real.

## 18. Bot registry

Registro y vista local con estados `HEALTHY`, `DEGRADED`, `ERROR`, `PAUSED` y `NEVER_RUN`, fechas, duración, unidades procesadas, versión y evidencia. Los preflights no se registran como búsquedas exitosas; scoring/enrichment cuentan observaciones vigentes de la ejecución, no sólo el top mostrado.

La recuperación conserva la fecha real de finalización y no sobrescribe una observación o ACK más reciente. Un digest pendiente no acredita salud de entrega; coste y cuota desconocidos no aparecen como cero. El inventario incluye GSC/pipeline/KPI/progreso existentes, pero esta entrega **no demuestra que todos estén integrados y medidos en el nuevo registry ni en `/admin/system-health`**. Las tablas nuevas sólo existen en la fixture de esta validación.

## 19. Errores y fronteras pendientes

1. **Build completo Linux/producción:** no completado. El control de seguridad bloqueó preparar una copia persistente de credenciales productivas y después usar el archivo general de entorno productivo para compilar, porque contenía claves de servicios fuera del alcance de esta tarea. No se eludieron estos controles; se retiró el helper de ese camino. La alternativa Windows con configuración exclusivamente sintética pasó completa, con DB de sólo lectura. Tras un primer fallo de acceso a las tipografías públicas, se permitió esa descarga y el build terminó con salida 0. El servidor standalone compilado también cargó Leads CC y pasó ocho checks HTTP/PG aislados. Esto no valida una imagen Linux ni permite publicar contenido de fixture. Para el build productivo se necesita un entorno mínimo dedicado, con acceso temporal de sólo lectura a los datos públicos necesarios y sin claves de bancos u otros proveedores.
2. **Publicación:** no hubo despliegue de aplicación ni aplicación productiva de 0149/0150. Faltan build aislado completo, preflight de migración/rollback y validación del recorrido publicado.
3. **Proveedores:** Kick/Instagram sin conexión real; documentación de autorizaciones comunicadas todavía por archivar/revisar. No se presupone un nuevo consentimiento pendiente del usuario para repetir el mismo alcance ya aprobado.
4. **Operación nueva:** faltan discovery→persistencia→registry→Discord real/replay y primer horario natural. La autorización para activarlo no equivale a activación realizada.
5. **Cobertura:** no hay crecimiento histórico fiable, dedupe universal entre personas ni retención efectiva acreditada por este canary. Deben conservarse las métricas desconocidas y resultados parciales.
6. **Persistencia de navegación:** la pestaña de estado vuelve a Pendiente tras recargar; el estado del target sí persiste y la plataforma seleccionada se conserva en URL. No se presenta esa limitación legada como corregida.
7. **Avisos locales separados:** un Fast Refresh de desarrollo mostró acceso a variable de servidor desde cliente, sin traza completa. La revisión de 12 raíces cliente/22 módulos no encontró un camino runtime nuevo a env/DB; la carga limpia compilada funcionó. No se afirma causa resuelta ni consola exhaustivamente libre de avisos. No se modificó diseño por avisos de logos/fuentes.

Son fronteras concretas; no una invitación a rehacer las auditorías anteriores ni a bloquear verificaciones independientes seguras. El ámbito bancario y financiero continúa excluido.

## 20. APIs, cuotas y límites

Cada intento HTTP del motor, incluidos retries, reserva presupuesto durable global y por perfil. En PG aislado, diez reservas concurrentes con límite ocho aceptaron exactamente ocho, sin inflar contadores. La paginación es acotada, se detectan cursores repetidos y se respetan las esperas de Retry-After; una espera excesiva se difiere, no se recorta para eludir al proveedor.

Los [topes internos](../../src/lib/targets/creator-api-budget.ts) **no son la cuota contractual restante ni un límite monetario garantizado**. Tampoco contabilizan automáticamente todos los usos ajenos a este motor que compartan proyecto/credencial. El presupuesto de ejecución de 180 segundos limita nuevas lecturas, no acredita cancelación del coste remoto ni una duración total exacta de escrituras ya iniciadas.

Kick/Meta conservan las limitaciones de propósito, interfaces y conservación recogidas en [plataformas](platforms.md). No se inventa una tarifa, retención universal ni posibilidad de scraping para superar esas restricciones.

## 21. Coste mensual aproximado

**No hay una estimación mensual en euros suficientemente acreditada.** Faltan consumo mensual consolidado, planes/cuotas efectivos, posibles costes facturables y reparto de infraestructura existente. No se contrató un servicio ni se aprobó gasto de pago nuevo en esta entrega; eso no significa que toda la infraestructura o las llamadas existentes sean gratuitas.

El coste a medir será infraestructura atribuible + uso facturable de proveedores + almacenamiento/observaciones + entrega interna + mantenimiento. Enriquecimiento y score locales no invocan un modelo IA. Las reservas de intentos permiten empezar a medir demanda, pero no se convierten automáticamente en euros ni en ahorro o ingresos.

## 22. Próximas automatizaciones recomendadas

Prioridad inmediata: completar las fronteras del punto 19 y activar el discovery existente reparado, sin crear otro bot. Después, reutilizar el [inventario de procesos manuales](inventory-and-status.md#fase-15--clasificación-reutilizada-solo-lectura):

| Prioridad | Procesos | Límite |
|---|---|---|
| Automatizar ya, bajo sus gates | Observación del discovery, resúmenes internos, higiene no destructiva, checklist de entregables, ingestión de métricas/GSC y tareas de seguimiento | Evidencia, límites, destino interno e idempotencia; no atribuir éxito a un cron verde. |
| Automatizar después | Tendencias históricas, sugerencias de priorización, QA editorial y recuperación más amplia | Datos suficientes, finalidad/retención y revisión de cobertura antes de prometer crecimiento o negocio. |
| Mantener humano | Contactar creadores/marcas, representación, propuestas económicas, contratos, aceptación comercial y decisiones ambiguas | No outreach ni reajuste autónomo del criterio. |
| Fuera de esta tarea | Bancos, cobros, pagos, facturación y finanzas | No se accedió ni implementó automatización financiera; conservar separación SL/LLC y gates existentes. |

**Estado final de esta entrega:** implementación integrada y QA local/PG verificadas; acceso limitado YouTube/Twitch acreditado; producción y scheduler legado intactos. **Nuevo discovery diario, registry productivo y Discord digest aún no están activos.**

### Cierre de recursos de prueba — 17:45 UTC

Se detuvieron servidor local, túnel y únicamente el contenedor PostgreSQL etiquetado de QA; se conservaron contenedor, volúmenes y fixtures. Lectura final: app `6b967d5a` y guard healthy, n8n/scheduler en marcha y worker IA detenido, sin reinicios de esos servicios. Esto es salud de infraestructura, no una nueva prueba E2E de cada workflow. El corte de autorización/QA y la preparación de release quedaron registrados en `SOCIALPRO_CONTINUIDAD.md` del proyecto, sin secretos. No hubo publicación ni nueva activación.
