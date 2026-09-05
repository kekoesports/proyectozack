# Creator Discovery — inventario y estado de entrega

**Corte productivo: 5 de septiembre de 2026, 15:16:28 UTC, última evidencia de conectividad YouTube/Twitch.** Actualizado después con implementación local y canary PostgreSQL 17.6 aislado comunicado por el operador. Esta actualización documental no ejecutó consultas remotas, despliegues, migraciones ni llamadas a proveedores.

## Lectura del estado

- **LOCAL / PROBADO LOCAL**: árbol de trabajo y pruebas ficticias/mocks, no publicación ni proveedor real. **PROBADO PG AISLADO**: queries y transacciones reales sobre fixtures sintéticas, no datos de negocio. **ACTIVO LEGADO**: versión productiva anterior observada. **FUNCIONA** requiere resultado útil concreto y conserva sus límites.
- **NO ACTIVO NUEVO** no significa que se haya detenido el discovery antiguo. La imagen CRM productiva sigue siendo `6b967d5a` según el último estado comunicado; 0149 y 0150 **NO ESTÁN APLICADAS en producción**. Ambas migraciones se aplicaron únicamente a la base desechable de QA, sin datos de negocio. Producción conserva el historial hasta 0148; no se ha desplegado ni activado el nuevo circuito.
- **Permisos reportados por el usuario:** comunica que dispone de las autorizaciones y que aportará el soporte escrito la semana próxima. Queda pendiente archivarlo y verificar finalidad, derivados y retención por proveedor. Se registra como comunicado, no como documento recibido/revisado ni como autorización nueva que deba pedirse de nuevo.
- Una API key, un HTTP 200 o la autorización del usuario para operar el CRM no acreditan por sí solos derechos de finalidad comercial, métricas derivadas y retención. No se han aceptado contratos ni contratado servicios en esta etapa.
- Diseño, bancos, pagos, facturas, precios, contratos, contactos externos e históricos quedan fuera de cambios. El criterio de terminación solicitado sigue abierto mientras falten activación y pruebas reales del recorrido nuevo.

## Fase 0 — evidencia productiva reutilizada

Observaciones de solo lectura comunicadas por el operador; no reconstruidas desde payloads personales:

- El discovery legado tuvo una ejecución parcial observada: YouTube y Twitch devolvieron resultados; Kick no estaba conectado. Sus referencias operativas y resultados comerciales se conservan en la evidencia privada. Son resultados de reglas anteriores, no validación retrospectiva del score nuevo.
- Se comprobó el inventario existente de leads y sus estados comerciales por plataforma; su volumen y distribución no se publican. No se detectaron duplicados **exactos** en esa comprobación, lo que no acredita una persona única entre redes.
- Supercronic efectivo: `30 6 * * *` UTC, equivalente a 08:30 Madrid en verano, no todo el año. No se encontró workflow n8n específico de Creator Discovery en el inventario operativo.
- Credenciales existentes YouTube/Twitch presentes; Kick, Meta/Instagram y Firecrawl ausentes en el runtime inspeccionado. Probe limitado: YouTube una búsqueda HTTP 200 con un elemento y cero almacenamiento; Twitch token 200, categoría 200 y una consulta de directos 200 con un elemento, cero almacenamiento (dos lecturas Helix). No se muestran valores de credenciales.
- Circuito previo: [restauración interna, corte 14:06 UTC](../stabilization-2026-09-05/internal-automation-restoration.md): siete workflows activos de nueve, incluido Search Console; dos retenidos. Worker IA principal detenido y siete horarios IA apagados. Esta evidencia no acredita Creator Discovery IA autónomo.

### Inventario — ocho columnas solicitadas

**Coste ND** = no medido/cotizado, nunca cero inferido. Las decisiones no autorizan borrar, activar o comprar.

