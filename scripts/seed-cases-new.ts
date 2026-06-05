/**
 * seed-cases-new.ts — Inserta 3 nuevos casos de éxito: KeyDrop, EmpireDrop, CSDROP.
 * Ejecutar: npx tsx scripts/seed-cases-new.ts
 * Idempotente: si el slug ya existe, lo omite.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

// Load .env.local manually (tsx no lo carga automáticamente)
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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local no existe en CI — continúa con env existente
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Fill in .env.local first.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ─── DATOS DE LOS 3 NUEVOS CASOS ────────────────────────────────────────────

const CASES = [
  {
    slug: 'keydrop',
    brandName: 'KEYDROP',
    title: 'KeyDrop × SocialPro: Campañas CS2 con 12 Creadores en España y LATAM',
    logoUrl: null,                    // BRAND_LOGO_MAP ya tiene KEYDROP → /images/brands/keydrop.png
    sortOrder: 3,
    reach: null,
    engagementRate: null,
    conversions: '55.000€+ gestionados',
    roiMultiplier: null,
    heroImageUrl: null,
    excerpt:
      'Gestión integral de campañas CS2 en España y LATAM con 12 creadores especializados del ecosistema Counter-Strike. Más de 55.000€ en inversión gestionada durante 2026.',
    campaignPeriod: '2026',
    spokespersonQuote: null,
    spokespersonName: null,
    spokespersonRole: null,
    keyTakeaways:
      '12 creadores especializados en CS2 activados de forma simultánea en España y LATAM.\n' +
      '55.000€+ en inversión gestionada durante 2026, con seguimiento y reporting por creador.\n' +
      'Selección basada en historial de conversión en campañas de CS2 skins y fit de audiencia.\n' +
      'Código de referido único por creador: atribución exacta de cada conversión desde el primer clic.\n' +
      'Cobertura bilingüe con creadores activos en España, México, Argentina y Chile.',
    body: [
      {
        paragraph:
          'KeyDrop, plataforma líder en apertura de cases de CS2, encargó a SocialPro la gestión integral de sus campañas de influencer marketing en el mercado hispanohablante durante 2026. El objetivo era ampliar la base de usuarios activos en España y LATAM mediante creadores con audiencias especializadas en Counter-Strike, generando notoriedad de marca y tráfico cualificado de referido hacia la plataforma.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro seleccionó 12 creadores del ecosistema CS2 para la campaña, combinando perfiles de Twitch y YouTube de España, México, Argentina y Chile. El criterio de selección priorizó streamers con audiencias activas en CS2 competitivo y experiencia previa con plataformas de skins, garantizando un fit natural entre el producto de KeyDrop y el contenido habitual de cada creador. El roster incluyó perfiles como Imantado, HuasoPeek, TodoCS2, Deqiuv, NAOW, Adams, Jolu, CurlyDidSaster y Orroxx, entre otros.',
        sortOrder: 1,
      },
      {
        paragraph:
          'Cada creador recibió un código de referido personalizado vinculado al sistema de seguimiento de KeyDrop. Las integraciones se ejecutaron en formato nativo durante directos de CS2: apertura de cases, análisis de skins y partidas competitivas, contextos en los que la audiencia ya tiene predisposición hacia las plataformas del ecosistema. SocialPro coordinó el calendario de publicaciones y el brief creativo para cada perfil, adaptando el tono a la comunidad de cada streamer.',
        sortOrder: 2,
      },
      {
        paragraph:
          'Durante 2026, la campaña superó los 55.000€ en inversión gestionada, con seguimiento y reporting individual por creador. El desglose por código permitió identificar en tiempo real los perfiles con mayor ratio de conversión, optimizando la distribución del presupuesto hacia los creadores de mayor rendimiento. SocialPro gestionó también el proceso de facturación, contratos y compliance con cada talento, actuando como punto de contacto único para KeyDrop.',
        sortOrder: 3,
      },
    ],
    tags: [
      'CS2 Skins', 'Twitch', 'YouTube', 'España', 'LATAM',
      'iGaming', '12 creadores', '55.000€+',
    ],
    // Slugs de talentos con perfil en /talentos — el script resuelve los IDs en tiempo de ejecución
    creatorNames: [
      { name: 'Imantado',       talentSlug: 'imantado'       },
      { name: 'Goked',          talentSlug: null              },
      { name: 'HuasoPeek',      talentSlug: 'huasopeek'      },
      { name: 'TodoCS2',        talentSlug: 'todocs2'         },
      { name: 'Mirai',          talentSlug: 'mirai'           },
      { name: 'Axozer',         talentSlug: null              },
      { name: 'Jolu',           talentSlug: 'jolu'            },
      { name: 'Deqiuv',         talentSlug: 'deqiuv'          },
      { name: 'NAOW',           talentSlug: 'naow'            },
      { name: 'Adams',          talentSlug: 'adams'           },
      { name: 'CurlyDidSaster', talentSlug: 'curlydidsaster' },
      { name: 'Orroxx',         talentSlug: 'orroxx'          },
    ],
  },
  {
    slug: 'empiredrop',
    brandName: 'EMPIREDROP',
    title: 'EmpireDrop × SocialPro: Penetración en la Comunidad CS2 Hispanohablante',
    logoUrl: null,                    // BRAND_LOGO_MAP ya tiene EMPIREDROP → /images/brands/empiredrop.png
    sortOrder: 4,
    reach: null,
    engagementRate: null,
    conversions: null,
    roiMultiplier: null,
    heroImageUrl: null,
    excerpt:
      'Activación de EmpireDrop en la comunidad hispanohablante de Counter-Strike con 5 creadores seleccionados en España y LATAM, gestionando selección, negociación, coordinación, seguimiento y reporting.',
    campaignPeriod: '2025–2026',
    spokespersonQuote: null,
    spokespersonName: null,
    spokespersonRole: null,
    keyTakeaways:
      '5 creadores CS2 seleccionados con audiencias hispanohablantes en España y LATAM.\n' +
      'Gestión integral: selección de perfiles, negociación de condiciones, coordinación de campaña y reporting final.\n' +
      'Integración nativa del producto durante streams de CS2 y contenido de skins.\n' +
      'Código de referido único por creador para seguimiento de atribución.',
    body: [
      {
        paragraph:
          'EmpireDrop, plataforma de casos y skins de CS2, encargó a SocialPro la gestión de sus campañas de influencer marketing en el mercado hispanohablante. El objetivo era construir presencia de marca dentro de la comunidad de Counter-Strike en español, alcanzando audiencias con conocimiento previo del ecosistema de skins y plataformas de apertura de casos.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro seleccionó 5 creadores especializados en CS2 con audiencias en España y LATAM: Imantado, Ampeter, TodoCS2, Bystaxx y Poker. El proceso de selección evaluó el fit de audiencia con el producto de EmpireDrop, el historial de colaboraciones previas en el ecosistema de CS2 skins y la coherencia del perfil con el tono de la marca. El resultado fue un roster de perfiles con una audiencia altamente cualificada para la categoría.',
        sortOrder: 1,
      },
      {
        paragraph:
          'SocialPro gestionó el proceso completo de la campaña: negociación de condiciones con cada creador, elaboración del brief creativo, coordinación del calendario de publicaciones, seguimiento de las integraciones y reporting final para EmpireDrop. Cada creador integró el producto de forma nativa durante streams de CS2, apertura de cases y contenido relacionado con el mercado de skins, contextos naturales para su audiencia.',
        sortOrder: 2,
      },
      {
        paragraph:
          'La campaña cubrió los mercados de España y LATAM, con especial foco en México y Argentina, mercados donde la comunidad de CS2 en español tiene una base activa y en crecimiento. SocialPro actuó como punto de contacto único entre EmpireDrop y los creadores, simplificando la coordinación y garantizando la coherencia del mensaje en todos los perfiles activados.',
        sortOrder: 3,
      },
    ],
    tags: [
      'CS2 Skins', 'Twitch', 'YouTube', 'España', 'LATAM',
      'iGaming', '5 creadores',
    ],
    creatorNames: [
      { name: 'Imantado', talentSlug: 'imantado' },
      { name: 'Ampeter',  talentSlug: null        },
      { name: 'TodoCS2',  talentSlug: 'todocs2'   },
      { name: 'Bystaxx',  talentSlug: null        },
      { name: 'Poker',    talentSlug: null        },
    ],
  },
  {
    slug: 'csdrop',
    brandName: 'CSDROP',
    title: 'CSDROP × SocialPro: Visibilidad en el Ecosistema CS2 Hispanohablante',
    logoUrl: null,
    sortOrder: 5,
    reach: null,
    engagementRate: null,
    conversions: null,
    roiMultiplier: null,
    heroImageUrl: null,
    excerpt:
      'Campaña de visibilidad de CSDROP con 2 creadores especializados del ecosistema CS2, orientada al mercado hispanohablante de Counter-Strike en España y LATAM.',
    campaignPeriod: '2025–2026',
    spokespersonQuote: null,
    spokespersonName: null,
    spokespersonRole: null,
    keyTakeaways:
      '2 creadores especializados en CS2 seleccionados por fit de audiencia con el ecosistema de skins.\n' +
      'Cobertura en España y LATAM dentro de la comunidad hispanohablante de Counter-Strike.\n' +
      'Integración nativa del producto en streams de CS2 con código de referido por creador.\n' +
      'Gestión integral: selección, coordinación de campaña y seguimiento de rendimiento.',
    body: [
      {
        paragraph:
          'CSDROP encargó a SocialPro una campaña de influencer marketing orientada a aumentar su visibilidad dentro del ecosistema hispanohablante de Counter-Strike. El reto era llegar a una audiencia familiarizada con las plataformas de CS2 skins a través de creadores de confianza en la comunidad, en un mercado donde la autenticidad del prescriptor es determinante para la conversión.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro seleccionó 2 creadores con audiencias especializadas en CS2: Poker y JoluCS2. La selección priorizó perfiles cuya audiencia tiene experiencia directa con el mercado de skins y plataformas de apertura de casos, garantizando que el producto de CSDROP se presentara en un contexto natural y relevante para los espectadores. Ambos creadores tienen presencia activa en la comunidad hispanohablante de Counter-Strike en España y LATAM.',
        sortOrder: 1,
      },
      {
        paragraph:
          'Las integraciones se ejecutaron durante directos de CS2 con código de referido único por creador, permitiendo a CSDROP rastrear el tráfico atribuido a cada integración. SocialPro coordinó el brief creativo, el calendario de publicación y el seguimiento de cada acción, garantizando coherencia entre el mensaje de marca y el estilo habitual de cada streamer. La campaña cubrió los mercados de España y LATAM, con foco en la comunidad de CS2 en español.',
        sortOrder: 2,
      },
    ],
    tags: [
      'CS2 Skins', 'Twitch', 'España', 'LATAM', '2 creadores',
    ],
    creatorNames: [
      { name: 'Poker',   talentSlug: null   },
      { name: 'JoluCS2', talentSlug: 'jolu' },
    ],
  },
];

// ─── INSERCIÓN ───────────────────────────────────────────────────────────────

async function main() {
  console.log('Inserting new case studies...\n');

  // Recopilar todos los talent slugs que necesitamos resolver
  const allSlugs = CASES.flatMap((c) =>
    c.creatorNames.map((cr) => cr.talentSlug).filter((s): s is string => s !== null)
  );
  const uniqueSlugs = [...new Set(allSlugs)];

  // Resolver slugs → IDs en un solo query
  const talentRows =
    uniqueSlugs.length > 0
      ? await db
          .select({ id: schema.talents.id, slug: schema.talents.slug })
          .from(schema.talents)
          .where(inArray(schema.talents.slug, uniqueSlugs))
      : [];

  const slugToId = new Map(talentRows.map((t) => [t.slug, t.id]));
  console.log(`Resolved ${talentRows.length}/${uniqueSlugs.length} talent slugs to IDs`);

  for (const c of CASES) {
    // Comprobar si el slug ya existe (idempotencia)
    const existing = await db
      .select({ id: schema.caseStudies.id })
      .from(schema.caseStudies)
      .where(eq(schema.caseStudies.slug, c.slug))
      .limit(1);

    if (existing[0]) {
      console.log(`  SKIP: ${c.slug} — already exists (id=${existing[0].id})`);
      continue;
    }

    // Insertar case study principal
    const [inserted] = await db
      .insert(schema.caseStudies)
      .values({
        slug: c.slug,
        brandName: c.brandName,
        title: c.title,
        logoUrl: c.logoUrl,
        sortOrder: c.sortOrder,
        reach: c.reach,
        engagementRate: c.engagementRate,
        conversions: c.conversions,
        roiMultiplier: c.roiMultiplier,
        heroImageUrl: c.heroImageUrl,
        excerpt: c.excerpt,
        spokespersonQuote: c.spokespersonQuote,
        spokespersonName: c.spokespersonName,
        spokespersonRole: c.spokespersonRole,
        campaignPeriod: c.campaignPeriod,
        keyTakeaways: c.keyTakeaways,
        isPublished: true,
      })
      .returning({ id: schema.caseStudies.id });

    const caseId = inserted.id;

    // Insertar párrafos del body
    await db.insert(schema.caseBody).values(
      c.body.map((p) => ({ caseId, paragraph: p.paragraph, sortOrder: p.sortOrder }))
    );

    // Insertar tags
    await db.insert(schema.caseTags).values(
      c.tags.map((tag) => ({ caseId, tag }))
    );

    // Insertar creadores (resolviendo talentId si existe)
    await db.insert(schema.caseCreators).values(
      c.creatorNames.map((cr) => ({
        caseId,
        creatorName: cr.name,
        talentId: cr.talentSlug !== null ? (slugToId.get(cr.talentSlug) ?? null) : null,
      }))
    );

    console.log(
      `  OK: ${c.slug} — ${c.body.length} párrafos, ${c.tags.length} tags, ${c.creatorNames.length} creadores`
    );
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
