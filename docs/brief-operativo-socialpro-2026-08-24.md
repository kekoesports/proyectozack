# Brief operativo de SocialPro

**Fecha de verificación:** 24 de agosto de 2026  
**Entorno de producción:** Vercel + Neon  
**Automatizaciones:** n8n en VPS  
**Migración al VPS:** staging aislado, sin corte de producción

## 1. Estado ejecutivo

| Área | Estado | Qué significa |
|---|---|---|
| CRM y web | Operativo | Producción responde y la base de datos y las migraciones están disponibles. |
| n8n | Operativo | El servicio responde y los workflows comprobados están activos. |
| Discord `#pipeline-deals` | Operativo | Solo procesa mensajes nuevos; no reacciona ni escribe cuando no hay novedades. |
| Resumen diario de deals | Operativo | Se publica cada día a las 10:00, hora de Madrid, con formato visual. Excluye tratos antiguos al 100 %. |
| Telegram Refill | Operativo | El bot registra solicitudes de refill en el CRM y permite consultar su estado. |
| WhatsApp | Bloqueado por Meta | Falta terminar la verificación por SMS de la cuenta de Meta. |
| Gmail de leads | Operativo en modo seguro | Gmail y Drive usan `pcamacho@socialpro.es`; clasifica correos, prepara borradores y permite responder manualmente desde LEADS. |
| Google Sheets de deals | Operativo | La plantilla se copia, personaliza y vincula al creador y al trato. El roster actual tiene carpeta canónica completa: 16 de 16. |
| Contratos | Operativo en borrador | Hay 23 plantillas específicas de marca activas. Los próximos deals aprobados pueden generar PDF `draft`; el envío sigue siendo manual. |
| Agente Zack Guardian | Operativo en `shadow` | Revisa infraestructura cada día a las 08:30 sin ejecutar acciones sobre producción. |
| Otros agentes Zack | Desactivados | CRM Steward, Deal Clerk, Growth, SEO y Dev no actúan todavía. |
| SEO técnico | Mejora aplicada | Los dominios alternativos ya redirigen permanentemente a `socialpro.es`. Search Console requiere completar el acceso de Google. |
| Seguridad Vercel | Activa | Mitigaciones DDoS y cuatro reglas de observación de tráfico anómalo activas. |

## 2. Funcionamiento de los deals

### Entrada desde Discord

1. Una persona publica un trato en `#pipeline-deals`.
2. n8n consulta el canal cada 15 minutos.
3. Solo recoge mensajes posteriores al último mensaje procesado.
4. Los mensajes del bot, los mensajes vacíos, la conversación normal y los mensajes ya vistos se ignoran.
5. El CRM crea un borrador idempotente. El mismo mensaje no puede crear dos tratos.
6. Si faltan datos, el borrador conserva todos los valores válidos, explica cada error en lenguaje claro y permite corregirlo en el CRM; no se crea una campaña incompleta.
7. Una persona revisa y aprueba el borrador en el CRM.
8. Tras la aprobación se crean la campaña, los objetivos, la Google Sheet y, si corresponde, el contrato en borrador.

Reacciones del canal:

| Reacción | Significado |
|---|---|
| 👀 | Leído y guardado como borrador. |
| ⚠️ | Leído, pero faltan datos que deben completarse en el CRM. |
| ✅ | Aprobado y convertido en trato. |
| 🚫 | Rechazado. |
| ❌ | Fallo temporal; se vuelve a intentar. |

El canal tiene un mensaje explicativo fijado. También existe una guía fijada en el canal de operaciones. Se comprobaron diez ejecuciones seguidas sin mensajes nuevos: todas terminaron correctamente y ninguna llamó al CRM ni añadió reacciones.

### Resumen diario a las 10:00

El resumen visual de Discord muestra únicamente los tratos que requieren atención. Incluye estado, progreso y contexto operativo. Los tratos antiguos ya completados al 100 % se excluyen para evitar ruido. Si no hay novedades, la automatización no inventa actividad.

## 3. Google Sheets y seguimiento de contenido

Al aprobar un deal, el CRM:

- copia la plantilla canónica de SocialPro;
- sustituye creador, marca, identificador y fechas;
- crea una fila real por cada pieza acordada;
- conserva listas desplegables, colores, validaciones y fórmulas;
- amplía la hoja si el acuerdo supera el tamaño inicial;
- guarda en Drive la relación con el identificador del trato y del talento;
- vincula la hoja al CRM;
- utiliza la carpeta canónica del creador;
- comparte por email cuando el contacto está registrado.