| Sistema | Función | Estado | Última ejecución útil | Dependencias | Coste | Problema | Decisión |
|---|---|---|---|---|---|---|---|
| Leads CC: `src/features/admin/targets/components/TargetsWorkspace.tsx`, `TargetsSpreadsheet.tsx` | Filtros, estados, notas y CSV | Legado disponible; fix LOCAL | UI real: selector YouTube dejaba tabla global; el chip sí filtraba los pendientes de esa red | Página targets, RBAC, targets | ND | Dos estados de red distintos; acciones masivas podían conservar filas ocultas | **REPARAR**, URL común/multiselección sin rediseño |
| `src/lib/services/creatorTargetDiscovery.ts` | Orquestar discovery y guardar resultados | ACTIVO LEGADO parcial; nuevo integrado y PROBADO LOCAL | Ejecución del legado observada; no ejecución nueva en producción | Proveedores, perfiles, gates, presupuesto e identidad | ND | Nuevo flujo de proveedor a CRM todavía sin prueba productiva | **REPARAR**, conservar un motor |
| `src/lib/services/{youtube,youtube-discovery,youtube-content}.ts` | Vídeos recientes → canales/métricas | Conectividad real; nuevo contrato PROBADO LOCAL | Probe 15:16:28 UTC, 200, sin persistir | Data API, clave existente, finalidad permitida | ND | Cuota/paginación/ocultos; mediana de vídeos no son vistas generadas en el período | **REPARAR/reutilizar** API oficial |
| `src/lib/services/{twitch,twitch-discovery,twitch-auth}.ts` | Categorías → directos/broadcaster/foto | Conectividad real; contrato nuevo LOCAL | Probe 15:16:28 UTC, OAuth/Helix 200 | Helix y permisos específicos de seguidores | ND | Audiencia instantánea no es media histórica; followers puede no estar autorizado | **REPARAR/reutilizar**, no scraper |
| `src/lib/services/kick.ts` | Directos/categorías V2 y ficha oficial V1 | PROBADO LOCAL, NO ACTIVO NUEVO | Legado: credenciales ausentes; sin probe real nuevo | App/OAuth Kick y derechos aplicables | ND | No acreditar followers/histórico; cero live puede significar oculto | **REEMPLAZAR** dependencia privada por interfaz oficial |
| `src/lib/services/instagram.ts` | Business Discovery de username profesional conocido | PROBADO LOCAL; sin conexión al motor general | Sin prueba real nueva; entrada anterior manual | Meta App, cuenta profesional, permisos/finalidad | ND | No es búsqueda arbitraria mundial por keywords | **CREAR** adaptador acotado; documentar límite oficial |
| Skill `socialpro-creator-targets`, copias `.agents/skills/` y `.claude/skills/` | Discovery asistido/refresh por import CRM | Documentado; ejecución actual no acreditada | Desconocida | CRM auth, APIs; Firecrawl solo para modo discovery | Créditos de guía, no gasto medido | Guía ES/LATAM/Firecrawl distinta del worldwide oficial | **REPARAR** alcance documental; no lanzar segundo bot |
| Firecrawl/scraping/crawling heredado | Búsqueda web/extracción asistida | Sin credencial runtime ni job autónomo acreditado | Desconocida | Proveedor, finalidad y presupuesto | ND | No es fallback automático de APIs/permisos fallidos | **OBSOLETO para el camino diario oficial**; conservar referencia |
| `src/app/api/admin/targets/{import,active}/route.ts`, `src/lib/queries/creatorTargetsApi.ts` | Import autenticado y refresh paginado | Código existente, sin nueva prueba runtime | Desconocida | Auth import, Zod y targets | ND | Ruta paralela legacy no demuestra identidad nueva | **REPARAR/reutilizar** contrato común antes de automatizar |
| `src/app/admin/(dashboard)/targets/{actions,discovery-actions,youtube-actions}.ts` | Búsquedas/importación manual, notas/asignación | Existente; consumidores nuevos LOCAL | Sin import/contacto real en esta revisión | Sesión y permiso targets/write | ND | Marcar contactado no prueba envío; no ampliar contacto | **REPARAR** consumidores; contacto humano |
| `src/lib/{queries,services}/creatorSearchProfiles.ts` | Perfiles persistentes, programación/lease | PROBADO LOCAL y PG AISLADO; no migrado en producción | CAS y elegibilidad/lease reales en fixture; sin proveedores | 0149, Zod, gates y motor | ND | Ruta local conectada a perfiles debidos; scheduler configurable aún no activo | **CREAR dentro del motor**, no nuevo daemon |
| `src/lib/queries/creatorIdentity.ts`, `src/db/schema/creatorDiscoveryOperations.ts` | IDs, roster y primer/último encuentro | Integrado; PROBADO LOCAL y PG AISLADO | Identidad/rename/replay/snapshot real en fixture | 0149/0150, IDs oficiales, finalidad/retención | ND | No demuestra dedupe productivo entre personas; promoción prospecto→roster limitada | **CREAR** capa común, conservar estados |
| `src/lib/targets/{search-profile,creator-observations}.ts` | Fuente/observación/sync/last-good | LOCAL; orden temporal/error cubiertos | Pruebas ficticias | Contrato válido y retención autorizada | ND | Last-good no es una serie histórica ni acredita growth | **REPARAR/reutilizar** contrato de métricas |
| `creator-enrichment.ts` y motor | Campos públicos → sugerencias de contacto/management/cross-links | Integrado; PROBADO LOCAL, revisión obligatoria | Helper real con proveedores/persistencia simulados | Biografía pública con fuente/fecha y permisos aplicables | ND | Sólo `review:*`; no sustituye contactos/notas, no fusiona ni confirma CONTACTABILITY | **REPARAR**, no agente IA redundante |
| `src/lib/targets/{qualification,creator-fit-score}.ts` | Reglas/score explicable versionado | Rubric nuevo LOCAL | Pruebas ficticias | Evidencias por componente | Sin IA en cálculo; infraestructura ND | Growth/contacto/brand fit desconocidos no son comprobados | **REEMPLAZAR** cifra opaca por desglose |
| `recordCreatorFeedback`, `CreatorFeedbackForm.tsx` | Motivo estructurado + estado transaccional | PROBADO LOCAL; tabla sólo en fixture | Pruebas de lock/error/CAS; no prueba productiva | Usuario autorizado, target, 0149 | ND | No entrenamiento ni reajuste automático; encuentros no son eventos únicos | **CREAR** feedback, no autonomía comercial |
| `/api/cron/discover-creator-targets`, Supercronic y `vercel.json` | Disparo de perfiles debidos | ACTIVO LEGADO VPS; ruta nueva LOCAL | Disparo legado observado; referencia conservada en privado | Trigger único y auth cron | Infraestructura existente; ND | Código nuevo usa perfiles debidos; calendario configurable no desplegado, evitar doble scheduler | **REPARAR** trigger, no duplicarlo en n8n |
| `creatorDiscoveryRuns` / `automationRegistry` | Historial/estado observable | Historial legado; puente de reporting LOCAL | Ejecución legado parcial observada; preflight no es run útil | Queries; 0149/0150 | ND | Finalización enlaza reporting en código; falta prueba completa productiva, no verde por clave | **REPARAR** ledger y **CREAR** proyección |
| Worker IA, eventos/runs/schedules | Growth/CRM/SEO/Guardian y herramientas | Principal detenido, 7 horarios off | Growth real contenido de fase 1 | PostgreSQL/Gemini/gates | Consumo anterior limitado; no estimación nueva | Growth entrante no descubre perfiles; autonomía continua no acreditada | **FUNCIONA solo el ensayo acotado**; no duplicar/reactivar por discovery |
| n8n + `infra/n8n/guard/` + Discord | Intake, pipeline, KPI, ACK, digest operativo, progreso | 6 familias restauradas activas; GSC adicional | E2E/replay y progreso: informe 14:06 UTC | Guard durable, CRM/Discord auth | ND | Digest operativo no es Creator Discovery Digest; límites naturales documentados | **FUNCIONA en alcance probado**, reutilizar protección de entregas |
| Search Console | Ingestión diaria de Search Analytics | ACTIVO, lectura/ingestión acreditadas | 05/09 08:15:00–08:15:02.690 UTC, ACK dedupe | Google/GSC → n8n → CRM | ND | No demuestra análisis SEO ni cobertura total de indexación | **FUNCIONA para ingestión**, no duplicar |
| Crons métricas/live/News/Sheets/IP/tareas | Procesos paralelos CRM | Código/horarios inventariados, sin nueva prueba global | Evidencias previas por familia | APIs/runtime/permisos propios | ND | Snapshot roster no es discovery; cron declarado no prueba salud | **REPARAR según evidencia previa**, sin activar excluidos |

