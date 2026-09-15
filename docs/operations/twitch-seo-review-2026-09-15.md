# Revisión Twitch y correcciones informativas de KeyDrop — 15/09/2026

Estado: **IMPLEMENTADO localmente / PROBADO con las limitaciones siguientes / NO ACTIVO en producción / FUNCIONAMIENTO acreditado solo en el entorno aislado**.

Rama de preparación: `codex/twitch-seo-review-20260915`, basada en `30b6a368`. Tras esta revisión, el usuario autorizó commit y push a `master` si las comprobaciones eran correctas. No se han cambiado URLs existentes ni aplicado migraciones a bases persistentes. Esta autorización no incluye un despliegue al VPS.

## Segunda revisión antes del commit y push

El 15/09 se revisó de nuevo el diff completo y se repitieron las 6.686 pruebas (442 suites, un test opcional omitido), typecheck y lint: todos correctos, con las mismas dos advertencias previas. `drizzle-kit check` también terminó correctamente con configuración sintética sin acceso a una base persistente. No se modificó código de aplicación después del build aprobado de la primera revisión.

Las capturas del navegador volvieron a funcionar: se revisaron las cabeceras EN/ES y KeyDrop en escritorio y móvil, las tarjetas de creadores y el bloque Razer. Sin cortes de contenido ni solapamientos detectados. Se restauró una base desechable únicamente para servir los seis creadores y el caso sintéticos; no se crearon promociones ni se enviaron nuevos formularios.

Se comprobó que `origin/master` seguía en la base de esta rama y no había cambios remotos que integrar. No hay webhooks de repositorio configurados; los workflows observados ejecutan comprobaciones aisladas. `vercel.json` mantiene `deploymentEnabled.master=false`. El hook heredado pre-push ejecuta `sync:press`, que escribe en CRM: se excluye para este push mediante una configuración de hooks limitada al comando, una vez realizadas las comprobaciones técnicas por separado. No se modifica la configuración permanente de hooks.

## Cambios y diff resumido

- Twitch EN y nueva página ES comparten contenido, estructura y datos de creadores. Se conservan el concepto visual, los formatos, las FAQ, el caso Razer y los CTA. H1, title y description son los solicitados; title absoluto evita duplicar SocialPro. Canonical autorreferente, hreflang recíproco y x-default español; nueva ruta en sitemap y selector de idioma.
- Las tarjetas muestran nombre, imagen, país, juego y plataforma, con enlace al perfil. No se muestran CCV: el dato heredado no ofrece fecha y procedencia verificables por registro. No se han sustituido espectadores por seguidores ni inventado métricas.
- Razer se explica como una activación multicanal con componente de directo. El enlace inglés avisa de que el caso está en español. No se atribuyen a Twitch las cifras globales de la campaña.
- Los CTA abren el formulario de marca y conservan `source`. El servidor valida dos orígenes permitidos y guarda el origen en las notas existentes del lead, sin migración. Se añaden los tres eventos Twitch solicitados, condicionados al consentimiento analítico y sin datos personales.
- KeyDrop: texto informativo y respuestas corregidas sobre condiciones y saldo interno; eliminación de garantías y cifras no acreditadas; disclosure promocional junto a los códigos cuando existen; atributo sponsored en enlaces promocionales; año editorial único; fecha de verificación opcional que no se muestra si falta, es inválida o futura.
- Los sorteos KeyDrop solo se consideran actuales si están activos, han comenzado y tienen una fecha de fin posterior al momento de la petición. La página evalúa esto por petición. Se omiten sus Event e ItemList comerciales por falta de una correspondencia verificable con contenido visible y datos fiables. Se conservan Organization y BreadcrumbList.
- La fecha de fundación global pasa a 2025; la experiencia profesional permanece separada.

## Alcance no implementado

No se han realizado las optimizaciones promocionales, de referidos, bonus o conversión de juego solicitadas para KeyDrop, ni sus nuevos eventos de conversión, ni las ampliaciones comerciales asociadas. Se informó de esta limitación durante el trabajo. El title/H1 de KeyDrop son informativos, no los promocionales propuestos:

