'server-only';

/**
 * Fallback determinista para generación de SEO bios.
 * Activo cuando Gemini no está disponible o falla per-profile.
 *
 * Variación estructural real:
 *  - 5 tipos de creador (igaming, cs2fps, valorant, youtube_first, twitch_first, variety)
 *  - 4 variantes de estructura por tipo (igaming/cs2fps) · 3 para los demás
 *  - Sección de ancla única por variante → garantiza bigrams distintos
 *  - FAQ sugeridas basadas en los datos disponibles (display-only, no DB)
 */

import type { BioBatchInput } from './biosBatch';

export type DeterministicResult = {
  bio:            string;
  seoTitle:       string;
  seoDesc:        string;
  keywords:       string[];
  faqSuggestions: string[];
};

// ── Creator type classification ───────────────────────────────────────────────

type CreatorType = 'igaming' | 'cs2fps' | 'valorant' | 'youtube_first' | 'twitch_first' | 'variety';

const IGAMING_BRAND_RE =
  /casino|bet|apuest|skin(s|club|place|monkey|\.io)?|rollbit|hypedrop|farmskins|keysino|empire|clash\.gg|packdraw|codashop|keydrop|skinplace/i;

export function classifyCreator(input: BioBatchInput): CreatorType {
  const game = input.game.toLowerCase();
  const tags = input.tags.map(t => t.toLowerCase());
  if (input.activeBrands.some(b => IGAMING_BRAND_RE.test(b))) return 'igaming';
  if (game.includes('valorant'))                                return 'valorant';
  if (
    game.includes('cs2') || game.includes('counter') ||
    game.includes('csgo') || tags.includes('cs2')
  ) return 'cs2fps';
  if (input.platform === 'youtube') return 'youtube_first';
  if (input.platform === 'twitch')  return 'twitch_first';
  return 'variety';
}

// ── Deterministic variant (FNV + type-aware count) ────────────────────────────

export function variantOf(seed: string, count: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h % count;
}

/** Build a high-entropy seed that distinguishes profiles with the same game/platform. */
function buildVariantSeed(input: BioBatchInput): string {
  // Include brands (most differentiating factor between similar profiles)
  const brands = [...input.activeBrands].sort().join('|');
  // Include primary social follower count (unique per profile)
  const primary = input.socials.find(s => s.platform === input.platform && validFollowers(s));
  const followers = primary?.followersDisplay ?? '';
  return `${input.slug}::${input.platform}::${brands}::${followers}`;
}

