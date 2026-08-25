export const CS2_CAMPAIGN_TYPES = ['marketplace', 'case-gambling'] as const;
export type Cs2CampaignType = (typeof CS2_CAMPAIGN_TYPES)[number];

export const CS2_SEARCH_MARKETS = [
  'GLOBAL',
  'ES',
  'GB',
  'PT',
  'DE',
  'SE',
  'DK',
  'CO',
  'PE',
  'FR',
] as const;
export type Cs2SearchMarket = (typeof CS2_SEARCH_MARKETS)[number];

export const TARGET_LANGUAGES = ['any', 'es', 'en', 'pt', 'de', 'fr'] as const;
export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

export type Cs2MarketAssessmentStatus =
  | 'marketplace-scope-only'
  | 'operator-check-required'
  | 'manual-review'
  | 'restricted';

export type Cs2MarketAssessment = {
  readonly eligible: boolean;
  readonly status: Cs2MarketAssessmentStatus;
  readonly label: string;
  readonly explanation: string;
  readonly sourceUrl: string | null;
  readonly checkedAt: string;
};

type RegulatedMarket = {
  readonly name: string;
  readonly sourceUrl: string;
  readonly onlineCasino: 'licensed' | 'restricted';
};

/**
 * Lista prudente basada en fuentes de los reguladores, no en blogs comerciales.
 * "licensed" solo significa que existe una vía regulada: nunca valida a una
 * marca concreta ni sustituye la revisión de su licencia y publicidad.
 */
const REGULATED_MARKETS: Readonly<Record<string, RegulatedMarket>> = {
  ES: {
    name: 'España',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.ordenacionjuego.es/operadores-juego/operadores-licencia/operadores',
  },
  GB: {
    name: 'Reino Unido',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.gamblingcommission.gov.uk/public-and-players/guide/page/latest-trends-in-online-gambling',
  },
  PT: {
    name: 'Portugal',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.srij.turismodeportugal.pt/pt/jogos-e-apostas-online/entidades-licenciadas',
  },
  DE: {
    name: 'Alemania',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.gluecksspiel-behoerde.de/de/fuer-spielende/uebersicht-erlaubter-anbieter-whitelist',
  },
  SE: {
    name: 'Suecia',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.spelinspektionen.se/en/licence-and-permit/licence-and-permit-directory/',
  },
  DK: {
    name: 'Dinamarca',
    onlineCasino: 'licensed',
    sourceUrl: 'https://spillemyndigheden.dk/en-us/businesses-and-associations/games-which-require-a-licence/online-casino',
  },
  CO: {
    name: 'Colombia',
    onlineCasino: 'licensed',
    sourceUrl: 'https://cnjsa.coljuegos.gov.co/publicaciones/301841/juegosonline',
  },
  PE: {
    name: 'Perú',
    onlineCasino: 'licensed',
    sourceUrl: 'https://www.gob.pe/institucion/mincetur/pages/94255-autorizacion-y-o-renovacion-de-explotacion-de-plataformas-tecnologicas-de-juegos-a-distancia-y-apuestas-deportivas-a-distancia',
  },
  FR: {
    name: 'Francia',
    onlineCasino: 'restricted',
    sourceUrl: 'https://www.anj.fr/joueurs/offre-illegale',
  },
};

export const MARKET_LABELS: Readonly<Record<Cs2SearchMarket, string>> = {
  GLOBAL: 'Todo el mundo',
  ES: 'España',
  GB: 'Reino Unido',
  PT: 'Portugal',
  DE: 'Alemania',
  SE: 'Suecia',
  DK: 'Dinamarca',
  CO: 'Colombia',
  PE: 'Perú',
  FR: 'Francia',
};

export const LANGUAGE_LABELS: Readonly<Record<TargetLanguage, string>> = {
  any: 'Cualquier idioma',
  es: 'Español',
  en: 'Inglés',
  pt: 'Portugués',
  de: 'Alemán',
  fr: 'Francés',
};

export function countryLabel(countryCode: string | null): string {
  if (!countryCode) return 'País desconocido';
  return REGULATED_MARKETS[countryCode]?.name ?? countryCode;
}

export function assessCs2Market(
  countryCode: string | null,
  campaignType: Cs2CampaignType,
): Cs2MarketAssessment {
  const checkedAt = '2026-08-25';
  if (!countryCode) {
    return {
      eligible: false,
      status: 'manual-review',
      label: 'Revisar país',
      explanation: 'El canal no declara país. No se aprueba ni se contacta automáticamente.',
      sourceUrl: null,
      checkedAt,
    };
  }

  if (campaignType === 'marketplace') {
    return {
      eligible: true,
      status: 'marketplace-scope-only',
      label: 'Solo marketplace',
      explanation: 'Preselección válida únicamente para compraventa de skins sin apuesta, azar ni premio. La marca y sus condiciones locales deben revisarse antes del contacto.',
      sourceUrl: 'https://spillemyndigheden.dk/en-us/businesses-and-associations/games-which-require-a-licence/online-casino',
      checkedAt,
    };
  }

  const market = REGULATED_MARKETS[countryCode];
  if (!market) {
    return {
      eligible: false,
      status: 'manual-review',
      label: 'Revisión legal',
      explanation: 'El país todavía no tiene una fuente regulatoria validada en el CRM para campañas de cajas o gambling.',
      sourceUrl: null,
      checkedAt,
    };
  }

  if (market.onlineCasino === 'restricted') {
    return {
      eligible: false,
      status: 'restricted',
      label: 'Restringido',
      explanation: 'El regulador indica que el casino online no está autorizado en este mercado.',
      sourceUrl: market.sourceUrl,
      checkedAt,
    };
  }

  return {
    eligible: true,
    status: 'operator-check-required',
    label: 'Comprobar licencia',
    explanation: 'Existe un mercado regulado, pero antes del contacto hay que confirmar que la marca figura como operador autorizado y que la campaña cumple las reglas publicitarias locales.',
    sourceUrl: market.sourceUrl,
    checkedAt,
  };
}
