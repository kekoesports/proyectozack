---
read_when: Evaluating Studio dependencies, rendering architecture, cost control or the next product milestone.
---

# SocialPro Studio: decisión de producto y stack

6 septiembre 2026. Investigación + primera implementación local. No equivale a un despliegue en app.socialpro.es.

## Dirección

La ventaja de SocialPro debe ser unir **creador, contenido, campaña y evidencia**. El editor es una parte de ese recorrido, no otro CapCut genérico. La diferenciación propuesta es que una pieza nazca de un brief real, respete identidad y permisos, se revise en la agencia y después pueda relacionarse con resultados verificables.

La propuesta de Claude acierta al separar clips de directos, piezas de marca con plantillas y edición libre. Adoptamos esa separación; no adoptamos todas sus dependencias ni consideramos comprobadas sus afirmaciones sobre licencias, cumplimiento o infraestructura instalada.

## Reparto de responsabilidades

| Studio del creador | CRM de la agencia | Trabajadores privados |
| --- | --- | --- |
| Identidad, biblioteca, guion y chat | Briefs y campañas | Render de cartelas y montaje |
| Plantillas y previsualización | Permisos y revisión de versiones | Transcripción futura |
| Calendario y descargas | Presupuestos y autorización de gasto | Consulta/generación de voz autorizada |
| Redes y métricas propias verificadas | Rendimiento de campañas y evidencias | Ingesta oficial de eventos y métricas futura |

Una misma autenticación y pertenencia a la agencia. El creador no recibe acceso al CRM completo, credenciales del proveedor o datos de otros creadores. El VPS es el destino propuesto para trabajos de CPU largos; no se ha desplegado este cambio allí.

## Lo implementado ahora

- `hyperframes@0.8.30` fijado en npm. HTML propio + funciones de animación deterministas; sin añadir GSAP ni cargar JavaScript de CDN.
- `/studio/templates`: catálogo visual de tres diseños (editorial, proceso y contacto).
- Secuencias de presentación, historia de creador y campaña. Añaden tres escenas **al final**, no reemplazan material.
- Campo opcional `motion` en el documento JSON validado del montaje. IDs inmutables `statement-v1`, `steps-v1`, `contact-v1`. Los documentos anteriores conservan el render clásico. No hay cambio de columnas ni DDL.
- Previsualización de texto real mediante HTML propio aislado: `sandbox=allow-scripts`, sin same-origin, navegación superior ni red. Fuentes OFL embebidas, textos escapados, autenticación y proyecto comprobados.
- HyperFrames renderiza cada cartela en el trabajador existente. FFmpeg conserva el montaje, audio y almacenamiento privado. No se ejecuta el render pesado dentro de una petición Next.
- Límite legible de 60 caracteres en titular y 150 de apoyo; proceso de hasta tres pasos de 48 caracteres. Mínimo 2 segundos. Sin recortar texto silenciosamente.
- Versiones del guion y montaje fijadas en cada trabajo, sin reintento de pago, aprobación o publicación implícitas.
- Demo privada creada y exportada desde la UI: tres cartelas, 15 segundos, sin narración ni música. Es una prueba de producto, no una nueva versión del vídeo de presentación aprobado.

El uso de las guías de vídeo orientó esta integración hacia plantillas reutilizables. Las guías de React/Next.js mantuvieron la lectura de datos en servidor y la interacción aislada; la revisión visual añadió límites de texto para conservar legibilidad.

## Decisiones de investigación

| Decisión | Motivo y fuente |
| --- | --- |
| HyperFrames + FFmpeg para marca | El framework admite HTML/CSS y animación controlable para exportar MP4. Nuestro worker utiliza el CLI local, no un generador remoto. [Repositorio oficial](https://github.com/heygen-com/hyperframes). |
| Reutilizar antes de generar | Usar clips y audios autorizados existentes evita pagar otra generación para cambiar una cartela. No garantiza ahorro en cómputo: hay coste de CPU, almacenamiento y operación. |
| No sustituir faster-whisper por defecto | Sí dispone de timestamps por palabra y VAD. WhisperX se evaluará si hace falta alineación adicional; no instalar ambos sin una prueba concreta. [Documentación oficial](https://github.com/SYSTRAN/faster-whisper#word-level-timestamps). |
| Radar basado en señales oficiales | EventSub permite recibir mensajes de chat, con los permisos de canal correspondientes. Propuesta: agregar intensidad de conversación durante una activación, sin almacenar mensajes completos por defecto. No equivale a medir ventas ni demuestra causalidad. [Twitch EventSub](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage). |
| Mantener almacenamiento actual por ahora | R2 puede reducir costes de salida directa, pero cobra almacenamiento/operaciones y exige preservar privacidad, descargas autenticadas y migración verificable. Comparar factura y volumen antes de cambiar. [Precios oficiales](https://developers.cloudflare.com/r2/pricing/). |
| Conservar una sola cola | Ya existen reclamación transaccional, bloqueo, snapshots y estados. No añadir Redis, pg-boss y otro orquestador para resolver lo mismo. |
| Editor libre más adelante | Primero validar frecuencia de uso y calidad de las plantillas. OpenCut no se ha instalado ni embebido. |

## Próximo incremento recomendado (no implementado en esta entrega)

1. **Content intelligence:** OAuth oficial de YouTube/Instagram/TikTok; distinguir alcance, retención, guardados y clics. Mostrar fuente y fecha, no estimar cifras como si fueran métricas reales.
2. **Brief → variantes → aprendizaje:** derivar hooks y versiones por red a partir de material autorizado; guardar la hipótesis editorial y enlazar resultados reales a la versión publicada. No llamar A/B test a comparaciones sin control.
3. **Clips de directos:** verificar primero qué ofrece FragForge y cómo se integra. Extraer por frases, respetar HUD/facecam y hacer reencuadre revisable, no un recorte vertical automático indiscriminado.
4. **Campaign proof:** entregable, enlace publicado, timestamp, evidencias permitidas, métricas y CTA rastreado. Futuros datos agregados de Twitch como señal adicional, no una métrica de conversión inventada.

Antes de escalar: prueba de carga en el VPS, presupuesto por creador, límites de trabajos y disco, backups, alertas y auditoría. Conectar observabilidad no autoriza enviar audios, rostros, prompts o tokens a logs externos.

## Fuera de esta entrega

No se han conectado APIs sociales nuevas, comprado planes, generado voz nueva, publicado contenidos, migrado a R2, instalado un editor libre ni cambiado firmas de contratos. La integración de avatar/lip-sync en el editor sigue pendiente; guardar retrato y voice ID no equivale a tener un avatar generativo listo dentro de la app.

La música y los clips conservan su necesidad de derechos. Una plantilla no garantiza cumplimiento legal, ni una etiqueta fija sustituye la revisión de campaña y mercado.