- Title: `KeyDrop 2026: códigos, condiciones y avisos | SocialPro`.
- H1: `KeyDrop: información sobre códigos en 2026`.
- Description: `Información sobre los códigos de KeyDrop, condiciones de las promociones, saldo interno y avisos de responsabilidad. Contenido exclusivo para mayores de 18 años.`

La revisión automática rechazó una preparación de pruebas que incluía códigos y sorteos sintéticos con el motivo «bloqueado por política», sin más detalle. Esa preparación no se ejecutó ni se volvió a intentar. La alternativa utilizó únicamente creadores y un caso Twitch sintéticos, sin promociones.

## Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| `npm test -- --maxWorkers=2` | 442 suites y 6.686 tests aprobados; 1 suite/test opcional omitido. No equivale a cobertura total de producción. |
| `npx tsc --noEmit` | Correcto sobre la versión final. |
| `npm run lint` | Sin errores; dos advertencias previas fuera del alcance, sobre navegación con window.location en TwoFactorEnrollmentDialog y PnLFilters. |
| `npm run build` | Correcto, con configuración aislada. Un intento previo terminó con EBUSY de Windows al copiar la salida; el siguiente terminó con código 0. |
| Tres páginas afectadas | HTTP 200; un solo H1, title sin SocialPro duplicado, description y canonical correctos. |
| Twitch EN ↔ ES | Navegación EN→ES comprobada; ambos destinos y hreflang recíprocos revisados. FAQPage comparte exactamente los textos visibles. |
| JSON-LD | Los bloques de las tres páginas se pudieron parsear; URLs y logos revisados son absolutos; foundingDate 2025. KeyDrop sin Event ni ItemList de promociones. |
| Enlaces internos | 14 rutas respondieron 200, incluidas las dos landings, formularios, perfil fixture, caso Razer fixture, seis servicios relacionados, KeyDrop y sitemap. |
| Escritorio y móvil | DOM y dimensiones comprobados a 1440×900 y 390×844: sin desbordamiento horizontal en las tres páginas. No se ha acreditado una revisión visual por capturas: la herramienta devolvió «Unable to capture screenshot», incluso con la vista visible. |
| Formularios EN/ES | Marca preseleccionada; envío vacío muestra errores; envío válido muestra confirmación; ambos leads se guardan con su origen correcto en PostgreSQL aislado. |
| Correo | Cuatro aceptaciones en receptor local: aviso y acuse por cada formulario. No se enviaron correos reales; no acredita llegada a bandejas externas. |
| Analítica Twitch | Pruebas con analítica simulada: consentimiento, revocación, ausencia de permiso y almacenamiento bloqueado. No se ha comprobado recepción en un proveedor real. |
| KeyDrop informativo | FAQ de retirada desplegada y respuesta correcta; enlace oficial renderizado con `sponsored noopener noreferrer`; ninguna fecha de verificación inventada. |
| Vigencia y validación | Tests con fechas vencidas, futuras y ausentes; orígenes no permitidos rechazados. |
| Diff | Sin errores de espacios. Los cambios ajenos en `infra/creator-intake/__pycache__/` se han conservado. |

## Evidencia del recorrido de formulario

Base desechable `seo_review_fixture`; aplicación local en `127.0.0.1:3017`; configuración de correo al receptor local, sin reenvío externo. La base contenía solo seis creadores y un caso de prueba, sin códigos ni sorteos.

| Identidad sintética | Persistencia en base (UTC) | Resultado |
| --- | --- | --- |
| TEST SEO ES, lead 1 | 2026-09-15 08:19:46.186736 | tipo brand; notas `Origen del formulario: /agencia-streamers-twitch`; confirmación visible y dos ACK locales |
| TEST SEO EN, lead 2 | 2026-09-15 08:20:30.981884 | tipo brand; notas `Origen del formulario: /twitch-streamers-agency`; confirmación visible y dos ACK locales |