## Reparaciones verificadas y límites

Cinco suites independientes bajo `src/__tests__/server/`: `creator-profile-execution-boundary`, `creator-observation-ordering`, `creator-identity-storage-boundary`, `creator-profile-save-authority` y `creator-profile-query-boundary`.

- Antes: **39 PASS / 8 FAIL**; después: **47/47 PASS**, cinco suites, lint focal PASS. TypeScript global PASS comunicado por el operador. No sustituye build/E2E de la integración final.
- Cubren horario debido dentro del claim, CAS ante edición, lease/config inválida, observaciones antiguas y last-good, autorización completa al persistir, ID/rename/handle reciclado/roster, historial/row lock y guardar/activar sin iniciar búsquedas.
- Esa batería usa mocks/SQL generado: no prueba por sí sola serialización PostgreSQL, cancelación remota ni retención efectiva. La evidencia PG real posterior se delimita abajo.
- Filtro URL/multiselección sin rediseño; revisión independiente corrigió acciones masivas sobre filas ocultas, con **23/23** pruebas reportadas por su autor. Sin contactos/borrados reales.

### Canary real, exclusivamente en PostgreSQL desechable

El operador ejecutó [creator-discovery-db-check.ts](../../scripts/qa/creator-discovery-db-check.ts) sobre **PostgreSQL 17.6 real**, con las migraciones [0149](../../drizzle/0149_creator_discovery_operations.sql) y [0150](../../drizzle/0150_creator_discovery_delivery.sql) aplicadas sólo a la fixture. Resultado comunicado: **8 checks PASS, salida 0, `blockedHttpAttempts: 0`**. No hubo datos de negocio, peticiones a proveedores ni envío a Discord; las fixtures quedaron preservadas.

