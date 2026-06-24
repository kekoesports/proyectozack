import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema/index';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    const unquoted = val.replace(/^["']|["']$/g, '');
    if (key && unquoted && !process.env[key]) process.env[key] = unquoted;
  }
} catch {}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('[blog-post-1] DATABASE_URL is not set');
const sql = neon(dbUrl);
const db = drizzle(sql, { schema });

const BODY = `Si estás valorando contratar un streamer de CS2 para una campaña y no sabes por dónde empezar con los presupuestos, no estás solo. Es una de las preguntas que más recibimos de marcas y operadores que se acercan al ecosistema gaming por primera vez.

La respuesta directa es que no hay una tarifa fija. Lo que hay son rangos basados en el tamaño de la audiencia, el tipo de acción que pides, la exclusividad, el mercado y —algo que pocas agencias te dicen— el historial de conversiones del creador en campañas anteriores.

En este artículo te explicamos cómo se estructura realmente el pricing en el mercado hispanohablante de CS2 en 2026, qué factores mueven el precio hacia arriba o hacia abajo, y cuáles son los errores más comunes al negociar tarifas sin conocer el ecosistema.

## Por qué el número de seguidores no determina la tarifa

El error más frecuente que cometen las marcas al acercarse al marketing con streamers es usar el número de seguidores como proxy del valor. En CS2 esto es especialmente engañoso.

Un canal de CS2 puede acumular 300.000 seguidores en Twitch a lo largo de cinco años de actividad, pero si hoy tiene 400 espectadores medios concurrentes, su valor real de activación es mucho más parecido al de un canal de 50.000 seguidores con 400 viewers que al de uno con 300.000 seguidores y 4.000 viewers activos.

Lo que determina el precio de una integración en streaming es, por orden de importancia:

**Espectadores medios concurrentes (ACV).** Es el número de personas que están viendo el stream en tiempo real. Para campañas de conversión directa —códigos de descuento, FTDs, registros— es la métrica más relevante porque es el tamaño de la audiencia que realmente recibe el mensaje en el momento en que se emite.

**Historial de conversiones verificado.** Si el creador ha trabajado con operadores iGaming, plataformas de CS2 skins o marcas similares antes, sus datos históricos de conversión (clicks, registros, depósitos) son el indicador más fiable de lo que puedes esperar. Un creador con 800 ACV y un historial de 120 FTDs por campaña vale más que uno con 1.500 ACV sin track record de conversión.

**Engagement del chat.** Un chat activo —viewers que responden a lo que dice el streamer, que preguntan por los productos integrados, que usan los comandos del bot— es una señal de audiencia comprometida. En CS2, donde la cultura del chat es parte de la experiencia, esto marca una diferencia real.

**Mercado geográfico.** Los streamers de España, México, Argentina y Chile tienen bases de audiencia con poder adquisitivo y comportamiento de consumo distintos. Para campañas iGaming con operadores regulados en España, los creadores con audiencia mayoritariamente española tienen un premium porque la conversión en un mercado regulado tiene mayor valor por usuario.

## Rangos orientativos por segmento en el mercado hispano de CS2 (2026)

Estos rangos corresponden a integraciones estándar en streaming (mención activa con pantalla + código) sin exclusividad de categoría. Los precios están en euros.

### Nano y micro (500–2.000 ACV)

Precio orientativo por integración: **150 € – 600 €**

Este segmento es el que mejor relación coste-conversión ofrece para campañas de CS2 skins e iGaming mid-market. La audiencia es pequeña pero muy comprometida. Es habitual que estos streamers tengan comunidades de Discord activas donde la mención del producto se amplifica más allá del stream.

Para campañas con múltiples activaciones simultáneas —cinco o diez streamers de este segmento en paralelo— el coste total es competitivo y el riesgo se distribuye. Si un streamer tiene un stream flojo ese día, los otros lo compensan.

### Mid-tier (2.000–8.000 ACV)

Precio orientativo por integración: **600 € – 2.500 €**

Aquí está la mayor parte del valor para campañas de performance en CS2. Son streamers con comunidades consolidadas, historial en la plataforma y, en muchos casos, track record de campañas anteriores que permite proyectar conversiones con cierta fiabilidad.

Las marcas que quieren una activación visible sin el presupuesto ni la complejidad de los grandes nombres encuentran en este segmento el mejor equilibrio entre alcance, credibilidad y coste.

### Upper mid-tier (8.000–20.000 ACV)

Precio orientativo por integración: **2.500 € – 7.000 €**

Streamers con presencia consolidada y, en muchos casos, presencia activa también en YouTube y redes sociales. Una sola integración de este perfil puede generar un volumen de conversiones equivalente al de cinco o seis streamers del segmento anterior, con el beneficio adicional del brand awareness acumulado en YouTube.

En este rango, la negociación de condiciones importa tanto como el precio base: la posición de la mención dentro del stream, si hay contenido grabado asociado, si el código es exclusivo y durante cuánto tiempo, y si el creador puede referenciar la campaña en sus redes.

### Top tier (20.000+ ACV)

Precio orientativo por integración: **7.000 € – 20.000 €+**

Este segmento requiere negociación directa y plazos de lead time más largos —en general, cuatro semanas mínimo entre el acuerdo y la publicación. El precio varía significativamente según la exclusividad de categoría, si incluye contenido en YouTube, y si el streamer tiene management propio con condiciones específicas.

Las campañas en este segmento son adecuadas para lanzamientos de producto, campañas de brand awareness a gran escala o activaciones que necesitan una cobertura masiva en un período corto. Para campañas de performance puro, el ROI suele ser más eficiente en el segmento mid-tier.

## Qué factores añaden coste por encima del precio base

El precio base de una integración en streaming cubre la mención activa en directo con pantalla. Existen factores que suben la tarifa:

**Exclusividad de categoría.** Si pides al streamer que no trabaje con competidores directos durante un período determinado, eso tiene un sobrecoste típico del 30% al 100% sobre la tarifa base, dependiendo de cuán restrictiva sea la exclusividad y cuánto tiempo dure.

**Contenido adicional en redes.** Si la activación incluye una Story en Instagram, un clip en TikTok o un short en YouTube, cada formato adicional suma al precio base. El rango habitual por cada formato adicional es 50–300 € dependiendo del segmento del creador.

**Vídeo largo en YouTube.** Cuando la campaña incluye un vídeo de formato largo en YouTube —review, comparativa, gameplay extendido— el coste se negocia de forma separada al stream. Los vídeos de YouTube tienen valor residual porque siguen generando visualizaciones meses después. El precio suele ser equivalente o superior al de una activación de stream.

**Briefing complejo o restricciones de compliance.** En campañas iGaming con requisitos regulatorios DGOJ, si el creador no tiene experiencia en compliance de apuestas, el proceso de briefing y revisión de contenido añade tiempo y en algunos casos coste.

**Urgencia.** Activaciones con menos de dos semanas de lead time tienen un sobrecoste habitual del 15% al 30% sobre la tarifa estándar.

## Los errores más comunes al negociar tarifas de streamers sin agencia

**Negociar solo el precio por integración sin fijar las condiciones de la mención.** Una integración puede durar 30 segundos o 5 minutos. Puede ocurrir en el momento de mayor audiencia del stream o en un momento de baja afluencia. El precio tiene que ir acompañado de condiciones mínimas: duración de la mención, posición en el stream, visibilidad del código en pantalla, número de menciones.

**Pagar por alcance total en vez de por audiencia activa.** El número de seguidores o el total de views del canal son métricas de vanidad cuando hablamos de activaciones en directo. Lo que compras es la audiencia del stream el día de la integración, que puede ser muy diferente al promedio histórico si el streamer no tiene horarios regulares.

**Trabajar sin contrato o con acuerdos por mensaje privado.** En el mercado hispano de CS2, los acuerdos verbales o por DM sin contrato formal crean problemas de entregables, plazos y derechos de uso del contenido. Un contrato que especifique el tipo de mención, la fecha, el código único, los derechos de uso y las condiciones de pago es la base mínima de cualquier activación.

**No pedir datos históricos de campañas anteriores.** Si el streamer ha trabajado con marcas similares antes, tiene datos de conversiones. Si no los comparte, es una señal. Si no los tiene, asume el riesgo de estar pilotando sin datos.

## Cómo trabaja SocialPro con los streamers de CS2

En SocialPro gestionamos un roster de creadores de CS2 del ecosistema hispanohablante con los que tenemos relaciones directas, contratos establecidos y —lo más importante— datos históricos de conversión de campañas anteriores.

Cuando una marca nos pide una activación de CS2, no vamos al mercado a buscar quien esté disponible. Cruzamos el brief con nuestro roster, el historial de conversiones de cada creador en campañas similares, y el perfil de audiencia que el cliente necesita para proyectar resultados antes de firmar.

El resultado es que las marcas que trabajan con nosotros saben antes de lanzar la campaña qué rango de conversiones pueden esperar, basado en datos reales, no en estimaciones.

Si quieres diseñar una campaña de CS2 con creadores verificados, puedes ver nuestro [roster completo](/talentos) o [contactarnos directamente](/contacto).`;

