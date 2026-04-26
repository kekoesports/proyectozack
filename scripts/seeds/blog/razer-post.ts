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
if (!dbUrl) throw new Error('[razer-post] DATABASE_URL is not set');
const sql = neon(dbUrl);
const db = drizzle(sql, { schema });

const RAZER_BODY = `Cuando RAZER buscaba reforzar su presencia en el mercado gaming hispanohablante, no recurrió a publicidad convencional. Buscó algo que la audiencia gaming España no puede ignorar: sus propios creadores de contenido, usando los productos en su setup real, en directo, sin guion.

El resultado de esa decisión fue una de las activaciones gaming más completas que hemos ejecutado en SocialPro: 13 creadores, plataformas múltiples, 2.5M+ de alcance y un engagement rate del 4.8% —más del doble de la media del sector.

En este artículo explicamos cómo se diseñó la campaña, por qué funcionó y qué pueden aprender otras marcas de hardware del modelo de activación con creadores.

## Por qué RAZER apostó por creadores y no por publicidad convencional

RAZER no necesita presentación en el ecosistema gaming. Es una de las marcas de periféricos más reconocidas del mundo, con una presencia consolidada en competiciones de esports y en el imaginario visual del setup gaming. Pero el reconocimiento de marca no se traduce automáticamente en conversión, especialmente en una audiencia que consume contenido de forma activa y tiene una resistencia alta a la publicidad tradicional.

La audiencia gaming hispanohablante tiene una característica que la hace especialmente valiosa —y especialmente difícil de impactar con métodos convencionales. Los espectadores de Twitch pasan una media de 45 minutos por sesión, con atención concentrada en el creador que siguen. Esa relación de confianza entre creador y audiencia es imposible de replicar en un banner o un spot de televisión.

La decisión de RAZER fue clara: llegar a esa audiencia a través de los creadores que ya tienen su confianza, mostrando los productos en el contexto donde realmente se usan —el setup diario, los streams en directo, el contenido que la audiencia ya consume por elección propia.

## Cómo SocialPro seleccionó los 13 creadores de la campaña

La selección de creadores para una activación de hardware no es igual que para otras categorías. En iGaming o energéticas, el foco está en la conversión directa y el alcance. En hardware, el criterio determinante es la credibilidad del setup: el creador tiene que ser alguien cuya audiencia confíe en su criterio sobre periféricos.

SocialPro construyó el roster de esta campaña aplicando tres filtros:

**Perfil de contenido gaming auténtico.** Solo creadores cuyo contenido principal sea gaming o streaming, no creadores generalistas con una sección de gaming. La integración de periféricos tiene que ser natural dentro de su contenido habitual.

**Engagement rate por encima del 3%.** El tamaño del canal importa menos que la relación activa entre el creador y su audiencia. Un chat activo en Twitch o una sección de comentarios de YouTube con respuestas frecuentes del creador es una señal mucho más fiable de impacto real que el número de seguidores.

**Distribución multicanal.** La campaña necesitaba cobertura simultánea en Twitch, YouTube, Instagram y TikTok. Seleccionamos perfiles con presencia activa en al menos dos plataformas, con énfasis en quienes tienen tanto stream como producción de contenido grabado.

El roster final incluyó a IreneRAWR, Deqiuv, Rinna, The Real Fer, Goked, Naow, Vityshow, Todocs2, Eruby, Joanpau, Dess y D3stri —perfiles con comunidades consolidadas dentro del ecosistema gaming hispanohablante.

## La mecánica de la activación: setup reveals, streams y redes sociales

La activación se diseñó en tres capas para maximizar el alcance en diferentes formatos y momentos de consumo.

### Capa 1: integración en streams en directo (Twitch)

Cada creador recibió un pack de periféricos RAZER —en algunos casos incluyendo silla gaming, ratón, teclado y auriculares— que integró en su setup para sus emisiones habituales. La mención de los productos se produjo de forma orgánica dentro del contenido: una respuesta a un viewer preguntando por el ratón, una demostración en medio de una partida, una comparativa con el periférico anterior.

Este formato aprovecha el tiempo de atención elevado de la audiencia en directo. Cuando un viewer lleva 30 minutos viendo un stream y el creador comenta que su nuevo teclado RAZER tiene una respuesta diferente en las partidas de alta intensidad, ese mensaje llega con un nivel de credibilidad que ningún anuncio puede comprar.

### Capa 2: contenido en redes sociales (Instagram y TikTok)

La cobertura en redes amplificó el alcance más allá de las audiencias directas de cada stream. Las historias de Instagram con el unboxing o el setup actualizado y los vídeos cortos de TikTok mostrando el periférico en acción generaron un segundo ciclo de exposición para las marcas.

TikTok en particular actúa como canal de descubrimiento: usuarios que no siguen al creador pero que tienen interés en gaming pueden llegar a ese contenido a través del algoritmo, ampliando el alcance neto de la campaña más allá de la audiencia fidelizada.

### Capa 3: contenido en YouTube (largo plazo)

Algunos creadores produjeron contenido de formato largo en YouTube —reviews, comparativas de setup o vídeos de highlights— donde los periféricos RAZER aparecían integrados. Este contenido tiene una vida útil que puede extenderse meses, generando visualizaciones continuadas mucho más allá de la fecha de publicación.

## Los resultados que validan el modelo

Los datos finales de la campaña hablan por sí solos:

**2.5M+ de alcance total** acumulado en todas las plataformas y creadores. Este número incluye visualizaciones de streams en directo, reproducciones de contenido grabado, impresiones de Instagram Stories y visualizaciones de TikTok.

**4.8% de engagement rate medio**, calculado sobre el total de interacciones activas —comentarios, mensajes de chat, likes, compartidos— en relación con el alcance real. La media del sector en campañas de influencer marketing gaming está entre el 1.5% y el 2.5%. El 4.8% refleja el nivel de ajuste entre los creadores seleccionados y la audiencia a la que se dirigían.

**185.000 interacciones directas** con el contenido de la campaña: mensajes de chat en Twitch mencionando los periféricos, comentarios en vídeos de YouTube, interacciones en Instagram y TikTok.

**3.2x ROI** sobre la inversión en la campaña, calculado sobre las conversiones rastreadas y el valor del brand awareness generado.

El caso de éxito completo con todos los detalles está disponible en socialpro.es/casos/razer.

## Por qué el formato de activación con creadores funciona especialmente bien para hardware gaming

Las marcas de hardware tienen un reto de comunicación específico: los periféricos gaming no se compran por impulso. Son productos en los que la audiencia investiga antes de comprar —busca reviews, compara especificaciones, pregunta a personas de confianza. El proceso de decisión puede durar semanas.

Eso hace que el marketing de hardware gaming tenga que operar en dos niveles simultáneamente: crear visibilidad de marca a corto plazo y construir confianza que se materialice en conversión días o semanas después. Las activaciones con creadores son el único formato que consigue ambas cosas al mismo tiempo.

Cuando un viewer ve a su creador favorito usando un ratón RAZER durante tres streams seguidos y responder preguntas sobre él con conocimiento genuino, no recibe una impresión publicitaria: recibe una recomendación de alguien en quien confía. Eso tiene un peso en la decisión de compra que ningún banner puede replicar.

El elemento diferencial de la campaña RAZER fue la escala: 13 creadores simultáneos en múltiples plataformas crearon un efecto de presencia que hace que la audiencia gaming encuentre el producto en diferentes contextos y formatos, reforzando el mensaje sin resultar intrusivo.

## Lo que otras marcas de hardware pueden aprender de esta campaña

El modelo de activación gaming con creadores que ejecutamos para RAZER no es exclusivo de marcas de la escala de RAZER. Los principios que lo hacen funcionar —selección por engagement y credibilidad de setup, integración orgánica en contenido real, cobertura multicanal con diferentes formatos— son aplicables a cualquier marca de hardware que quiera llegar al ecosistema gaming.

Lo que sí requiere escala y especialización es la ejecución: gestionar 13 creadores en simultáneo, coordinar la entrega de producto, asegurar la calidad y el timing del contenido, y medir los resultados con precisión requiere una infraestructura de agencia que pocas marcas pueden construir internamente.

SocialPro trabaja con marcas que quieren acceder al ecosistema gaming de forma correcta: con creadores verificados, briefings de compliance claros, tracking de resultados real y una metodología de selección basada en datos, no en números de seguidores.

Si quieres diseñar una campaña de activación para tu marca, puedes ver todos nuestros casos de éxito en socialpro.es/casos o escribirnos directamente en socialpro.es/contacto.`;

async function main() {
  const post = {
    slug: 'socialpro-razer-activacion-creadores-gaming',
    title: 'SocialPro × RAZER: activación con 13 creadores gaming y 2.5M de alcance',
    excerpt:
      'Cómo SocialPro ejecutó una activación multicanal para RAZER con 13 creadores del ecosistema gaming, logrando 2.5M+ de alcance, 185K interacciones y un ROI de 3.2x. El modelo de campaña de hardware gaming que funciona.',
    bodyMd: RAZER_BODY,
    coverUrl: '/images/blog/razer-socialpro-creadores-gaming.jpg',
    author: 'SocialPro',
    status: 'published' as const,
    publishedAt: new Date('2026-04-24'),
    sortOrder: 20,
  };

  const result = await db
    .insert(schema.posts)
    .values(post)
    .onConflictDoNothing()
    .returning({ id: schema.posts.id, slug: schema.posts.slug });

  if (result.length === 0) {
    console.log(`⚠  Already exists (skipped): ${post.slug}`);
  } else {
    const words = post.bodyMd.split(/\s+/).length;
    console.log(`✓  Inserted "${post.slug}" — ${words} words [${post.status}]`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