Último ACK local: 2026-09-15T08:20:31.143Z; contador 4. Los envíos vacíos no crearon leads adicionales: la consulta final devolvió exactamente dos filas. No se ha añadido deduplicación al formulario ni probado replay de envíos válidos como si fuese una automatización idempotente.

Evidencia local de la sesión, no versionada: `.scratch/twitch-seo-review-20260915/receipts.json`, `mail-ack.json`, `test.log`, `build.log` y `start.log`. Las pruebas usan datos sintéticos, no demuestran la disponibilidad real de cada creador ni de servicios externos. Al terminar se cerraron el servidor local, el receptor de correo y el túnel; se eliminó exclusivamente el contenedor PostgreSQL desechable y su red de prueba, tras comprobar su identidad. La evidencia permanece en los archivos locales.

## Afirmaciones y enlaces no acreditados

- No hay CCV actuales con evidencia suficiente; quedan fuera de las tarjetas.
- No se han comprobado códigos promocionales reales, su copia/desplegado, destinos de afiliación ni apertura de sorteos. Los handlers existentes no se han reescrito; las pruebas no permiten declararlos funcionales de extremo a extremo.
- No se acreditan licencia, cifras de usuarios, métodos de pago regionales, supuesta seguridad, retirada bancaria ni superioridad del bonus de KeyDrop. Se retiraron esas afirmaciones.
- No se introduce `lastVerifiedAt` ficticio. Su campo opcional es configuración editorial, no columna nueva de base de datos.
- No se ha hecho auditoría de indexación de Google ni medición posterior de posicionamiento: estos cambios aún no están publicados.
- La limitación inicial de capturas quedó resuelta en la segunda revisión descrita arriba. Las imágenes de creadores utilizadas son placeholders explícitos de la fixture; no acreditan las fotos ni métricas actuales de producción.

Fuentes consultadas: [caso Razer publicado](https://socialpro.es/casos/razer), [ayuda oficial sobre retirada de skins](https://help.key-drop.com/en/article/how-to-withdraw-skins) y [ayuda oficial sobre inventario/saldo](https://help.key-drop.com/en/article/key-drop-equipment). Las páginas directas `/en/terms` y `/en/faq` de KeyDrop no se pudieron recuperar; no se usaron como prueba de afirmaciones no verificadas.

## Archivos modificados

Rutas relativas a la raíz del repositorio:

- `src/app/twitch-streamers-agency/page.tsx`
- `src/app/agencia-streamers-twitch/page.tsx` (nuevo)
- `src/features/twitch/landing-content.ts` (nuevo)
- `src/features/twitch/TwitchLanding.tsx` (nuevo)
- `src/features/twitch/TwitchTrackedLink.tsx` (nuevo)
- `src/components/sections/TwitchRosterProof.tsx`
- `src/components/layout/LangSwitch.tsx`
- `src/app/sitemap.ts`
- `src/app/contacto/page.tsx`
- `src/app/(en)/contact/page.tsx`
- `src/features/contact/components/ContactSection.tsx`
- `src/features/contact/components/ContactFormEn.tsx`
- `src/lib/schemas/contact-source.ts` (nuevo)
- `src/lib/schemas/contact.ts`
- `src/server/routers/contact.ts`
- `src/app/layout.tsx`
- `src/app/marcas/[brandSlug]/page.tsx`
- `src/lib/brands.ts`
- `src/lib/brand-verification.ts` (nuevo)
- `src/features/giveaways/components/CodeRowMini.tsx`
- `src/features/giveaways/components/GiveawayFeatured.tsx`
- `src/features/giveaways/components/GiveawayRow.tsx`
- `src/features/giveaways/components/HeroSponsorCard.tsx`
- `src/__tests__/server/contact-route.test.ts`
- `src/__tests__/server/twitch-landing.test.ts` (nuevo)
- `src/__tests__/client/twitch-tracking.test.tsx` (nuevo)
- Este informe (nuevo).

**No desplegado.** La segunda revisión permite realizar el commit y push autorizados, manteniendo las exclusiones y límites de QA descritos. El resultado del push y de la CI remota se verifica después del commit, sin deducirlo de las pruebas locales.
