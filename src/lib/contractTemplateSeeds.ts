/**
 * Plantillas semilla de contratos para cada tipo de campaña.
 * Se pueden insertar desde la UI de gestión de plantillas.
 */

export const CONTRACT_TEMPLATE_SEEDS = [

  // ── GENERAL ────────────────────────────────────────────────────────
  {
    name:    'Contrato de servicios — General',
    type:    'general',
    content: `CONTRATO DE PRESTACIÓN DE SERVICIOS DE MARKETING DIGITAL

Entre las partes:

AGENCIA: {{agency_entity}}, con NIF {{agency_taxid}}, en adelante "la Agencia".

MARCA: {{brand_name}}, en adelante "el Cliente".

CREADOR: {{influencer_name}}, en adelante "el Creador".

=====================================
1. OBJETO DEL CONTRATO
=====================================

El presente contrato tiene por objeto la prestación de servicios de marketing digital y promoción de contenido para la campaña denominada "{{campaign_name}}", en el ámbito geográfico de {{geo}}.

=====================================
2. SERVICIOS Y ENTREGABLES
=====================================

El Creador se compromete a realizar los siguientes entregables:

{{deliverables}}

Periodo de campaña: del {{start_date}} al {{end_date}}.

=====================================
3. RETRIBUCIÓN
=====================================

El Cliente abonará a la Agencia la cantidad de {{total_amount}} {{currency}} (IVA no incluido) en concepto de los servicios descritos.

La Agencia abonará al Creador la cantidad acordada según acuerdo interno.

Forma de pago: transferencia bancaria dentro de los 30 días naturales desde la firma del contrato.

=====================================
4. DERECHOS DE USO
=====================================

El Cliente queda autorizado a utilizar los contenidos generados durante la campaña para sus canales propios durante 12 meses desde la fecha de publicación.

=====================================
5. CONFIDENCIALIDAD
=====================================

Ambas partes se comprometen a mantener la confidencialidad de los términos económicos del presente contrato.

=====================================
6. LEGISLACIÓN APLICABLE
=====================================

Este contrato se rige por la legislación española. Las partes se someten a los juzgados y tribunales de España para la resolución de cualquier conflicto.

=====================================
FIRMAS
=====================================

Por la Agencia:                    Por el Cliente:
{{agency_name}}                    {{brand_name}}

Nombre: ___________________        Nombre: ___________________
Fecha: {{today}}                   Fecha: {{today}}

Por el Creador:
{{influencer_name}}

Nombre: ___________________
Fecha: {{today}}`,
  },

  // ── CASINO / iGAMING ───────────────────────────────────────────────
  {
    name:    'Contrato de servicios — Casino / iGaming',
    type:    'casino',
    content: `CONTRATO DE COLABORACIÓN PUBLICITARIA — SECTOR iGAMING

Entre las partes:

AGENCIA: {{agency_entity}}, NIF {{agency_taxid}}.
OPERADOR: {{brand_name}}.
CREADOR DE CONTENIDO: {{influencer_name}}.

=====================================
AVISO LEGAL OBLIGATORIO
=====================================

Los servicios promocionales objeto de este contrato están destinados exclusivamente a audiencias mayores de 18 años. El Creador se compromete a incluir en todos los contenidos el mensaje de juego responsable requerido por la normativa aplicable y las directrices del Operador.

=====================================
1. OBJETO
=====================================

Promoción de los servicios del Operador {{brand_name}} a través de contenido digital en las plataformas acordadas, durante la campaña "{{campaign_name}}" en el mercado de {{geo}}.

=====================================
2. OBLIGACIONES DEL CREADOR
=====================================

El Creador se compromete a:

{{deliverables}}

- Incluir en TODOS los contenidos el aviso de juego responsable.
- No dirigir el contenido a menores de 18 años.
- Respetar las restricciones de comunicación comercial de juego aplicables en {{geo}}.
- No realizar comparaciones directas con competidores sin aprobación previa.

Periodo de campaña: {{start_date}} — {{end_date}}.

=====================================
3. CONTENIDO PROHIBIDO
=====================================

Queda expresamente prohibido:
- Garantizar ganancias o resultados positivos.
- Promocionar el juego como solución a problemas económicos.
- Usar lenguaje o imágenes que minimicen los riesgos del juego.

=====================================
4. RETRIBUCIÓN
=====================================

Importe total: {{total_amount}} {{currency}}.
Comisión de agencia: {{commission}} {{currency}}.

Pago a 30 días desde la entrega y aprobación de los contenidos.

=====================================
5. EXCLUSIVIDAD
=====================================

Durante la vigencia del contrato, el Creador no podrá colaborar con operadores de iGaming competidores directos en el mismo mercado geográfico sin consentimiento previo por escrito.

=====================================
FIRMAS
=====================================

{{agency_name}} / {{brand_name}} / {{influencer_name}}

Fecha: {{today}}`,
  },

  // ── CS2 CASES ─────────────────────────────────────────────────────
  {
    name:    'Contrato de servicios — CS2 Cases / Skins',
    type:    'cs2_cases',
    content: `CONTRATO DE COLABORACIÓN — CS2 CASES & SKINS

Partes:

AGENCIA: {{agency_entity}}, NIF {{agency_taxid}}.
PLATAFORMA: {{brand_name}}.
CREADOR: {{influencer_name}}.

=====================================
1. OBJETO
=====================================

Promoción de la plataforma {{brand_name}} mediante contenido de entretenimiento relacionado con CS2 (Counter-Strike 2) en la campaña "{{campaign_name}}".

Mercado: {{geo}}.
Periodo: {{start_date}} — {{end_date}}.

=====================================
2. ENTREGABLES
=====================================

{{deliverables}}

Especificaciones de contenido:
- Los vídeos/streams deben mostrar el uso real de la plataforma.
- Incluir código de referido o enlace de afiliado en descripción y chat.
- Mencionar los beneficios para nuevos usuarios.

=====================================
3. REQUISITOS LEGALES Y DE PLATAFORMA
=====================================

El Creador confirma que:
- Su audiencia es mayoritariamente mayor de 18 años.
- El contenido cumple con las normas de las plataformas (YouTube/Twitch/TikTok).
- Se indicará que el contenido es publicidad (etiqueta #AD o equivalente).

=====================================
4. RETRIBUCIÓN
=====================================

Importe acordado: {{total_amount}} {{currency}}.

Condiciones de pago: transferencia bancaria a los 15 días desde la publicación del contenido.

=====================================
5. APROBACIÓN DE CONTENIDO
=====================================

El Creador enviará a la Agencia el contenido previo a su publicación para revisión. La Agencia dispondrá de 48 horas para aprobar o solicitar modificaciones.

=====================================
FIRMAS
=====================================

Por {{agency_name}}: _______________
Por {{brand_name}}: ________________
Por {{influencer_name}}: ____________

Fecha: {{today}}`,
  },

  // ── MARKETPLACE CS2 ────────────────────────────────────────────────
  {
    name:    'Contrato de servicios — Marketplace (Skins/Items)',
    type:    'marketplace',
    content: `CONTRATO DE COLABORACIÓN — MARKETPLACE DE SKINS

Partes:

AGENCIA: {{agency_entity}}, NIF {{agency_taxid}}.
MARKETPLACE: {{brand_name}}.
CREADOR: {{influencer_name}}.

=====================================
1. OBJETO
=====================================

Promoción del marketplace {{brand_name}} (compra/venta de skins e items de videojuegos) a través de la campaña "{{campaign_name}}" en {{geo}}.

Periodo: {{start_date}} — {{end_date}}.

=====================================
2. ENTREGABLES Y ACCIONES
=====================================

{{deliverables}}

El Creador deberá:
- Mostrar el proceso de compra/venta en la plataforma.
- Destacar las ventajas competitivas (precio, seguridad, variedad).
- Incluir el enlace de referido en la descripción del vídeo/stream.

=====================================
3. COMISIÓN DE REFERIDOS (si aplica)
=====================================

Adicionalmente al fee fijo, el Creador podrá recibir comisión por referidos activos generados a través de su enlace único, según las condiciones acordadas por separado.

=====================================
4. RETRIBUCIÓN FIJA
=====================================

Fee fijo de campaña: {{total_amount}} {{currency}}.
Comisión de agencia: {{commission}} {{currency}}.

Pago en los 30 días siguientes a la publicación del contenido y presentación de métricas.

=====================================
5. MÉTRICAS Y REPORTING
=====================================

El Creador se compromete a facilitar a la Agencia las métricas de alcance (impresiones, clics en enlace, conversiones) en los 7 días siguientes a la finalización de la campaña.

=====================================
FIRMAS
=====================================

{{agency_name}} | {{brand_name}} | {{influencer_name}} — {{today}}`,
  },

  // ── YOUTUBE ────────────────────────────────────────────────────────
  {
    name:    'Contrato de servicios — YouTube',
    type:    'youtube',
    content: `CONTRATO DE INTEGRACIÓN PUBLICITARIA — YOUTUBE

Partes:

AGENCIA: {{agency_entity}}, NIF {{agency_taxid}}.
ANUNCIANTE: {{brand_name}}.
YOUTUBER: {{influencer_name}}.

=====================================
1. OBJETO
=====================================

Integración publicitaria de {{brand_name}} en el canal de YouTube de {{influencer_name}}, en el marco de la campaña "{{campaign_name}}".

Periodo: {{start_date}} — {{end_date}}.
Mercado objetivo: {{geo}}.

=====================================
2. ENTREGABLES
=====================================

{{deliverables}}

Especificaciones técnicas:
- La mención patrocinada debe durar un mínimo de 60 segundos.
- Situar preferiblemente entre el minuto 3 y 8 del vídeo.
- Incluir los elementos visuales y textos de marca proporcionados por {{brand_name}}.
- El vídeo debe incluir el enlace en la descripción y el CTA oral.

=====================================
3. CUMPLIMIENTO DE NORMAS YOUTUBE
=====================================

El Creador se compromete a:
- Marcar el contenido como "publicidad" en YouTube Studio.
- Incluir la declaración de contenido de pago en la descripción.
- No eliminar el vídeo durante al menos 12 meses desde su publicación.

=====================================
4. DERECHOS DE USO
=====================================

{{brand_name}} podrá reutilizar el segmento de integración en sus propios canales de redes sociales por un período de 6 meses, siempre citando al Creador.

=====================================
5. RETRIBUCIÓN
=====================================

Fee por vídeo: {{total_amount}} {{currency}}.

Pago: 50% al firmar el contrato, 50% tras la publicación y envío de métricas.

=====================================
FIRMAS
=====================================

{{agency_name}}: _________________
{{brand_name}}: __________________
{{influencer_name}}: _____________

Fecha: {{today}}`,
  },

  // ── TWITCH / STREAMING ─────────────────────────────────────────────
  {
    name:    'Contrato de servicios — Twitch / Streaming',
    type:    'twitch',
    content: `CONTRATO DE COLABORACIÓN — STREAMING EN DIRECTO

Partes:

AGENCIA: {{agency_entity}}, NIF {{agency_taxid}}.
PATROCINADOR: {{brand_name}}.
STREAMER: {{influencer_name}}.

=====================================
1. OBJETO
=====================================

Patrocinio de directos en Twitch (u otras plataformas de streaming) de {{influencer_name}} para la promoción de {{brand_name}}, en la campaña "{{campaign_name}}".

Periodo: {{start_date}} — {{end_date}}.
Mercado: {{geo}}.

=====================================
2. ENTREGABLES EN DIRECTO
=====================================

{{deliverables}}

Requisitos por stream patrocinado:
- Mencionar a {{brand_name}} al inicio y al menos cada 45 minutos.
- Mostrar el panel/banner de {{brand_name}} durante toda la emisión.
- Realizar la integración en el momento de mayor audiencia del stream.
- Compartir en redes sociales el anuncio del directo con mención al patrocinador.

=====================================
3. PANEL Y OVERLAYS
=====================================

{{brand_name}} proporcionará los assets visuales (overlays, paneles, alertas). El Streamer se compromete a implementarlos correctamente antes del primer directo patrocinado.

=====================================
4. EXCLUSIVIDAD DE CATEGORÍA
=====================================

Durante la vigencia del contrato, el Streamer no aceptará patrocinios de competidores directos de {{brand_name}} en la misma categoría de producto.

=====================================
5. CANCELACIÓN DE STREAMS
=====================================

En caso de cancelación de un directo patrocinado por causa del Streamer con menos de 48 horas de antelación, deberá recuperarse en los 7 días siguientes.

=====================================
6. RETRIBUCIÓN
=====================================

Fee total por campaña: {{total_amount}} {{currency}}.
Pago mensual / según calendario acordado.

=====================================
FIRMAS
=====================================

{{agency_name}} | {{brand_name}} | {{influencer_name}}
Fecha: {{today}}`,
  },

] as const;
