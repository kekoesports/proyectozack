# Kick e Instagram: contrato oficial y límites

Fecha de revisión: 5 de septiembre de 2026. Cambios y pruebas locales; este documento no acredita autorización comercial, credenciales configuradas, consultas reales ni despliegue.

**Estado de permisos comunicado posteriormente:** el usuario indica que dispone de las autorizaciones y que aportará el soporte escrito la semana próxima. Se conserva esa declaración como reportada; queda pendiente recibir, archivar y revisar el alcance por proveedor, sin volver a pedir la autorización operativa ya concedida. No equivale a afirmar que se han recibido/revisado documentos o aceptado contratos nuevos.

## Kick

El conector conserva categorías y directos oficiales V2: filtros por categoría e idioma, páginas limitadas, cursor repetido detectado y cobertura parcial explícita. Son observaciones de directos actuales, no un histórico de emisiones ni una búsqueda general de canales. Un `viewer_count=0` también puede significar audiencia oculta; se representa como desconocido. [Categorías](https://docs.kick.com/apis/categories), [directos](https://docs.kick.com/apis/livestreams).

La ficha exacta usa `/public/v1/channels?slug=` y `/public/v1/users?id=`; elimina la dependencia privada de la web. No expone email ni clave de emisión. Seguidores, país e historial no acreditados quedan desconocidos; categoría actual no equivale a categorías históricas. [Canales](https://docs.kick.com/apis/channels), [usuarios](https://docs.kick.com/apis/users).

El token de aplicación procede del flujo client credentials; no sustituye los permisos de uso del producto. No se verificó una tarifa ni cuota general numérica. Los 429 respetan Retry-After: esperas largas se difieren, nunca se recortan. [OAuth](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow).

Antes de persistir o explotar comercialmente los datos debe revisarse el acuerdo aplicable: §10.1 exige interfaces documentadas; Schedule 1.B contempla restricciones de servicios de marketing y ofertas comerciales fuera de Kick; Schedule 1.C limita copias/cache salvo autorización o derechos aplicables. Esto no convierte automáticamente cualquier catálogo público en prohibido, pero tampoco autoriza retención histórica u outreach. [Términos de Kick](https://dev.kick.com/terms-of-service).

## Instagram

El adaptador implementa únicamente Business Discovery de un username profesional conocido, mediante Facebook Login y una cuenta profesional conectada. Comprueba configuración y permisos declarados: instagram_basic, instagram_manage_insights y pages_read_engagement; para determinados roles vía Business Manager, ads_read o ads_management. El preflight no verifica concesión real, App Review ni aprobación del propósito. [Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery).

Las consultas permanecen anidadas bajo la cuenta conectada y reconstruyen los cursores: nunca siguen URLs de paginación remotas. Se mantienen null los contadores ausentes; cero explícito sigue siendo cero. Las vistas públicas pueden incluir actividad orgánica y pagada. No se infieren país, foto, seguidores históricos, reach ni métricas de otras cuentas autenticadas. [Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery), [campos de usuario](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user).

No hay búsqueda arbitraria por palabras ni hashtags implementada. La API de hashtags requiere acceso específico, limita hashtags únicos y no devuelve username en recent_media; no es un buscador universal de creadores. Insights corresponde a cuentas profesionales conectadas. [Hashtags](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/hashtag-search), [recent_media](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media), [Insights](https://developers.facebook.com/documentation/instagram-platform/insights).

El catálogo comercial y cualquier enriquecimiento requieren revisar finalidad, consentimiento y retención: §3 limita los usos, construcción de perfiles y conservación; los datos públicos no tienen una excepción general. No se adopta una autorización automática ni un plazo universal de conservación. [Términos de Meta](https://developers.facebook.com/terms/), [excepciones §3.e](https://developers.facebook.com/terms/3e/).

## Evidencia y gates

- Pruebas locales con respuestas ficticias: rutas oficiales, datos ausentes, identidad, límites de páginas, deduplicación, errores parciales, timeouts, cancelación y Retry-After.
- Errores sanitizados sin cuerpos remotos, tokens ni URLs; sin fallback de scraping.
- Antes de activar: validar permisos reales, propósito/retención, presupuesto y pruebas autorizadas del flujo completo. No se enviaron mensajes, no se crearon credenciales ni se aceptaron acuerdos.
- La cobertura `complete` describe las páginas de esa consulta en ese instante; no acredita todo el mercado, fiabilidad histórica ni integridad de todas las métricas.

## Integración y separación de entornos

- El enriquecimiento público está conectado al motor local: sugerencias `review:*` con fuente, fecha y confianza; revisión obligatoria y sin fusión automática. No sobrescribe contactos/notas manuales ni acredita CONTACTABILITY. Un título de directo de Kick se conserva como `streamTitle`, nunca como biografía. La ausencia de bio pública en este discovery de Kick/Twitch se registra como ausencia, no como enriquecimiento completo.
- El operador confirmó **8 checks PASS sobre PostgreSQL 17.6 desechable**, con 0149/0150 sólo en fixture y sin datos de negocio: CAS/lease, identidad/rename/replay, last-good, reserva diaria concurrente y outbox/ACK sintético. Cero intentos HTTP; fixtures preservadas. No prueba ninguna respuesta real nueva de Kick/Instagram ni entrega de Discord.
- Última conectividad real registrada: **05/09/2026 15:16:28 UTC**, pruebas limitadas de YouTube/Twitch sin persistencia. Producción sigue en la imagen `6b967d5a`; el nuevo circuito no se ha desplegado ni activado. [Estado y límites completos](inventory-and-status.md).