Se completaron las cinco carpetas que faltaban. El roster visible está ahora asociado a Drive al 100 %: **16 de 16 creadores**. Los perfiles históricos que no forman parte del roster no se han mezclado con la operativa actual.

La prueba integral creó un deal temporal para HUASOPEEK y KeyDrop con 2 streams y 3 shorts. La hoja generó exactamente cinco filas, mantuvo las validaciones y calculó el total. Al añadir una evidencia válida, el progreso pasó a 20 % y el tracker de streams a 1 de 2. Después se eliminaron los datos de prueba del CRM y las hojas se enviaron a la papelera de Drive.

## 4. Telegram Refill

Bot operativo: `@SocialProRefillBot`.

Uso:

```text
/refill Marca | Creador | Importe o unidades | Nota
/status ID
```

Ejemplo:

```text
/refill KeyDrop | Huasopeek | 25 cajas | Campaña de agosto
```

El bot:

- solo responde a comandos explícitos;
- ignora los mensajes normales del grupo;
- registra una tarea `Refill` en el CRM;
- devuelve el ID y el estado;
- permite consultar el mismo registro con `/status`;
- no expone credenciales ni información interna en Telegram.

La prueba integral verificó `/start`, `/help`, creación de refill, consulta de estado e ignorado de un mensaje normal.

Para usarlo con una marca, hay que añadir el bot al grupo de Telegram correspondiente. Telegram no puede incorporarse a un grupo de WhatsApp: son plataformas distintas. La automatización equivalente de WhatsApp se terminará mediante Meta cuando llegue la validación por SMS.

## 5. Gmail y leads del CRM

La política actual evita enviar una respuesta comercial incorrecta:

- la cuenta operativa canónica de Gmail y Drive es `pcamacho@socialpro.es`;
- Search Console permanece deliberadamente separado en la cuenta `kekoesports`;
- n8n revisa el buzón de leads aproximadamente cada minuto;
- clasifica el correo y aplica etiquetas;
- crea un borrador de respuesta para revisión;
- no pulsa enviar de forma automática;
- conserva el hilo original para que una persona pueda revisar contexto y adjuntos.

En la ficha de cada lead del CRM existe además un compositor manual:

- muestra siempre remitente y destinatario antes de enviar;
- envía como `pcamacho@socialpro.es` y dirige las respuestas al mismo buzón;
- exige asunto y mensaje válidos;
- evita duplicados en reintentos de red;
- marca el lead como contactado y registra el envío en su historial únicamente después de que el proveedor acepte el email.

**Correos que sí se envían automáticamente:** la confirmación de recepción de los formularios de la web, porque es un acuse fijo y no una negociación.

**Correos que no se envían automáticamente:** propuestas de marca, negociación de presupuesto, contratos, mensajes de creadores, facturación y cualquier correo ambiguo. En esos casos se prepara un borrador o una persona responde desde LEADS.

## 6. Contratos

El CRM contiene **30 plantillas activas en total**, de las cuales **23 son específicas de marca**, una para cada marca actual. Se han basado en los contratos y acuerdos accesibles en Drive y en las plantillas sectoriales existentes:

- iGaming, casino y betting;
- CS2, skins, cajas y marketplaces;
- representación o servicios generales.

La selección sigue este orden:

1. plantilla indicada manualmente;
2. plantilla exacta de la marca;
3. plantilla sectorial inequívoca;
4. plantilla general inequívoca.

Si hay una ambigüedad, el sistema no elige un texto legal al azar. Las 23 plantillas incluyen una advertencia de revisión humana. La generación automática de borradores está activada para los próximos deals aprobados, pero:

- solo crea un PDF privado en estado `draft`;
- no añade firmantes automáticamente;
- no envía el documento;
- requiere revisar identidad legal, fiscalidad, jurisdicción, importe y entregables antes de enviarlo.

Actualmente no hay contratos generados porque no se ha utilizado un deal real aprobado para producir un documento legal de prueba.

## 7. Agentes Zack

### Guardian

- Estado: activo.
- Modo: `shadow`.
- Horario: todos los días a las 08:30, hora de Madrid.
- Función: leer health checks, ejecuciones, capacidad e incidencias y preparar un informe.
- Límite: no reinicia servicios, no cambia producción y no dispone de una shell o acceso root.