- Guardas: opt-in explícito, nombre real de base `socialpro_creator_qa*`, esquema `public`, tablas de la prueba vacías y lock dedicado. Reejecutar exige otra fixture fresca; no hay borrados ni truncados.
- CAS: dos ediciones de la misma versión compiten y sólo una se acepta. Servicio real de perfiles: pausado/futuro/lease vigente no ejecutan; lease vencido se libera y reprograma sin llamadas, con permisos ausentes. Esto no prueba dos búsquedas de proveedores simultáneas.
- Identidad: mismo ID inmutable conserva cuenta/target al renombrarse; estados y notas manuales no se alteran; repetición del mismo run no duplica snapshot ni contador. Dos persistencias concurrentes del mismo run producen una sola actualización.
- Datos ausentes: followers nuevo permanece `null`; un refresco sin followers conserva el último valor válido, y su snapshot registra la ausencia sin inventar cero.
- Presupuesto durable: diez reservas concurrentes con límite de perfil ocho producen exactamente ocho aceptadas; tanto contador global como de perfil quedan en ocho, no diez. Son topes internos de intentos, no tarifa ni cuota contractual del proveedor.
- Outbox: tres encolados del mismo evento dejan una fila. Un ACK sintético se acepta una vez; las repeticiones del mismo recibo son duplicadas y un canal/recibo distinto devuelve conflicto. **No es un recibo real de Discord.**

La integración local de enriquecimiento y deadline pasó **96/96 tests en cinco suites**, con TypeScript global y lint focal PASS; el clasificador puro de presupuestos pasó **18/18** en su suite. Baterías de alcances distintos, no sumarlas como un único E2E. Cancelación de lecturas a 180 s no acredita coste remoto cancelado ni plazo total exacto: se esperan reservas/escrituras ya iniciadas bajo sus límites DB.

### Enriquecimiento integrado, exclusivamente pendiente de revisión

El motor usa el helper puro sobre la descripción pública de YouTube con fuente y fecha observadas. Guarda correo profesional explícito, management y perfiles enlazados en `review:*`, con `requiresReview=true` y `autoMerge=false`. No escribe `target.contactEmail` ni notas manuales, no contacta ni añade puntos de CONTACTABILITY como verificado. Ambigüedades quedan desconocidas y visibles.

Kick conserva el título en `streamTitle`, no en biografía; Twitch y Kick no inventan una biografía ausente. Las observaciones `processing:scoring` y `processing:enrichment` registran la versión calculada y distinguen extracción de biografía, ausencia de entrada pública o entrada inválida. No afirman enriquecimiento completo ni revisión humana.

## Entrega solicitada — 22 puntos al corte

