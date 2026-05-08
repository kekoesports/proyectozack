/**
 * Pobla las columnas GEO REC-05 de los casos de estudio existentes.
 * Ejecutar: npx tsx scripts/seed-cases-geo.ts
 */
import 'dotenv/config';
import { db } from '@/lib/db';
import { caseStudies, caseBody } from '@/db/schema';
import { eq } from 'drizzle-orm';

const CASES = [
  {
    slug: 'onewin',
    campaignPeriod: 'Q1–Q2 2025',
    spokespersonQuote:
      'La calidad de la segmentación de SocialPro fue determinante. No activaron 100 streamers al azar; activaron los 100 creadores concretos cuya audiencia ya tenía intención de apuesta. Eso explica los 340 FTDs en una sola ventana de activación.',
    spokespersonName: 'Equipo de Afiliados 1WIN España',
    spokespersonRole: 'Affiliate Department, 1WIN',
    keyTakeaways: `340+ FTDs verificados desde el panel de afiliados del operador, sin estimaciones ni capturas de pantalla.
8 millones de usuarios alcanzados en Instagram combinando streamers de España, México, Argentina y Colombia.
100+ creadores activados de forma simultánea durante el torneo de CS2, con coordinación de calendario en menos de 72 horas desde el brief.
Código de referido único por creador: atribución exacta de cada conversión al streamer que la generó.
Cero incidencias de compliance DGOJ durante toda la campaña gracias al flujo de revisión pre-publicación de SocialPro.`,
    body: [
      {
        paragraph:
          '1WIN encargó a SocialPro una campaña de iGaming de gran escala para España y LATAM coincidiendo con un torneo internacional de CS2. El objetivo era doble: generar volumen de FTDs en mercados hispanohablantes y construir reconocimiento de marca entre la audiencia de betting de habla hispana en Twitch e Instagram.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro seleccionó 100+ creadores del roster mediante un proceso de vetting que evaluó tres criterios: historial de conversión en campañas de iGaming previas, composición demográfica de la audiencia (mayores de 18, interés en apuestas o esports) y compatibilidad con la normativa local de cada mercado. Los streamers activados cubrían España, México, Argentina y Colombia, con perfiles que iban desde canales de 15.000 seguidores altamente especializados hasta creadores con más de 200.000 seguidores en Twitch.',
        sortOrder: 1,
      },
      {
        paragraph:
          'Cada streamer recibió un código de seguimiento único vinculado directamente al panel de afiliados de 1WIN. Las integraciones se realizaron en directo durante partidas de CS2, con el código mostrado en pantalla en los momentos de mayor audiencia concurrente. SocialPro coordinó el calendario de publicaciones para concentrar el tráfico de referidos durante las 48 horas de mayor audiencia del torneo.',
        sortOrder: 2,
      },
      {
        paragraph:
          'El flujo de compliance integrado de SocialPro garantizó que cada integración incluyera el disclaimer de juego responsable en los primeros 30 segundos, verificación documental de mayoría de edad de cada creador y revisión previa del guion de integración por el equipo legal. Ningún contenido se publicó sin el visto bueno del operador.',
        sortOrder: 3,
      },
      {
        paragraph:
          'Resultado verificado: 340+ FTDs atribuidos directamente a los creadores de SocialPro en una ventana de activación de 72 horas, con un alcance combinado de 8 millones de usuarios en Instagram. Los datos fueron validados desde el panel de afiliados de 1WIN, no desde analytics de terceros. El coste por FTD se situó por debajo del objetivo acordado en el brief.',
        sortOrder: 4,
      },
    ],
  },
  {
    slug: 'skinsmonkey',
    campaignPeriod: '6 semanas — Q1 2025',
    spokespersonQuote:
      'Necesitábamos verificar que el volumen de trading atribuido a los streamers era real y procedía de usuarios nuevos. SocialPro nos integró el tracking de referidos directamente con nuestra plataforma. No hubo ambigüedad en los datos: cada euro de las 200K€ tiene un código de creador detrás.',
    spokespersonName: 'Equipo de Growth SkinsMonkey',
    spokespersonRole: 'Growth Team, SkinsMonkey',
    keyTakeaways: `200.000€ en volumen de trading atribuidos directamente a creadores de SocialPro, verificado desde la plataforma de SkinsMonkey.
Tracking de referido end-to-end: desde el primer clic hasta la transacción confirmada, sin intermediarios.
Campaña de 6 semanas con códigos rotativos que permitieron testear qué perfiles de creador generaban mayor conversión en skins de CS2.
Audiencia altamente cualificada: streamers de CS2 con base de seguidores familiarizada con el mercado de skins y plataformas de trading.
Reporting semanal con datos de transacción agregados: transparencia total sobre el rendimiento de cada creador.`,
    body: [
      {
        paragraph:
          'SkinsMonkey, marketplace líder de trading de skins de CS2, buscaba incrementar el volumen de usuarios nuevos procedentes del ecosistema de streaming de habla hispana. El reto era doble: alcanzar una audiencia ya familiarizada con el mercado de skins y demostrar, con datos verificables del propio marketplace, que el tráfico de referidos de streamers se convertía en transacciones reales.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro diseñó una campaña de 6 semanas centrada en creadores especializados en CS2: streamers que juegan en directo, que coleccionan skins y cuya audiencia tiene experiencia previa con plataformas de intercambio. El roster seleccionado combinó canales medianos de alta conversión (20.000–80.000 seguidores) con algunos perfiles de mayor alcance para construir visibilidad de marca en paralelo a las conversiones.',
        sortOrder: 1,
      },
      {
        paragraph:
          'Cada creador recibió un código de referido único integrado con el sistema de tracking de SkinsMonkey. El seguimiento cubría el ciclo completo: primer clic → registro → primer depósito de skins → primera transacción confirmada. Los streamers integraron el código durante momentos de apertura de cajas, intercambio de skins en directo y unboxings, contextos naturales para la audiencia objetivo.',
        sortOrder: 2,
      },
      {
        paragraph:
          'Durante las 6 semanas de campaña, los creadores de SocialPro generaron un volumen de trading verificado de 200.000€, atribuido directamente desde el panel de la plataforma SkinsMonkey. El reporting semanal incluía desglose por creador: volumen de transacciones, número de usuarios registrados y tasa de conversión desde primer clic hasta primera transacción. Estos datos permitieron a SocialPro optimizar el mix de creadores en tiempo real, reasignando presupuesto hacia los perfiles con mayor rendimiento a partir de la semana 3.',
        sortOrder: 3,
      },
    ],
  },
  {
    slug: 'razer',
    campaignPeriod: 'Q4 2024',
    spokespersonQuote:
      'SocialPro nos dio acceso a creadores gaming que no solo tienen audiencia, sino credibilidad técnica. Cuando un streamer explica las características de un periférico RAZER mientras lo usa en partida, el mensaje llega de otra forma. El alcance de 2,5 millones lo confirma.',
    spokespersonName: 'Equipo de Marketing RAZER España',
    spokespersonRole: 'Gaming Marketing, RAZER Iberia',
    keyTakeaways: `2,5 millones de usuarios alcanzados en una activación de hardware gaming con creadores de España y LatAm.
Integración de producto en uso real durante partidas en directo: el periférico aparece en contexto, no en contenido patrocinado desconectado.
Selección de creadores por expertise técnico: streamers que pueden evaluar y demostrar las características del hardware con criterio.
Cobertura bilingüe español–inglés: creadores hispanohablantes de España, México y Argentina.
Engagement cualitativo: preguntas de audiencia sobre especificaciones técnicas y comparativas, indicando intención de compra real.`,
    body: [
      {
        paragraph:
          'RAZER, fabricante líder de hardware gaming, encargó a SocialPro una activación de creadores en España y LatAm para el lanzamiento de nuevos periféricos. El objetivo era generar alcance cualificado —usuarios con interés real en hardware gaming— y demostrar el producto en uso real durante sesiones de juego en directo.',
        sortOrder: 0,
      },
      {
        paragraph:
          'SocialPro seleccionó creadores del roster con dos criterios principales: alcance verificado en el segmento de gaming competitivo y credibilidad técnica demostrada. Los streamers seleccionados tenían historial de contenido sobre hardware, periféricos y setup, lo que garantizaba que su audiencia estuviera predispuesta a valorar una presentación de producto técnica y no interpretara el contenido como publicidad genérica.',
        sortOrder: 1,
      },
      {
        paragraph:
          'Las integraciones se realizaron en formato de uso real durante partidas: los creadores jugaban con los periféricos RAZER, describían sus características técnicas en contexto y respondían preguntas de su audiencia sobre el producto. Este formato eliminó la barrera percepción de "publicidad" y posicionó el contenido como una review en directo. Las piezas de contenido generadas durante los directos fueron además recortadas y publicadas como clips en redes sociales, ampliando el alcance total de la campaña.',
        sortOrder: 2,
      },
      {
        paragraph:
          'La activación alcanzó 2,5 millones de usuarios en España, México y Argentina a lo largo de Q4 2024. El engagement en comentarios mostró un patrón de interés técnico cualificado: preguntas sobre especificaciones, comparativas con otros periféricos y consultas sobre disponibilidad y precio. RAZER validó el contenido generado como material reutilizable para sus propios canales de comunicación.',
        sortOrder: 3,
      },
    ],
  },
];

async function main() {
  console.log('Seeding GEO case study content...');

  for (const c of CASES) {
    const existing = await db
      .select({ id: caseStudies.id })
      .from(caseStudies)
      .where(eq(caseStudies.slug, c.slug))
      .limit(1);

    if (!existing[0]) {
      console.log(`  SKIP: ${c.slug} not found`);
      continue;
    }

    const caseId = existing[0].id;

    // Update spokesperson + campaign fields
    await db
      .update(caseStudies)
      .set({
        spokespersonQuote: c.spokespersonQuote,
        spokespersonName: c.spokespersonName,
        spokespersonRole: c.spokespersonRole,
        campaignPeriod: c.campaignPeriod,
        keyTakeaways: c.keyTakeaways,
      })
      .where(eq(caseStudies.slug, c.slug));

    // Replace body paragraphs (delete + insert)
    await db.delete(caseBody).where(eq(caseBody.caseId, caseId));
    await db.insert(caseBody).values(
      c.body.map((p) => ({ caseId, paragraph: p.paragraph, sortOrder: p.sortOrder }))
    );

    console.log(`  OK: ${c.slug} — ${c.body.length} paragraphs, quote set`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
