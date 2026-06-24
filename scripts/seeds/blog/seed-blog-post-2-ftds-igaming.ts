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
if (!dbUrl) throw new Error('[blog-post-2] DATABASE_URL is not set');
const sql = neon(dbUrl);
const db = drizzle(sql, { schema });

const BODY = `En el mercado de marketing iGaming con influencers, la diferencia entre una agencia que sabe lo que hace y una que no se mide en una sola palabra: FTDs.

Un First Time Deposit es el evento de conversión que más valor tiene para un operador de apuestas o casino online. No es un click, no es un registro, no es una visita. Es un usuario real que deposita dinero por primera vez en la plataforma. Es el KPI que los operadores usan para medir si una campaña de influencer marketing funciona de verdad o solo genera ruido.

La mayoría de las agencias de influencer marketing no saben cómo trackear FTDs. Usan métricas de awareness —alcance, impresiones, engagement genérico— porque es lo que pueden medir con las herramientas de redes sociales. Pero los operadores iGaming no compran awareness. Compran conversiones verificadas.

En SocialPro llevamos campañas de iGaming con influencers desde antes de que la mayoría de las agencias gaming supieran qué era un FTD. Este artículo explica exactamente cómo funciona el tracking de conversiones en este tipo de campañas, por qué la metodología importa más que el alcance, y qué datos reales hemos conseguido para operadores en el mercado hispanohablante.

## Qué es un FTD y por qué es el KPI que importa en iGaming

Un First Time Deposit (FTD) es la primera transacción real que hace un usuario nuevo en una plataforma de apuestas o casino online. Es el momento en que un usuario pasa de ser un registro a ser un cliente activo con valor económico real para el operador.

Para un operador iGaming, el FTD es el evento que activa el modelo de negocio. Los depósitos recurrentes, las apuestas continuadas y el LTV (valor de vida del cliente) empiezan todos en ese primer depósito. Por eso, cuando un operador evalúa si una campaña de influencer marketing ha funcionado, la pregunta no es cuántas personas vieron el contenido sino cuántos FTDs generó.

El coste por FTD es la métrica que los operadores usan para comparar canales: publicidad de pago en redes, afiliados, influencers, SEM. Si el coste por FTD de una campaña de influencers es competitivo con el de afiliados o paid social, la campaña ha funcionado. Si no lo es, no ha funcionado, independientemente del alcance o el engagement.

Esto hace que el marketing iGaming con influencers sea un vertical completamente diferente al marketing gaming convencional. Las métricas de éxito son distintas, la metodología de tracking es distinta, los requisitos de compliance son distintos y las conversaciones con los clientes son distintas.

## Cómo se trackean los FTDs en una campaña de influencers iGaming

El tracking de FTDs en campañas de influencers requiere una infraestructura que la mayoría de las agencias generalistas no tiene. Implica coordinación directa con el operador para acceder a los datos de conversión, que no son datos públicos ni están disponibles en plataformas de analytics de redes sociales.

El proceso que usamos en SocialPro funciona de la siguiente manera:

### Paso 1: código de referido único por influencer

Cada creador que participa en la campaña recibe un código de referido único —en algunos casos también una URL de landing con parámetro de tracking— que identifica sin ambigüedad los usuarios que llegan desde ese canal específico.

Cuando un viewer del stream registra una cuenta en la plataforma usando ese código y realiza su primer depósito, el sistema del operador registra ese FTD con el atributo del influencer correspondiente. Este es el método de tracking más robusto porque la atribución es directa: el usuario tiene que usar el código activamente, lo que elimina el problema de la atribución indirecta por cookies o UTMs.

### Paso 2: acceso al panel del operador

La verificación de los FTDs se hace directamente desde el panel de gestión del operador, no desde las métricas de redes sociales. El operador tiene visibilidad sobre cuántos usuarios se registraron con cada código, cuántos de ellos realizaron el primer depósito, y en algunos casos cuál fue el importe medio del depósito.

En nuestras campañas, acordamos con el operador un acceso periódico a estos datos —en tiempo real o con reportes semanales— para tener visibilidad sobre el rendimiento de la campaña mientras está activa y poder ajustar si es necesario.

Este acceso al panel del operador es lo que diferencia el reporting de una agencia especializada en iGaming del reporting de una agencia generalista. Cualquier agencia puede mostrarte el reach y el engagement de una campaña. Solo las que trabajan directamente con los operadores pueden mostrarte los FTDs verificados.

### Paso 3: reporting con datos del panel, no de redes sociales

El reporte final de campaña que entregamos a los operadores incluye:

- Número total de FTDs generados por la campaña, desglosado por influencer
- Coste por FTD (inversión total dividida por número de FTDs)
- Comparativa con el benchmark de afiliados del operador cuando está disponible
- Análisis de qué perfiles de influencer generaron mejor ratio de conversión para optimizar futuras campañas

Este nivel de reporting cambia completamente la conversación con el cliente. En lugar de defender el valor de una campaña con métricas de alcance, puedes mostrar exactamente cuántos clientes nuevos generó la inversión.

## El caso 1WIN: +340 FTDs verificados en una campaña de CS2

La campaña más representativa que hemos ejecutado en este modelo es la que llevamos a cabo para 1WIN en el ecosistema CS2 hispanohablante. Los datos que compartimos a continuación están verificados desde el panel del operador.

El contexto: 1WIN es un operador iGaming con presencia global que buscaba penetrar el mercado hispanohablante a través del ecosistema CS2, donde su producto —apuestas deportivas con foco en esports y skin gambling— tiene una audiencia naturalmente receptiva.

La campaña implicó activaciones con streamers de CS2 hispanohablantes, con códigos de referido únicos por creador y acceso al panel de 1WIN para el seguimiento de conversiones en tiempo real.

El resultado: **+340 FTDs verificados** desde el panel del operador, con un coste por FTD competitivo con los canales de afiliación del operador en el mismo período.

Lo que hace este resultado relevante no es solo el número. Es que está verificado con datos del operador, no estimado a partir de métricas de redes sociales. Cada uno de esos 340 FTDs corresponde a un usuario real que depositó dinero en la plataforma habiendo llegado desde el contenido de uno de los creadores de la campaña.

El caso completo con la metodología detallada está disponible en [socialpro.es/casos](/casos).

## Por qué la mayoría de las agencias no pueden ofrecer este nivel de tracking

El tracking de FTDs verificados requiere tres cosas que la mayoría de las agencias de influencer marketing no tienen:

**Relación directa con los operadores.** El acceso al panel del operador para verificar conversiones no es algo que cualquier agencia puede pedir. Requiere una relación de confianza establecida, acuerdos específicos sobre acceso a datos y la capacidad de gestionar información sensible del operador de forma segura.

**Conocimiento del ecosistema iGaming.** El marketing de apuestas online con influencers tiene requisitos regulatorios específicos en España (DGOJ) y en otros mercados. Una agencia que no conoce la regulación no puede ejecutar campañas compliance en este vertical. En España, la [regulación DGOJ para influencers](/guia-dgoj-igaming-influencers) es clara sobre los requisitos de disclosure, las restricciones de audiencia y los formatos permitidos.

**Infraestructura de atribución.** Los códigos de referido únicos por influencer, los parámetros de tracking de URLs y la coordinación con los sistemas de registro del operador requieren un proceso establecido. No se improvisa campaña a campaña.

En SocialPro tenemos los tres elementos. Llevamos trabajando con operadores iGaming en el mercado hispanohablante el tiempo suficiente para tener los procesos establecidos, las relaciones con los operadores y el conocimiento regulatorio necesarios para ejecutar este tipo de campañas correctamente.

## Compliance iGaming: lo que tienes que tener claro antes de lanzar

Las campañas iGaming con influencers en España operan bajo una regulación específica que no todos los actores del mercado conocen. Los puntos más relevantes que cualquier operador debe tener claros antes de lanzar una campaña:

**Disclosure obligatorio.** Todo contenido pagado de apuestas o casino online tiene que identificarse como publicidad. La DGOJ es explícita en este requisito y los influencers que no lo cumplen exponen al operador a sanciones.

**Restricciones de audiencia.** Las plataformas de apuestas online no pueden dirigir publicidad a menores de edad. En el contexto de influencer marketing de gaming, donde parte de la audiencia puede ser menor, esto requiere mecanismos de control específicos: declaraciones de audiencia mayoritariamente adulta, restricciones en horarios de publicación en algunos formatos, y disclaimers específicos.

**Formatos permitidos.** No todos los formatos de contenido están permitidos para publicidad de apuestas. La regulación distingue entre diferentes tipos de menciones y formatos, con requisitos distintos para cada uno.

En cada campaña iGaming que ejecutamos, preparamos un briefing de compliance para cada creador que incluye los requisitos específicos del operador y de la regulación vigente. El contenido pasa por revisión antes de publicarse.

Si eres un operador que quiere entrar en el mercado hispanohablante a través de influencers y necesitas que la campaña sea compliance desde el primer día, eso es exactamente lo que hacemos. Puedes ver la [guía DGOJ completa](/guia-dgoj-igaming-influencers) o [contactarnos directamente](/contacto).

## Lo que deberías pedir a cualquier agencia antes de contratar una campaña iGaming

Si estás evaluando agencias para una campaña iGaming con influencers, estas son las preguntas que separan a las que saben de las que no:

**¿Puedes mostrarme FTDs verificados de campañas anteriores, desde el panel del operador?** Si la respuesta es que los datos son confidenciales pero el alcance fue muy bueno, sabes lo que necesitas saber.

**¿Cómo gestionas el compliance DGOJ en los briefings de los creadores?** Si no saben de qué estás hablando, no deberían gestionar una campaña de apuestas en España.

**¿Qué metodología de tracking usas para los FTDs?** La respuesta tiene que incluir códigos de referido únicos y acceso al panel del operador. Si la respuesta son solo clicks o UTMs, el tracking es incompleto.

**¿Qué experiencia tienes con el ecosistema CS2 hispanohablante específicamente?** Las audiencias y los creadores de CS2 tienen características específicas que no son iguales a las de otros verticales gaming. Una agencia generalista que "también hace CS2" no tiene el roster ni el conocimiento para ejecutar bien.

En SocialPro podemos responder todas esas preguntas con datos reales. Si quieres tener esa conversación, [escríbenos](/contacto).`;

async function main() {
  const post = {
    slug: 'trackeo-ftds-campanas-igaming-influencers-metodologia',
    title: 'Cómo trackear FTDs reales en campañas iGaming con influencers: la metodología que usamos en SocialPro',
    excerpt:
      'Por qué el alcance no es el KPI que importa en iGaming, cómo funciona el tracking de First Time Deposits verificados desde el panel del operador, y qué datos reales conseguimos para 1WIN en CS2. La guía que ninguna agencia generalista puede escribir.',
    bodyMd: BODY,
    coverUrl: '/images/blog/trackeo-ftds-igaming-influencers-metodologia.jpg',
    author: 'Pablo Camacho',
    status: 'published' as const,
    vertical: 'blog' as const,
    contentType: 'analisis' as const,
    publishedAt: new Date('2026-07-08'),
    sortOrder: 31,
    tags: ['igaming', 'ftds', 'influencer marketing', 'cs2', 'compliance', 'tracking'],
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