async function main() {
  const post = {
    slug: 'cuanto-cobra-streamer-cs2-patrocinio-2026',
    title: '¿Cuánto cobra un streamer de CS2 por una integración en 2026? Tarifas y factores reales',
    excerpt:
      'Rangos de precios reales por segmento (nano, mid-tier, top tier), qué factores mueven la tarifa hacia arriba y los errores más comunes al negociar con streamers de CS2 sin conocer el ecosistema. Guía basada en campañas reales de SocialPro.',
    bodyMd: BODY,
    coverUrl: '/images/blog/cuanto-cobra-streamer-cs2-patrocinio-2026.jpg',
    author: 'Pablo Camacho',
    status: 'published' as const,
    vertical: 'blog' as const,
    contentType: 'analisis' as const,
    publishedAt: new Date('2026-07-01'),
    sortOrder: 30,
    tags: ['cs2', 'streamers', 'tarifas', 'influencer marketing', 'gaming'],
    talentSlugs: [],
  };

  const result = await db
    .insert(schema.posts)
    .values(post)
    .onConflictDoNothing()
    .returning({ id: schema.posts.id, slug: schema.posts.slug });

  if (result.length === 0) {
    console.log(`⚠  Ya existe (skipped): ${post.slug}`);
  } else {
    const words = post.bodyMd.split(/\s+/).length;
    console.log(`✓  Insertado "${post.slug}" — ${words} palabras [${post.status}]`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