Las últimas ejecuciones diarias verificadas terminaron correctamente. El worker está ejecutándose en el VPS.

### Agentes todavía desactivados

- CRM Steward
- Deal Clerk
- Growth
- SEO
- Dev

No se considera correcto afirmar que están trabajando: existen en el catálogo y en el CRM, pero siguen deshabilitados y en modo seguro. La secuencia recomendada es activarlos uno a uno, empezando por lectura y borradores, después de validar datos y permisos.

El agente SEO no debe activarse aún porque la cuenta de Google necesita completar la pantalla de verificación de identidad para Search Console y Analytics. La pestaña está preparada para la cuenta `kekoesports`; no se ha solicitado ni almacenado ninguna contraseña.

## 8. SEO técnico

Estado comprobado en producción:

- `robots.txt` responde correctamente y permite los recursos estáticos necesarios para renderizar la web;
- `sitemap.xml` responde y contiene 163 URL canónicas;
- incluye 46 talentos, 11 entradas de blog, 32 noticias, 25 términos de glosario, 4 páginas públicas de marca y 6 casos;
- la página canónica de un talento se indexa en `/talentos/{slug}`;
- las vistas alternativas llevan `noindex, follow` y canonical hacia la principal.

Hallazgo corregido: `www.socialpro.es`, `socialpro.info`, `www.socialpro.info`, `socialpro.online` y `www.socialpro.online` servían el mismo contenido completo. Ya redirigen con HTTP 308, conservando ruta y parámetros, hacia `https://socialpro.es`. Solo esta consolidación elimina hasta 652 variantes potenciales sobre las 163 URL del sitemap, por lo que puede explicar gran parte de las 767 URL excluidas.

No se puede clasificar el resto de las 767 URL con precisión hasta completar la verificación de Google y abrir el informe concreto de Search Console. No se ha inventado una causa sin esos datos.

## 9. Seguridad

Protecciones comprobadas en la aplicación:

- política de seguridad de contenido;
- HSTS;
- bloqueo de iframes;
- protección de tipos MIME;
- política de referencias y permisos;
- rutas API marcadas como no indexables;
- limitación de frecuencia en autenticación y formularios sensibles;
- guardia de sesión en administración;
- tokens separados para automatizaciones y agentes.

Protecciones activas en Vercel:

- mitigaciones automáticas DDoS;
- observación de ráfagas POST en autenticación;
- observación de abuso en formularios públicos;
- observación de ráfagas hacia automatizaciones;
- observación de abuso en generación de imágenes OG.

Las cuatro reglas están en modo registro para obtener una línea base sin bloquear clientes legítimos. El siguiente paso de seguridad es revisar métricas y convertir únicamente los umbrales confirmados en bloqueo o desafío.

## 10. Infraestructura y migración al VPS

- Producción continúa en Vercel y Neon.
- n8n y el worker de agentes funcionan en el VPS.
- El acceso administrativo al VPS se restableció.
- El staging está aislado y no recibe tráfico de producción.
- No se ha realizado el corte DNS ni la migración definitiva, tal como se pidió.

Antes del corte deben completarse copia y verificación de blobs, restauración de base de datos en PostgreSQL del VPS, pruebas de OCR/PDF/crons y plan de rollback. No se debe retirar Vercel o Neon hasta superar esas comprobaciones.

## 11. Bloqueos externos restantes

1. **Meta/WhatsApp:** terminar la aprobación por SMS. Después se guardarán las credenciales directamente en n8n, nunca en un chat.
2. **Google Search Console/Analytics:** completar la verificación de identidad de la cuenta `kekoesports` en la pestaña preparada. Después se podrá clasificar el informe de 767 URL y activar Zack SEO primero en modo lectura/borrador.

## 12. Cambios desplegados y verificados

- Telegram Refill: [PR #352](https://github.com/kekoesports/proyectozack/pull/352)
- Sheets automáticas por deal: [PR #353](https://github.com/kekoesports/proyectozack/pull/353)
- Plantillas de contrato por marca: [PR #354](https://github.com/kekoesports/proyectozack/pull/354)

Todos los checks de compilación, tipos, lint, Docker y Vercel de estos cambios terminaron correctamente. La producción volvió a comprobarse después del despliegue.
