# Comprobaciones reales de automatizaciones — 6 septiembre 2026

## Publicación preparada, bloqueada por herramienta — 02:23 UTC

La nueva separación de canales está implementada y probada localmente, **no
desplegada**. La copia privada en el mismo VPS y el preflight de la ventana
`routing-release-20260906T021800Z` terminaron correctamente. Se corrigieron dos
suposiciones del control de publicación (worker separado y sintaxis real de
`CRM_IMAGE`), sin cambiar producción. Las carpetas de intentos previos se conservan.

La herramienta rechazó dos veces ejecutar `apply`, primero por la restricción
histórica de migración y después por exigir aprobación específica de la pausa y
recreación. No se eludió el rechazo. Se pidió al usuario esa aprobación y se
continúa únicamente con trabajo independiente. `apply` no llegó a ejecutarse:
no se pausaron los ocho flujos ni el scheduler, ni se modificó app/env/guard/Caddy.

La lectura de las 02:19:42 UTC confirma DNS `socialpro.es` → `159.195.112.100`,
app canónica `2a12e438...` healthy con imagen `0feae271...`/revisión `fb394a1f`,
cuatro upstreams Caddy al mismo app y `/api/health/ready` 200 (DB y migraciones).
La operación pendiente es una actualización en el VPS existente, no traslado de
datos ni DNS. Worker IA separado permanece sin arrancar; no se cambia su autoridad.

Checks locales cerrados: tipos, lint y Drizzle check; 128 casos Sheets, 4 entorno,
6 ACK y 316 casos del guard/controles de reparto y reporte. Imagen candidata y
runtime PDF/OCR aislado aprobados, pero no equivalen a prueba pública. Están
preparadas, sin ejecutar: prueba nueva Creator/pipeline, cuatro guías + KPI
completo, lote real Sheets de hasta 12 y entrega Partners en su canal nuevo.

## Actualización posterior: 6 septiembre, 01:50 UTC

El cuerpo inferior conserva los pasos anteriores y sus límites en ese momento.
El ejemplo KPI simplificado de las22:59 **no sustituyó el formateador real**:
era un TEST de entrega y no representaba el parte completo. Tras las capturas del
usuario se protege el formato completo mediante regresiones de sus secciones,
nombres, barras, porcentajes y división de mensajes. La separación en cuatro
canales y sus guías se están preparando; este corte todavía no prueba su publicación.