function numVariants(type: CreatorType): number {
  return type === 'igaming' || type === 'cs2fps' ? 4 : 3;
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function pDisplay(platform: string): string {
  const m: Record<string, string> = {
    twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick',
    instagram: 'Instagram', tiktok: 'TikTok', x: 'X',
  };
  return m[platform.toLowerCase()] ?? platform;
}

function validFollowers(s: { followersDisplay: string }): boolean {
  return !!s.followersDisplay && !['—', '-', '', '0'].includes(s.followersDisplay);
}

function primarySocial(input: BioBatchInput) {
  return input.socials.find(s => s.platform === input.platform && validFollowers(s)) ??
         input.socials.find(s => validFollowers(s)) ?? null;
}

function secondaryPlatforms(input: BioBatchInput): string {
  const others = input.socials
    .filter(s => s.platform !== input.platform && validFollowers(s))
    .map(s => pDisplay(s.platform));
  if (others.length === 0) return '';
  return ` También tiene actividad en ${others.join(' y ')}.`;
}

// ── Section builders ──────────────────────────────────────────────────────────
// v = variant index (0..3). Sections return null if no data to fill.

function sIntro(input: BioBatchInput, v: number): string {
  const pd   = pDisplay(input.platform);
  const role = input.role2 ? `${input.role} y ${input.role2}` : input.role;
  const bio  = input.bio?.trim().replace(/\s+/g, ' ') ?? '';
  const excerpt = bio.length > 10
    ? ' ' + bio.slice(0, 160).replace(/\s\w+$/, '') + (bio.length > 160 ? '...' : '')
    : '';

  const lines = [
    `${input.name} es un ${role} especializado en ${input.game} con presencia activa en ${pd}.${excerpt}`,
    `Conocido en la escena hispanohablante de ${input.game}, ${input.name} es un ${role} que comparte su contenido en ${pd}.${excerpt}`,
    `${input.name} forma parte de la comunidad de ${input.game} en español como ${role} con canal principal en ${pd}.${excerpt}`,
    `Como ${role} de ${input.game}, ${input.name} construye su audiencia en ${pd} con un enfoque genuino hacia su comunidad hispanohablante.${excerpt}`,
  ];
  return lines[v % lines.length] ?? '';
}

function sPlatform(input: BioBatchInput, v: number): string | null {
  const primary = primarySocial(input);
  if (!primary) return null;
  const pd = pDisplay(primary.platform);

  const lines = [
    `Su canal de ${pd} cuenta con ${primary.followersDisplay} seguidores, donde publica contenido de ${input.game} con regularidad.`,
    `En ${pd}, ${input.name} ha reunido ${primary.followersDisplay} seguidores interesados en su contenido de ${input.game}.`,
    `Con ${primary.followersDisplay} seguidores en ${pd}, ${input.name} mantiene una presencia activa y constante.`,
    `Su comunidad de ${primary.followersDisplay} en ${pd} crece alrededor del contenido de ${input.game} que ${input.name} produce cada semana.`,
  ];
  return lines[v % lines.length] ?? '';
}

function sCommunity(input: BioBatchInput, v: number): string {
  const country = input.creatorCountry;
  const ctryNames: Record<string, string> = {
    ES: 'España', MX: 'México', AR: 'Argentina', CO: 'Colombia',
    CL: 'Chile', PE: 'Perú', VE: 'Venezuela', UY: 'Uruguay',
  };
  const ctryName = country ? ctryNames[country.toUpperCase()] ?? null : null;
  const geo = ctryName ? ` desde ${ctryName}` : '';
  const extra = secondaryPlatforms(input);
  const lang = input.audienceLanguage ? ` Su público habla principalmente ${input.audienceLanguage}.` : '';

  const lines = [
    `Sus seguidores encuentran en ${input.name}${geo} una referencia cercana dentro de la escena hispanohablante de ${input.game}.${extra}${lang}`,
    `La relación entre ${input.name} y su audiencia${geo} se construye en torno al contenido de ${input.game} que comparte habitualmente.${extra}`,
    `Quienes siguen a ${input.name}${geo} valoran su constancia y su enfoque genuino hacia el mundo de ${input.game}.${extra}${lang}`,
    `La comunidad de ${input.name}${geo} se organiza alrededor de su contenido de ${input.game}, formando un espacio activo para jugadores hispanohablantes.${extra}`,
  ];
  return lines[v % lines.length] ?? '';
}

function sAnchor(input: BioBatchInput, type: CreatorType, v: number): string {
  // Anchor paragraph: high-variance vocabulary tied to creator+type+variant
  // This section is the main defence against cross-profile Jaccard similarity.
  const pd = pDisplay(input.platform);

  const anchorsByType: Record<CreatorType, string[]> = {
    igaming: [
      `${input.name} combina sus directos de ${input.game} con actividades para su comunidad, incluyendo sorteos y acceso a plataformas del ecosistema de skins y gaming competitivo.`,
      `El perfil de ${input.name} dentro de la escena hispanohablante se define tanto por su nivel de juego en ${input.game} como por su capacidad de conectar con marcas y ofrecer experiencias adicionales a sus seguidores.`,
      `Dentro del ecosistema de ${input.game} en ${pd}, ${input.name} destaca por integrar el entretenimiento en vivo con propuestas comerciales de valor para su audiencia.`,
      `${input.name} aporta al mundo del gaming hispano una mezcla de contenido competitivo en ${input.game} y colaboraciones con plataformas que su comunidad ya conoce y utiliza.`,
    ],
    cs2fps: [
      `El universo competitivo de ${input.game} en español cuenta con creadores como ${input.name}, que documentan la evolución del juego desde la perspectiva del jugador hispano.`,
      `${input.name} contribuye a la escena de ${input.game} en castellano con un tipo de contenido que va más allá de las partidas, generando conversación y comunidad alrededor del título.`,
      `La comunidad hispanohablante de ${input.game} encuentra en ${input.name} un creador que refleja los valores del jugador competitivo con un formato accesible y directo.`,
      `En el contexto del gaming competitivo en español, ${input.name} ocupa un espacio propio dentro de ${input.game}, ofreciendo perspectivas auténticas sobre el juego y su entorno.`,
    ],
    valorant: [
      `La escena de ${input.game} en español cuenta con ${input.name} como uno de sus creadores activos, documentando el juego táctico desde una perspectiva hispanohablante.`,
      `${input.name} aporta al ecosistema de ${input.game} en castellano con contenido que abarca desde el juego ranked hasta el análisis táctico del shooter de Riot Games.`,
      `El contenido de ${input.name} sobre ${input.game} refleja la madurez de la escena hispana del juego, que ha crecido significativamente en los últimos años en ${pd}.`,
    ],
    youtube_first: [
      `En YouTube, ${input.name} aprovecha el formato de vídeo para presentar ${input.game} de manera más elaborada que en plataformas de streaming en directo.`,
      `El canal de ${input.name} en YouTube representa una propuesta pensada para quienes prefieren el formato bajo demanda, con vídeos centrados en ${input.game}.`,
      `${input.name} ha encontrado en YouTube el espacio idóneo para desarrollar contenido de ${input.game} con mayor profundidad y alcance entre la audiencia hispana.`,
    ],
    twitch_first: [
      `Los directos de ${input.name} en Twitch son el corazón de su propuesta creativa, donde el chat y la interacción en tiempo real definen la experiencia de ${input.game}.`,
      `Twitch le permite a ${input.name} construir una relación directa con su audiencia a través de sesiones en vivo de ${input.game} que generan comunidad activa.`,
      `El formato live de Twitch es el escenario natural de ${input.name}, donde el dinamismo de ${input.game} y la participación del chat crean una experiencia única.`,
    ],
    variety: [
      `La propuesta de ${input.name} dentro del gaming hispano es amplia: ${input.game} como eje central con espacio para explorar otros géneros según las tendencias de su comunidad.`,
      `${input.name} representa el tipo de creador que no se limita a un solo título, usando ${input.game} como punto de partida para un catálogo variado de contenido gaming en español.`,
      `La versatilidad de ${input.name} le permite adaptarse a lo que su comunidad demanda, manteniendo ${input.game} como referente habitual dentro de una oferta de contenido diversa.`,
    ],
  };

  const options = anchorsByType[type];
  return options[v % options.length] ?? '';
}

function sContent(input: BioBatchInput, type: CreatorType, v: number): string | null {
  const tags = input.tags.filter(t =>
    !['gaming', 'stream', 'streamer', 'content', 'youtube', 'twitch'].includes(t.toLowerCase())
  );
  const tagsSuffix = tags.length >= 2
    ? ` Sus contenidos incluyen temáticas como: ${tags.slice(0, 3).join(', ')}.`
    : '';

  const lines: Record<CreatorType, string[]> = {
    igaming: [
      `Produce contenido de ${input.game} que combina partidas, análisis y momentos de entretenimiento pensados para su audiencia.${tagsSuffix}`,
      `Su contenido de ${input.game} mezcla el juego competitivo con secciones de entretenimiento y engagement activo con su comunidad.${tagsSuffix}`,
      `En sus emisiones y vídeos de ${input.game}, ${input.name} alterna entre el juego serio y los momentos más distendidos que su comunidad disfruta.${tagsSuffix}`,
      `${input.name} crea contenido de ${input.game} estructurado para ser accesible y entretenido, cubriendo desde partidas hasta formatos especiales.${tagsSuffix}`,
    ],
    cs2fps: [
      `Produce contenido de ${input.game} centrado en el juego competitivo, con sesiones de alto nivel y análisis de mecánicas.${tagsSuffix}`,
      `Su contenido de ${input.game} abarca desde partidas hasta momentos destacados y guías orientadas al jugador comprometido.${tagsSuffix}`,
      `${input.name} documenta su experiencia en ${input.game} con una mezcla de partidas competitivas y contenido más accesible para su comunidad.${tagsSuffix}`,
      `En sus emisiones de ${input.game}, ${input.name} comparte tanto su nivel de juego como la visión interna de un jugador dedicado a la escena.${tagsSuffix}`,
    ],
    valorant: [
      `Su contenido de ${input.game} combina ranked, análisis tácticos y sesiones con su comunidad en ${pDisplay(input.platform)}.${tagsSuffix}`,
      `Crea contenido de ${input.game} con un enfoque en la táctica y el juego competitivo, adaptado para el público hispanohablante.${tagsSuffix}`,
      `En ${input.game}, ${input.name} ofrece perspectivas del juego ranked y formatos de entretenimiento para su audiencia en español.${tagsSuffix}`,
    ],
    youtube_first: [
      `Su canal de YouTube combina vídeos de ${input.game} con formatos complementarios pensados para su audiencia.${tagsSuffix}`,
      `Publica vídeos editados de ${input.game} junto a contenido adicional adaptado a las preferencias de su comunidad en YouTube.${tagsSuffix}`,
      `En YouTube, ${input.name} produce contenido de ${input.game} con un acabado cuidado y formatos que funcionan bien en demanda.${tagsSuffix}`,
    ],
    twitch_first: [
      `En Twitch, ${input.name} transmite ${input.game} en directo con énfasis en la interacción con el chat.${tagsSuffix}`,
      `Sus directos de Twitch de ${input.game} combinan alto nivel de juego con una comunidad activa en el chat.${tagsSuffix}`,
      `El formato live de Twitch define el contenido de ${input.name}, donde ${input.game} y la audiencia participan juntos.${tagsSuffix}`,
    ],
    variety: [
      `Publica contenido de ${input.game} junto a otros títulos, ofreciendo a su comunidad una propuesta gaming variada.${tagsSuffix}`,
      `${input.name} cubre ${input.game} como título principal y amplía su catálogo hacia otros juegos según los intereses de su audiencia.${tagsSuffix}`,
      `Su propuesta de contenido pone el foco en ${input.game} sin cerrar la puerta a explorar otros géneros con su comunidad.${tagsSuffix}`,
    ],
  };

  const options = lines[type];
  return options[v % options.length] ?? '';
}

function sCommercial(input: BioBatchInput, v: number): string | null {
  const brands    = input.activeBrands;
  const giveaways = input.activeGiveaways;
  if (brands.length === 0 && giveaways === 0) return null;

  const brandList = brands.slice(0, 3).join(', ');
  const gvNote    = giveaways > 0
    ? (giveaways === 1 ? 'un sorteo activo' : `${giveaways} sorteos activos`)
    : null;

  const lines = [
    brands.length > 0
      ? `Colabora con ${brandList}${gvNote ? `, y actualmente tiene ${gvNote} disponibles para su comunidad` : ''}.`
      : `Actualmente tiene ${gvNote} para su comunidad.`,

    brands.length > 0
      ? `${input.name} trabaja junto a ${brandList}${gvNote ? ` y organiza sorteos periódicos para sus seguidores` : ''}.`
      : `Organiza sorteos con premios exclusivos para los miembros más activos de su comunidad.`,

    brands.length > 0
      ? `La colaboración de ${input.name} con ${brandList} le permite ${gvNote ? `organizar ${gvNote} y ` : ''}ofrecer acceso a plataformas de interés para su audiencia.`
      : `Organiza sorteos con premios reales para su comunidad de seguidores.`,

    brands.length > 0
      ? `Su relación activa con ${brandList} se traduce en ${gvNote ? `sorteos y ` : ''}contenido adicional de valor para quienes le siguen.`
      : `Periódicamente organiza sorteos y actividades especiales para premiar a su comunidad.`,
  ];
  return lines[v % lines.length] ?? '';
}

function sAgency(input: BioBatchInput, v: number): string {
  const lines = [
    `${input.name} está representado por SocialPro, agencia de gaming y esports especializada en talentos del mercado hispanohablante.`,
    `Trabaja con SocialPro, agencia de talentos gaming, que gestiona sus colaboraciones y proyectos con marcas del sector.`,
    `Forma parte del catálogo de creadores de SocialPro, agencia especializada en gaming y esports en español.`,
    `SocialPro representa a ${input.name} en sus proyectos comerciales, aportando estructura y oportunidades dentro del ecosistema gaming hispano.`,
  ];
  return lines[v % lines.length] ?? '';
}

function sClosing(input: BioBatchInput, type: CreatorType, v: number): string {
  const pd = pDisplay(input.platform);
  const codeHint = type === 'igaming' && input.activeBrands.length > 0
    ? ` Consulta los códigos disponibles en su canal para acceder a plataformas y sorteos exclusivos.`
    : '';

  const lines = [
    `Síguele en ${pd} para estar al tanto de sus transmisiones y novedades.${codeHint}`,
    `Puedes seguir a ${input.name} en ${pd} para no perderte su contenido de ${input.game} y sus últimas novedades.${codeHint}`,
    `Entra en su canal de ${pd} para conocer su contenido y unirte a una comunidad activa de ${input.game}.${codeHint}`,
    `Su canal en ${pd} es el punto de encuentro de su comunidad: síguele para no perder nada de su actividad.${codeHint}`,
  ];
  return lines[v % lines.length] ?? '';
}

// ── Structural variants ────────────────────────────────────────────────────────
// Sections that return null are skipped automatically.
// anchor is always included to ensure bigram diversity.

type SectionKey = 'intro' | 'platform' | 'community' | 'anchor' | 'content' | 'commercial' | 'agency' | 'closing';

const STRUCTURES: Record<CreatorType, SectionKey[][]> = {
  igaming: [
    ['intro', 'platform', 'anchor', 'commercial', 'community', 'content', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'commercial', 'platform', 'agency', 'closing'],
    ['intro', 'anchor', 'commercial', 'platform', 'community', 'content', 'agency', 'closing'],
    ['intro', 'commercial', 'anchor', 'community', 'platform', 'content', 'agency', 'closing'],
  ],
  cs2fps: [
    ['intro', 'platform', 'anchor', 'content', 'community', 'commercial', 'agency', 'closing'],
    ['intro', 'content', 'anchor', 'platform', 'community', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'platform', 'content', 'commercial', 'agency', 'closing'],
    ['intro', 'anchor', 'content', 'platform', 'community', 'commercial', 'agency', 'closing'],
  ],
  valorant: [
    ['intro', 'content', 'anchor', 'platform', 'community', 'commercial', 'agency', 'closing'],
    ['intro', 'platform', 'anchor', 'community', 'content', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'content', 'platform', 'commercial', 'agency', 'closing'],
  ],
  youtube_first: [
    ['intro', 'platform', 'anchor', 'content', 'community', 'commercial', 'agency', 'closing'],
    ['intro', 'content', 'anchor', 'community', 'platform', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'platform', 'content', 'commercial', 'agency', 'closing'],
  ],
  twitch_first: [
    ['intro', 'platform', 'anchor', 'community', 'content', 'commercial', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'platform', 'content', 'agency', 'closing'],
    ['intro', 'content', 'anchor', 'platform', 'community', 'commercial', 'agency', 'closing'],
  ],
  variety: [
    ['intro', 'platform', 'anchor', 'content', 'community', 'commercial', 'agency', 'closing'],
    ['intro', 'community', 'anchor', 'content', 'platform', 'agency', 'closing'],
    ['intro', 'content', 'anchor', 'community', 'platform', 'commercial', 'agency', 'closing'],
  ],
};

// ── Keywords ───────────────────────────────────────────────────────────────────

function buildKeywords(input: BioBatchInput, type: CreatorType): string[] {
  const name = input.name.toLowerCase();
  const pd   = pDisplay(input.platform).toLowerCase();
  const kws: Set<string> = new Set();

  kws.add(input.name);
  kws.add(`${input.name} ${input.game}`);
  kws.add(`${input.name} ${pd}`);
  kws.add(`${input.name} streamer`);
  kws.add(`${name} en directo`);
  kws.add(`${input.game} en español`);
  kws.add(`streamer de ${input.game}`);
  kws.add(`creador de contenido ${input.game}`);

  if (type === 'cs2fps') {
    kws.add(`${input.game} hispano`);
    kws.add(`${input.game} español`);
    kws.add('skins CS2');
  }
  if (type === 'valorant') {
    kws.add('Valorant España');
    kws.add('Valorant hispanohablante');
  }
  if (type === 'igaming') {
    for (const b of input.activeBrands.slice(0, 3)) {
      kws.add(`código ${b}`);
      kws.add(`sorteo ${b}`);
    }
    kws.add('sorteos gaming');
    kws.add('códigos gaming');
  }

  if (input.platform === 'twitch') kws.add(`ver ${input.name} en twitch`);
  if (input.platform === 'twitch') kws.add('directo twitch gaming');
  if (input.platform === 'youtube') kws.add(`canal de ${input.name}`);
  if (input.platform === 'youtube') kws.add(`${input.name} youtube`);

  if (input.creatorCountry) {
    const ctry: Record<string, string> = {
      ES: 'España', MX: 'México', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Perú',
    };
    const cn = ctry[input.creatorCountry.toUpperCase()];
    if (cn) { kws.add(`${input.name} ${cn}`); kws.add(`gaming ${cn}`); }
  }

  for (const t of input.tags.slice(0, 3)) kws.add(t.toLowerCase());

  return [...kws].slice(0, 15);
}

// ── FAQ suggestions ────────────────────────────────────────────────────────────

function buildFaqSuggestions(input: BioBatchInput): string[] {
  const faqs = [
    `¿Quién es ${input.name}?`,
    `¿Dónde puedo ver a ${input.name} en directo?`,
    `¿Qué juego transmite ${input.name}?`,
  ];
  if (input.activeBrands.length > 0) {
    faqs.push(`¿Cuáles son los códigos de ${input.name}?`);
    faqs.push(`¿Tiene ${input.name} descuentos o códigos activos?`);
  }
  if (input.activeGiveaways > 0) {
    faqs.push(`¿Cómo participar en los sorteos de ${input.name}?`);
  }
  const primary = primarySocial(input);
  if (primary) {
    faqs.push(`¿Cuántos seguidores tiene ${input.name} en ${pDisplay(primary.platform)}?`);
  }
  faqs.push(`¿Qué agencia representa a ${input.name}?`);
  return faqs.slice(0, 6);
}

// ── SEO title & description ────────────────────────────────────────────────────

function buildSeoTitle(input: BioBatchInput, _type: CreatorType): string {
  const pd = pDisplay(input.platform);
  const cv = variantOf(buildVariantSeed(input) + 't', 4);
  const candidates = [
    `${input.name} — ${input.role} de ${input.game} en ${pd}`,
    `${input.name} | ${input.game} ${pd} — SocialPro`,
    `${input.name}: ${input.role} de ${input.game}`,
    `${input.name} · ${input.game} en ${pd} · SocialPro`,
  ];
  const raw = candidates[cv % candidates.length] ?? '';
  return raw.length <= 65 ? raw : raw.slice(0, 62) + '...';
}

function buildSeoDesc(input: BioBatchInput): string {
  const pd      = pDisplay(input.platform);
  const primary = primarySocial(input);
  const flw     = primary ? ` ${primary.followersDisplay} seguidores.` : '';
  const brand   = input.activeBrands.length > 0 ? ` Códigos y sorteos de ${input.activeBrands[0]}.` : '';
  const cv      = variantOf(buildVariantSeed(input) + 'd', 4);

  const candidates = [
    `${input.name}, ${input.role} de ${input.game} en ${pd}.${flw}${brand} Representado por SocialPro.`,
    `Sigue a ${input.name} en ${pd}, creador de ${input.game} en español.${brand} Representado por SocialPro.`,
    `${input.name} — ${input.game} en ${pd}.${flw}${brand} Agencia SocialPro.`,
    `Descubre a ${input.name}, ${input.role} de ${input.game} en ${pd}.${flw}${brand} SocialPro.`,
  ];
  const raw = candidates[cv % candidates.length] ?? '';
  return raw.length <= 155 ? raw : raw.slice(0, 152) + '...';
}

// ── Main generator ─────────────────────────────────────────────────────────────

export function generateDeterministicBio(input: BioBatchInput): DeterministicResult {
  const type    = classifyCreator(input);
  const nv      = numVariants(type);
  const v       = variantOf(buildVariantSeed(input), nv);
  const struct  = STRUCTURES[type][v] ?? [];

  const sectionMap: Record<SectionKey, () => string | null> = {
    intro:      () => sIntro(input, v),
    platform:   () => sPlatform(input, v),
    community:  () => sCommunity(input, v),
    anchor:     () => sAnchor(input, type, v),
    content:    () => sContent(input, type, v),
    commercial: () => sCommercial(input, v),
    agency:     () => sAgency(input, v),
    closing:    () => sClosing(input, type, v),
  };

  const paragraphs = struct
    .map(k => sectionMap[k]())
    .filter((p): p is string => p !== null && p.trim().length > 0);

  const bio            = paragraphs.join('\n\n');
  const seoTitle       = buildSeoTitle(input, type);
  const seoDesc        = buildSeoDesc(input);
  const keywords       = buildKeywords(input, type);
  const faqSuggestions = buildFaqSuggestions(input);

  return { bio, seoTitle, seoDesc, keywords, faqSuggestions };
}