| # | Entregable | Estado y próxima frontera |
|---|---|---|
| 1 | Bots existentes | Inventario anterior con código, documentación y runtime diferenciados. |
| 2 | Reparados | Filtros/datos/gates/score/ejecución LOCAL; circuito n8n previo sí tiene restauración productiva documentada. |
| 3 | Eliminados/sustituidos | Ningún bot/histórico eliminado. Kick privado sustituido en código; Firecrawl no es fallback nuevo. |
| 4 | Nuevos | Piezas CRM: perfiles, identidad, feedback, registry, reservas diarias, snapshots y outbox; ninguna nueva plataforma o daemon IA. |
| 5 | Arquitectura final | Trigger único → perfiles/lease → gate → APIs → identidad/last-good → score → CRM/run → registry → digest idempotente. Integración abierta, no final activa. |
| 6 | APIs | Legado/probe: YouTube Data y Twitch Helix/OAuth. Kick oficial y Meta Business Discovery LOCAL; [límites](platforms.md). |
| 7 | Credenciales/configuración | Reutilizadas YT/TW. Autorizaciones comunicadas por usuario; soporte escrito previsto la semana próxima, aún no recibido/revisado. Sin contratación ni credenciales nuevas acreditadas. |
| 8 | Search Profiles | Plantilla local `CS2 WORLDWIDE` configurable y pausada. No afirmar fila productiva creada antes de 0149/seed explícito. |
| 9 | YouTube | Probe real limitado 200/un resultado/cero persistencia; nuevo contrato ficticio. Falta discovery→CRM real tras gate de finalidad. |
| 10 | Twitch | OAuth/categoría/directo 200, un directo, cero persistencia; no acredita followers scope ni circuito nuevo completo. |
| 11 | Kick | Tests locales, runtime sin credenciales; falta configurar/probar bajo términos aplicables. |
| 12 | Instagram | Tests locales para cuenta profesional conocida; sin credenciales; búsqueda general por keywords no implementada. |
| 13 | Dedupe | ID/rename/concurrencia/snapshot por run probados en PG real desechable; sin escritura productiva nueva. Duplicados exactos=0 legado no prueba persona única. |
| 14 | Score | Rubric local versionado 25/20/15/15/10/5/10, razones/unknown; no predictor probado de rentabilidad ni entrenamiento. |
| 15 | Enrichment | Helper puro integrado y probado: sugerencias `review:*`, fuente/fecha/confianza MEDIUM; contactos/notas manuales intactos, no auto-merge ni outreach. Sin garantía universal de contactos/histórico. |
| 16 | Scheduler | Diario legado activo 06:30 UTC; configurable por perfil NO ACTIVO. Conectar sin duplicación y validar DST/lease/cuota. |
| 17 | Discord digest | Digest operativo previo activo. Nueva familia `creators` LOCAL; outbox/ACK idempotentes probados en PG con recibos sintéticos. Sin activación ni envío real nuevo. |
| 18 | Registry | Schema/proyección y puente de reporting LOCAL; 0149/0150 sólo en fixture. Un preflight o ACK sintético no acredita salud productiva. |
| 19 | Fronteras pendientes | Build/E2E final, migración/deploy productivos, archivo/revisión del soporte de permisos reportado, credenciales Kick/IG, retención efectiva, prospecto→roster y entrega real/replay. Preservar parciales. |
| 20 | Límites/cuotas | Reserva diaria durable global+perfil implementada; carrera cap8 probada en PG. Hook local antes de cada intento/retry. Topes internos, no cuota contractual compartida ni techo monetario; deadline no cancela coste remoto. |
| 21 | Coste mensual | **No cuantificado**: faltan consumo consolidado, tarifas/planes, cuotas y asignación VPS. Estimar infraestructura atribuible + peticiones facturables + mensajería + mantenimiento; no confundir crédito con euros. |
| 22 | Recomendaciones | Fase 15 debajo; reutilizar queries/crons/guard/herramientas antes de proponer otro agente. |

## Fase 15 — clasificación reutilizada, solo lectura

Fuentes: [fase 4](../stabilization-2026-09-05/phase-4-automation-plan.md), [evidencia](../stabilization-2026-09-05/phase-3-evidence-map.md), [métricas](../stabilization-2026-09-05/phase-5-metric-data-contract.md) y [funnel](../stabilization-2026-09-05/phase-6-commercial-funnel.md). Sus estados operativos antiguos quedan sustituidos por los cortes actuales; propuestas no equivalen a capacidades activas. **AUTOMATIZAR YA** indica prioridad bajo los gates vigentes, no ejecución ni autoridad adicional. Sin nueva auditoría general ni acceso bancario.