Partners sí quedó operativo después del corte inferior: batch1TEST, mensaje
1545958478978228336, ACK00:47:04UTC y repetición antes/después de reiniciar el mismo
guard sin nuevo mensaje. El batch2 real, `cs2-radar-2026-09-05`, conservó su fecha
original de investigación y añadió SkinBaron, Skinport, CSFloat y CSGORoll; tres
revisables y uno descartado. [Entrega real](https://discord.com/channels/1522153792592806018/1533123515023360114/1545959640989179974)
a00:51:40.953UTC, ACK00:51:41.115 y lectura del mensaje exacto comprobados. El CRM
muestra los cuatro registros y ambos lotes con ACK. No se contactó a estas empresas.

Las ocho familias n8n están activas en este corte. El transporte local diario está
instalado en el VPS, pero su productor programado todavía requiere actualizar el
prompt y comprobar la ruta nueva; no se afirma una ejecución diaria desatendida.

Imagen nueva `12bde93da9c5` compilada con éxito a01:32UTC, sin modificar producción.
PDF/OCR y ausencia de dotenv verificados a01:43UTC en contenedor aislado sin red.
Incluye reducción/espaciado de lecturas Sheets, espera por cuota y conservación
del último dato válido; el lote anterior con429/403 no se convierte por ello en
éxito. La versión pública todavía era `fb394a1f` al escribir este corte.

Canales existentes elegidos, sin borrar historial ni ampliar permisos:

| Uso | Canal |
|---|---|
| Parte10h, consultas y progreso | kpis-reporting |
| Borradores y confirmaciones de trato | pipeline-deals |
| Oportunidades de creadores | roster-scouting |
| Empresas y oportunidades Partners | crm-leads |

Los cambios de destino requieren preservar recibos previos y aceptar únicamente
eventos nuevos tras la frontera registrada. No se reenvían lotes antiguos al
canal nuevo ni se genera actividad ficticia para rellenarlo.

Fecha local Europe/Madrid; las horas de evidencia siguientes están en UTC del
5 de septiembre. Este documento distingue comprobaciones reales de preparación.
No se han enviado correos a terceros, emitido facturas, contactado creadores ni
cambiado el diseño. La actualización de la versión pública se detalla abajo.

## Discord: dos ejemplos efectivamente entregados

Identidad estable: `SOCIALPRO_CHANNEL_TEST_20260905T225344Z_43591d87`.

| Canal interno verificado | Mensaje | Entrega real UTC |
|---|---|---|
| pipeline-deals | [Ejemplo de formato de trato](https://discord.com/channels/1522153792592806018/1533123521574862991/1545931339830796418) | 22:59:13.431 |
| kpis-reporting | [Ejemplo de estados KPI](https://discord.com/channels/1522153792592806018/1533123515023360114/1545931342016159855) | 22:59:13.952 |

Ambos textos empiezan por TEST, contienen datos ficticios inequívocos, no mencionan
usuarios y no crean tratos. Se comprobaron identidad del bot, servidor, canal
privado, permisos, aceptación original, contenido leído de Discord y recibo durable.
Replay de la misma identidad a las 23:00:01.563: dos recibos idénticos con
`duplicate:true`, **cero mensajes nuevos**. No se reemplazó ni reinicializó el diario.
Esto prueba formato y entrega/idempotencia, no ingesta de una orden humana ni el
recorrido discovery→CRM→Discord. Los dos canales son los destinos de las seis
familias del guard inspeccionado; no se inventaron canales SEO/Growth adicionales.

## Operación n8n y guard

Las seis familias originales se reanudaron con sus mismas versiones. A las
23:04:45: pipeline, KPI y confirmación de tratos tenían tres ejecuciones recientes
correctas después de reanudarse. Search Console terminó correctamente el disparo
programado de las 08:15 UTC. El resumen diario conserva una prueba webhook correcta
de las 13:28, pero no se atribuye una nueva ejecución natural todavía no observada.
La ingesta por webhook no tiene por qué ejecutarse sin una entrada nueva.

Salud operativa leída a las 23:05:39–41: HTTP200 autenticado, HTTP401 sin credencial,
política/configuración originales, siete scopes esperados, cero locks/tmp.
Un status de mantenimiento anterior no confirmó quietud; estas lecturas acreditan
salud actual, no reconstruyen retrospectivamente la causa de aquel resultado.

Progreso, ejecución n8n34418 de las 23:00:38: el lote terminó a las 23:01:14 con
**19 hojas sincronizadas y 5 fallidas de 24**. Resultado parcial `ok:false`, convertido
por el guard en HTTP502; no implica una caída del servicio. El reintento devolvió
el resultado persistido, sin repetir la sincronización. Cero planes de alertas,
envíos o ACK en ese lote. El lote de las 22:00 fue22/24, también parcial.

Lectura agregada de los estados persistidos de hojas a las23:10:20: cuatro errores
HTTP429 de cuota y uno HTTP403 de acceso. Sus actualizaciones están dentro de la
ventana del lote23h y coinciden con sus cinco fallos. El esquema no guarda un
executionId en esos estados: es correlación temporal, no asociación inmutable.
Las cinco tenían último éxito a las21:00. No se exportaron mensajes de error, URLs,
importes ni nombres; no se modificaron permisos ni se forzó otra sincronización.

## Estado inicial visible del CRM

Sesión legítima de administrador, comprobada por navegador:

- Partners CS2: cero leads/lotes; «El radar todavía no ha importado ningún informe».
- Leads CC:195 totales,103 pendientes,27 contactados,65 descartados;
  67YouTube,107Twitch,21Instagram y ningún Kick.
- Última búsqueda mostrada:5/9/26 08:30, parcial,94 revisados,63 compatibles,
  60incorporados y3actualizados. Son datos del motor legado, no nuevas altas de esta prueba.
- Ejemplos visibles: YouTube LITTLE GEH, Acetofu y NartOutHere; Twitch oofenheimerr,
  man327cs y swapszin. Filtrar YouTube muestra sus perfiles/imágenes correctamente.

No se borraron descartados ni se fabricaron perfiles para rellenar la pantalla.
El radar de empresas sí produjo un archivo de investigación real con cuatro
empresas el5/9 a07:04UTC, pero falta su ingesta. La tarea local carece de transporte
configurado; el workflow de entrega esperado no existe en la lista real de n8n.
El [protocolo de productor](partner-lead-radar-producer.md) y el guard de partners
están preparados y probados localmente, **no instalados ni activados**.

## Búsqueda nueva y entrega real comprobadas

Perfil **CS2 WORLDWIDE** activado desde la sesión legítima del CRM. Próxima fecha
registrada: 6/9/2026 08:30 Europe/Madrid. Tres plataformas, todos los mercados e
idiomas, ventana YouTube90d/3vídeos/mediana1000; Twitch y Kick20 espectadores
puntuales. El soporte documental de las autorizaciones declaradas sigue pendiente.

Ejecución manual real **#10**, 23:39:40–23:40:09UTC:

| Plataforma | Encontrados | Nuevos | Actualizados | Cobertura |
|---|---:|---:|---:|---|
| YouTube | 65 | 13 | 0 | Límites de páginas/presupuesto y ventana incompleta en algunos candidatos |
| Twitch | 178 | 32 | 2 | Límite de páginas/candidatos y registros repetidos detectados |
| Kick | 36 | 32 | 0 | Cobertura incompleta |

Total77nuevos y2actualizados,279encontrados,79superan reglas. No se presentan como
una búsqueda exhaustiva ni como creadores ya aprobados comercialmente. No hubo
rechazo de credenciales en este lote. Los límites internos no miden coste monetario.
El CRM muestra207activos:50YouTube,119Twitch,32Kick,6Instagram;65descartados quedan
fuera del listado general, con historial conservado. No hubo borrado de perfiles.

Verificación por navegador: YouTube Stryk3rCS (91vídeos/mediana1535), habiteaPOV
(91/14953) y Cortes do TARUH! (32/1792,5); Kick ar4nitxWD (124espectadores observados,
seguidores no disponibles); Twitch s_chilla (4390espectadores observados). Imágenes,
plataforma, enlace y notas de cobertura visibles. Vistas YouTube son acumuladas de
los vídeos recientes, no vistas obtenidas exclusivamente dentro de90d.

El [resumen real de la búsqueda](https://discord.com/channels/1522153792592806018/1533123515023360114/1545942105652985918)
se entregó23:42:00.203UTC; outbox2 `creator-run:10`, un intento, ACKCRM23:42:00.405.
Recibo del guard, bot, destino y hash del contenido leído de Discord verificados.

Antes se probó outbox1TEST→n8nmanual34468→mensaje1545940492901027983→ACK. Replay
antes y después de reinicio del mismo guard: mismo recibo, ACKduplicate,0mensajes.
Workflow5jeWW1IGqDsKMass activo, versiónf382b772; trigger natural34470SUCCESS23:38.
Sondeo de avisos cada2min. Scheduler original reanudado, mismoID; comprueba perfiles
vencidos cada5min, próxima búsqueda08:30. Ningún otro trabajo manual disparado.

## Publicación: versión nueva operativa

Master `fb394a1f` pasó cuatro jobs de CI. La imagen Linux derivada sin archivos
dotenv en standalone pasó PDF/OCR y revisión de entorno. Migraciones0149/0150
aplicadas con migrador oficial, journal198; ensayo aislado y no-op posterior PASS.
No se conserva el footprint pre-DDL en disco: esa brecha no se presenta como igualdad probada.

El candidato corregido tiene readiness200 y entorno válido. Comparación de veinte
páginas:19PASS automáticos; Eruby tiene la misma ausencia de clave antes/después,
sin cambio de contenido comparado. Revisión manual aceptó la limitación heredada;
no se cambia el resultado automático. Páginas públicas dinámicas: no había HTML
público prerenderizado que regenerar, por lo que no se afirma calentamiento ficticio.

La primera revisión bloqueó cambiar el tráfico. Tras aportar la autorización
posterior explícita de publicación y nueva evidencia real de salud del guard,
la misma herramienta aceptó la operación acotada. **La versión `fb394a1f` ya recibe
tráfico público en el mismo VPS**, con cuatro upstreams comprobados; no hubo cambio
de DNS ni traslado de base de datos. Servicio canónico8b8e… sano y sirviendo; reversión
370371… conservada sin propiedad Compose. Scheduler mismoIDd0d… reanudado tras
validar DNS desde su red privada. El alias genérico `app` de un servicio Twitch ajeno
en la red edge no se eliminó ni modificó: se validan los destinos realmente usados.
La primera búsqueda y el aviso sí están probados; la próxima ejecución diaria08:30
todavía no se ha observado. El worker IA no se activó indiscriminadamente.

Radar de empresas: guard ampliado con partners, ocho scopes, diario actual y siete
flujos previos restaurados. Nuevo flujoGNMlX0020uCcWWeD creado INACTIVO a23:49;
conexión de entorno, ingesta de informe y prueba de entrega aún en curso.

Verificación local de este conjunto:212tests PASS (208guard+4dotenv), más28tests
del comprobador privado de recibos. No sumar esas pruebas como E2E productivo.
