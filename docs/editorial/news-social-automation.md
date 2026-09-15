# Difusión de noticias en X e Instagram

Read when: operating, connecting, releasing or troubleshooting news → social publishing.

## Alcance autorizado el 15-09-2026

Automatizar noticias nuevas publicadas en SocialPro hacia X `@SocialProES` e historias de Instagram `@socialproes`, con el coste reducido explicado al usuario. No incluye boletines, prensa, mensajes privados, blogs, promoción pagada ni recuperar noticias históricas. El usuario confirmó que las aplicaciones de desarrollador aún deben crearse.

## Funcionamiento

- `/api/cron/news-social` usa `assertCronAuth` (credencial de servicio, sin bypass de autenticación). El scheduler existente consulta cada cinco minutos. También puede invocarse desde n8n con la misma autenticación, pero no se necesita otro servicio.
- `NEWS_SOCIAL_ENABLED=true` habilita el procesador; cada canal permanece pausado hasta verificar y activar su cuenta en `/admin/noticias/redes`.
- Solo `news`, `published`, fecha vencida, posterior al primer arranque del canal y con antigüedad máxima de 48 horas. Mismos marcadores de exclusión de prensa que el resto de la web.
- Cola duradera, una fila por noticia y canal. Las ediciones no vuelven a publicar. Se vuelve a comprobar el estado del artículo justo antes del envío. Las retiradas, eliminaciones y noticias caducadas se cancelan.
- X recibe un titular acotado y enlace con UTM. Se usa la tarjeta del enlace de la web; no se suben medios por separado ni se compran generaciones de IA.
- Instagram recibe un JPEG 1080×1920 generado localmente. Fuente Barlow + Inter, plantilla de SocialPro. Solo se sirve para noticias públicas; no se muestran borradores. No hay stickers de enlace, música o interacción prometida en la imagen.
- Instagram conserva el ID de contenedor entre comprobaciones. Los envíos se marcan `publishing` y se reserva el coste **antes** de llamar a la red. Un ACK perdido o un proceso interrumpido queda `uncertain`, sin reenvío automático.
- Reintentos limitados con espera para errores seguros; autorización caducada pausa el canal. El resultado dudoso exige comprobar la red y reconciliar el recibo; nunca cambiarlo a pendiente sin evidencia de ausencia del efecto.
- Un hash de configuración impide utilizar credenciales cambiadas sin volver a verificar la identidad.

## Coste

X: reserva conservadora de 20 centavos USD por intento de publicación, máximo 400 centavos por mes de Europe/Madrid. Incluye intentos rechazados o de resultado dudoso: puede sobreestimar el gasto real, pero no subestimarlo según la tarifa revisada. Son como máximo 20 intentos con enlace al mes. No hay consultas de analítica ni consultas al timeline. La comprobación de identidad al activar tiene su propia tarifa y no forma parte de esta reserva. Configurar también el límite de gasto en la consola de X y verificar la tarifa antes de activar. No configurar recarga automática sin necesidad.

Sin suscripciones nuevas. Plantilla e Instagram sin generación pagada; infraestructura y mantenimiento usan el VPS existente. Las tarifas externas pueden cambiar y el límite local no sustituye al límite del proveedor.

## Conectar X

1. Crear aplicación de SocialPro en la consola oficial, con caso de uso: publicar automáticamente resúmenes y enlaces de noticias propias ya aprobadas en socialpro.es; sin DMs, scraping, engagement artificial ni datos de terceros.
2. OAuth 1.0a con permisos **Read and Write**, sin Direct Messages. Las claves deben pertenecer a `@SocialProES`.
3. Configurar privadamente en el entorno del CRM `NEWS_SOCIAL_X_API_KEY`, `NEWS_SOCIAL_X_API_SECRET`, `NEWS_SOCIAL_X_ACCESS_TOKEN`, `NEWS_SOCIAL_X_ACCESS_SECRET`. Nunca pegarlas en chats, logs, git o n8n exportado.
4. Verificar la tarifa/créditos/límite en X y pulsar Verificar cuenta y activar. La primera activación guarda el instante actual, sin procesar las noticias anteriores.

## Conectar Instagram

Se implementa **Instagram API con Facebook Login**, no se mezclan tokens de Instagram Login con el host de Facebook.

1. Cuenta de Instagram Business SocialPro vinculada a su página de Facebook. Crear aplicación Meta y conectar esa página/cuenta.
2. Permisos de publicación correspondientes (`instagram_basic`, `instagram_content_publish`, `pages_read_engagement` y los necesarios para seleccionar la página). Usuarios de la propia aplicación con roles de prueba o revisión avanzada, según el acceso efectivo de Meta.
3. Configurar privadamente `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_INSTAGRAM_ACCESS_TOKEN` y `META_GRAPH_API_VERSION` con una versión vigente. El código no fija una versión antigua.
4. Verificar identidad, permisos y soporte de Stories de la cuenta. Facebook Login IGUser no expone `account_type`; no se consulta ese campo inventado. La prueba real de creación/publicación es necesaria para acreditar funcionamiento.
5. Renovar acceso cuando corresponda. Token inválido no implica que una sesión del navegador pueda reutilizarse como API.

## Despliegue y rollback

Migración `0165_news_social_delivery`: únicamente añade dos tablas y el índice único. No transforma ni publica contenido. Conservar backup, comparar journal/hash/schema reales y aplicar mediante `npm run migrate` con el rol autorizado. El recibo sobrevive al borrado de una noticia mediante FK `ON DELETE SET NULL`.

Desplegar CRM y añadir **solo** la llamada nueva al scheduler efectivo, manteniendo su destino/configuración. Para rollback: pausar ambos canales o desactivar `NEWS_SOCIAL_ENABLED`, retirar solo la llamada nueva y restaurar la imagen anterior. No eliminar tablas ni recibos. Un envío ya aceptado por el proveedor no se revierte con rollback.

## Verificación

`scripts/test-news-social.ts`: PostgreSQL desechable en memoria, migración versionada sobre snapshot anterior, sentinela conservada y respuestas HTTP simuladas. Comprueba separación editorial, duplicados, retirada, ACK perdido, pausas, cambio de credenciales, 429, presupuesto, reinicio y JPEG. No acredita publicación en cuentas reales ni concurrencia de PostgreSQL multi-proceso.

Separar siempre: **implementado**, **probado en fixture**, **desplegado/activo** y **funcionando con entrega real**. Registrar ID de noticia, canal, hora de procesamiento, ID devuelto y replay sin duplicado para la primera noticia nueva autorizada; nunca publicar un TEST público sin autorización específica.

Fuentes oficiales consultadas: [X create posts](https://docs.x.com/x-api/posts/create-post), [tarifas X](https://docs.x.com/x-api/getting-started/pricing), [colección oficial Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [campos IGUser de Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/iguser.py), [Stories y limitaciones documentadas por Postiz](https://docs.postiz.com/self-host/providers/instagram).
