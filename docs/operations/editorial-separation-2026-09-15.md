# Separación de Noticias, prensa y boletín — 2026-09-15

Actualización de autorización: tras el QA local, el usuario autorizó commit, push a master y, por la instrucción permanente, despliegue al VPS. También autorizó publicar la noticia de StarSeries si el criterio editorial era favorable. Las filas de estado siguientes documentan el corte de QA anterior a esa autorización, no un bloqueo vigente.

La pieza revisada está en `content/editorial/starseries-barcelona-2026.json`, con portada editorial propia. Se comprobó que no existía otro artículo sobre StarSeries. La publicación usa el script acotado `scripts/publish-starseries-20260915.ts`: exige destino `socialpro`, solo inserta el slug previsto y, ante repetición, comprueba el contenido sin sobrescribirlo. No envía newsletter. El despliegue afecta a la web y al worker Zack que carga el criterio editorial; conserva su configuración y horarios.

En la revisión pública previa al despliegue, `/sitemap.xml` devolvía una respuesta cacheada con `/news` y `/news/live`, pero sin URLs de artículos. Se configura el sitemap como dinámico para consultar los contenidos publicados en la base de ejecución y recoger publicaciones posteriores al build. La verificación de producción debe comprobar la presencia del nuevo artículo y la ausencia de documentos de prensa.

## Alcance y estado

| Área | Estado observado |
| --- | --- |
| IMPLEMENTED | Código local: inventarios separados, editor exclusivo de prensa, boletín independiente, guardas en servidor y criterio editorial persistido. |
| TESTED | Tipos, lint, compilación aislada, regresiones SQL y recorrido real de navegador contra datos sintéticos. |
| ACTIVE | No desplegado; no commit ni push en esta intervención. No se han cambiado schedules ni workers. |
| FUNCTIONING | Recorrido verificado en fixture local. No se afirma funcionamiento de la nueva separación en producción. |

La lectura de metadatos en el VPS identificó 10 borradores para prensa, todos con slug `prensa-*` y estado `draft`, incluidos los dos mostrados por el usuario. No hubo escrituras en producción, borrado de documentos, publicación de noticias ni envío de correos.

## Corrección

- Las propuestas dejan de aparecer en las listas de Noticias, selecciones públicas, calendario, slots e inventarios editoriales de los agentes.
- La edición antigua de un documento para medios redirige al editor de Prensa y difusión. Su acción solo puede guardar texto y autor, sin publicar ni quitar marcadores de destino.
- Los formularios de Noticias rechazan propuestas para medios, incluso si la solicitud intenta retirar sus etiquetas o cambiar el slug.
- El boletín se gestiona en `/admin/noticias/boletin`. Solo admite noticias ya publicadas; rechaza propuestas internas, blogs, borradores y fechas futuras antes de reservar un envío o consultar destinatarios.
- Los anuncios propios siguen en Noticias. La etiqueta temática `prensa` por sí sola no los clasifica como difusión externa.
- No hay cambios de esquema ni migraciones. Se conservan IDs, textos, etiquetas e historial.

## Evidencia de QA

`editorial-channel-isolation.test.ts` ejecuta 12 escenarios con PostgreSQL en memoria (PGlite), aislados en un proceso con soporte de módulos WASM. Prueba consultas reales, intentos de cambio de destino, preservación de borradores, repetición de guardado sin duplicados, rechazo de newsletter y denegación de permisos. Auth y email están simulados en esa suite; no demuestra entrega real.

Además, se levantó la aplicación local con una base sintética completa y se recorrió mediante navegador:

1. Acceso con credenciales de fixture mediante el login real de Better Auth, sin bypass de autenticación.
2. Noticias muestra dos registros web: actualidad CS2 y anuncio propio etiquetado `prensa`. No muestra la propuesta externa ni una columna de envío de newsletter.
3. Prensa muestra únicamente la propuesta externa. El editor presenta título, resumen, autor y cuerpo, sin campos de publicación o destino.
4. Guardar el texto sintético vuelve a Prensa y permite leer el texto persistido. La comprobación SQL conserva tres registros y mantiene la propuesta en `draft`.
5. La URL antigua `/admin/noticias/2/edit` redirige a `/admin/prensa-targets/articulos/2`.
6. El boletín lista solo las dos noticias públicas; se comprueba sin ejecutar envíos. `newsletter_sends` contiene cero filas.

La revisión visual verifica título, controles y separación en escritorio. No se realizó una matriz móvil ni un envío real a suscriptores. Lint termina sin errores y mantiene dos avisos anteriores en `TwoFactorEnrollmentDialog` y `PnLFilters`.

Resultado final de Jest: 443 suites y 6.687 tests pasan; una suite/test queda omitida. El lanzador de integración ejecuta además sus 12 escenarios internos. Jest emitió un aviso de cierre forzado de un worker, sin fallos de tests; no se ha atribuido su causa ni se presenta como una ejecución libre de avisos.

La compilación usa valores sintéticos y la base local; no lee producción ni ejecuta migraciones o IndexNow. Los detalles temporales están en `.scratch/editorial-separation-20260915/`.

Criterio y propuestas investigadas: [política editorial](../editorial/news-policy-2026-09-15.md).