| Área | Clasificación | Reutilización y límite |
|---|---|---|
| Marcas | AUTOMATIZAR YA preparación; MANTENER HUMANO contacto | Contact submissions/Growth: validación, dedupe, asignación y tareas; no emails/propuestas autónomos. |
| Creadores | AUTOMATIZAR YA discovery autorizado | Motor/perfiles existentes; identidad ambigua, representación y comunicación humanas. |
| Deals | AUTOMATIZAR YA control interno | Intake/pipeline/ACK protegidos; condiciones/importes se aceptan por persona. |
| Campañas | AUTOMATIZAR YA seguimiento | Guard progreso/Sheets con parcial y cobertura; sin emitir facturas. |
| Deliverables | AUTOMATIZAR YA checklist | Queries/tareas/seguimiento; aceptación contractual del entregable humana. |
| Métricas | AUTOMATIZAR YA observaciones; DESPUÉS tendencias | Servicios/snapshots/last-good; baseline/retención antes de rankings 30/60/90/120. |
| Reporting | AUTOMATIZAR YA resumen interno | Digest/ledger; informe a cliente requiere revisión y autorización de destino. |
| Follow-ups | AUTOMATIZAR YA tareas; MANTENER HUMANO envío | Cola/borradores existentes, releer estado antes del efecto; sin outreach autónomo. |
| Facturación | MANTENER HUMANO | Apoyo futuro para detectar faltantes; emitir, borrar o renumerar fuera de esta tarea. |
| Cobros | AUTOMATIZAR DESPUÉS sugerencias; MANTENER HUMANO cierre | Conciliación existente, sin acceso bancario aquí; presupuesto del trato no prueba cobro. |
| Contenido | AUTOMATIZAR DESPUÉS preparación/QA | Flujo editorial/imágenes existente; fuentes, derechos y publicación supervisados. |
| SEO | AUTOMATIZAR YA ingestión/alertas internas | GSC actual; análisis e indexación requieren evidencias separadas. |
| News | AUTOMATIZAR DESPUÉS cobertura fiable | Cron/proveedor existentes; ausencia de novedades separada de error antes de publicar. |
| CRM | AUTOMATIZAR YA higiene no destructiva | CRM Steward/queries para faltantes/antigüedad/duplicados propuestos; sin fusión o borrado automático. |
| Finanzas | MANTENER HUMANO en esta etapa | SL/LLC separadas y gates intactos; no activar bancos/pagos/gastos recurrentes aquí. |
| Operaciones | AUTOMATIZAR YA observación; DESPUÉS recuperación | Registry/read models/guard; backoff de lecturas seguras, reconciliar efectos inciertos antes de repetir. |

## Actualización y cierre pendiente

**Avance local posterior al corte:** se añadió [la familia Creator Discovery del guard existente](../../infra/n8n/guard/creators.md), sin cambiar policyHash, T0, inicializador o journal. `POST /run/creators` lee outbox autenticado con `since=T0` antes de limit20, valida destino/fecha/identidad/tamaño y confirma ACK sólo con recibo. **31/31** tests de familia; **77/77** junto a clientes y servidor, lint focal PASS. Mocks de HTTP y journal en memoria; listener de servidor únicamente loopback. Incluye replay, ACK perdido sin segundo envío, Discord incierto bloqueado y 20 históricos delante de un nuevo item. El canary PG posterior prueba outbox/ACK sintéticos; ninguno de estos resultados acredita despliegue o entrega real del nuevo digest.

Migración aislada y persistencia sintética ya acreditadas arriba. Añadir todavía build/E2E final, gates/documentos por proveedor, despliegue y primera ejecución productiva, persistencia/dedupe, registry, digest/recibo real/replay y primer horario natural. Incluir fecha/versión/límites, no secretos ni payloads. No convertir una ejecución histórica parcial en éxito tras un retry.

Regresión posterior de todo el guard: **176/176 PASS**, ESLint de `infra/n8n/guard/*.cjs` PASS. Es evidencia local adicional, no activación o entrega productiva.

Hasta entonces: **implementación local integrada, persistencia probada en PG aislado, conectividad limitada acreditada y discovery legado activo**. Producción permanece en `6b967d5a`: no se ha desplegado ni activado este circuito nuevo, no hay envío nuevo real de Discord y no se declaran completas las 16 fases. Las fronteras de un proveedor no impiden completar pruebas e integraciones autorizadas independientes.
