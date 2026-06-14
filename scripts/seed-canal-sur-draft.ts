/**
 * Inserta el artículo de Canal Sur como draft en la tabla posts.
 * Ejecutar: npx tsx scripts/seed-canal-sur-draft.ts
 *
 * Idempotente: si el slug ya existe, muestra el ID y sale sin error.
 */

// Cargar .env.local manualmente (tsx no lo carga automáticamente)
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
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* no .env.local en CI */ }

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema/index';
import { eq } from 'drizzle-orm';

const RAW_DB_URL = process.env.DATABASE_URL;
if (!RAW_DB_URL) {
  console.error('DATABASE_URL no configurado. Revisa .env.local');
  process.exit(1);
}
// Eliminar channel_binding=require — no soportado por @neondatabase/serverless en esta versión
const DATABASE_URL = RAW_DB_URL.replace(/[&?]channel_binding=[^&]*/g, '');

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const SLUG = 'keko-presenta-socialpro-canal-sur-radio-agencia-gaming-esports';

const TITLE =
  'Keko, referente andaluz de los esports, presenta SocialPro en Canal Sur Radio';

const EXCERPT =
  'Keko (Pablo Camacho Carrión), fundador y CEO de SocialPro, participa en el programa Todo e-Games de Canal Sur Radio. Una conversación sobre esports en Andalucía y cómo las marcas conectan con audiencias gaming en España y LatAm.';

const BODY_MD = `## El gaming andaluz en antena

El 13 de junio de 2026, **Keko** —Pablo Camacho Carrión— participó en el programa *Todo e-Games* de Canal Sur Radio, el espacio de referencia del medio público andaluz para el mundo de los videojuegos y los esports.

La entrevista aborda la trayectoria de Keko como profesional del sector y el modelo de trabajo de [SocialPro](/nosotros), la agencia que co-funda y dirige con Alfonso "Zack" Arias.

👉 [Escuchar el episodio completo en Canal Sur Más](https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3)

## De competidor a empresario

Keko lleva más de una década en el ecosistema esports. Empezó como jugador semiprofesional de CS:GO y, con el tiempo, derivó hacia la gestión de talento y el marketing gaming. Fundó SocialPro para hacer lo que él mismo habría querido tener como creador: una agencia que entiende el sector desde dentro y convierte el gaming en resultados de negocio reales para marcas y creadores.

La agencia trabaja con creadores especializados en CS2, Valorant, iGaming y entretenimiento gaming, con presencia en España y seis mercados de Latinoamérica.

## Resultados verificables, no capturas de pantalla

Una de las señas de identidad de SocialPro es el modelo de tracking. Los resultados de campaña se verifican desde el panel del operador o la plataforma de destino. Es un estándar más exigente, pero es el único que ofrece garantías reales a las marcas.

Para el sector iGaming, SocialPro integra [compliance DGOJ](/guia-dgoj-igaming-influencers) desde el primer día: vetting de creadores, revisión de contenido y FTD tracking auditado. Los resultados de campañas reales están disponibles en [la sección de casos](/casos).

## Gaming desde Córdoba, con alcance internacional

SocialPro tiene su base en Córdoba, Andalucía. La aparición de Keko en Canal Sur Radio refleja algo que el sector conoce pero los medios generalistas reconocen poco: el gaming y los esports en España no son un fenómeno exclusivamente de grandes capitales. Existen comunidades, agencias y profesionales del sector en toda la geografía española que compiten y trabajan a nivel europeo e internacional.

Para el ecosistema andaluz, ver a un profesional de los esports en antena en el medio público regional —hablando de negocio, de agencias y de creadores— es una señal de madurez del sector.

## ¿Tu marca quiere llegar a audiencias gaming?

SocialPro gestiona campañas con creadores de CS2, Valorant, iGaming y entretenimiento gaming en España y Latinoamérica. Si representas una marca, podemos preparar una propuesta con creadores seleccionados en 48 horas, sin compromiso.

👉 [Solicitar propuesta sin compromiso](https://socialpro.es/contacto?type=brand)`;

const BLOCKS_JSON = {
  podcast: {
    episodeTitle: "'Keko', referente andaluz de los esports, presenta SocialPro",
    showName: 'Todo e-Games',
    network: 'Canal Sur Radio',
    host: 'Todo e-Games — RTVA',
    date: '13 de junio de 2026',
    audioUrl:
      'https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3',
    showUrl:
      'https://www.canalsur.es/radio/programas/todo-egames/podcast/19795725.html',
    description:
      'Keko (Pablo Camacho Carrión), fundador y CEO de SocialPro, habla sobre su trayectoria en esports y cómo la agencia conecta creadores gaming con marcas en España y LatAm.',
  },
};

const TAGS = [
  'canal-sur',
  'keko',
  'pablo-camacho',
  'esports',
  'andalucia',
  'gaming',
  'socialpro',
  'radio',
];

async function main() {
  const existing = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.slug, SLUG))
    .limit(1);

  if (existing.length > 0) {
    const id = existing[0]?.id;
    console.log(`✓ Draft ya existe — id=${id}`);
    console.log(`  Editar: /admin/noticias/${id}/edit`);
    console.log(`  Preview: /news/${SLUG}`);
    return;
  }

  const [row] = await db
    .insert(schema.posts)
    .values({
      slug: SLUG,
      title: TITLE,
      excerpt: EXCERPT,
      bodyMd: BODY_MD,
      author: 'Redacción SocialPro',
      status: 'draft',
      vertical: 'news',
      contentType: 'noticias',
      coverUrl: null,
      ogImageUrl: null,
      publishedAt: null,
      sortOrder: 0,
      tags: TAGS,
      talentSlugs: null,
      blocksJson: BLOCKS_JSON,
    })
    .returning({ id: schema.posts.id });

  console.log(`✓ Draft creado — id=${row?.id}`);
  console.log(`  Editar: /admin/noticias/${row?.id}/edit`);
  console.log(`  Preview: /news/${SLUG}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
