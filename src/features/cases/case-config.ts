interface CaseConfig {
  logoUrl: string | null;
  stats: Array<{ value: string; label: string }>;
  services: string[];
  ctaText?: string;
  sector?: string;
}

const DEFAULT: CaseConfig = {
  logoUrl: null,
  stats: [],
  services: [],
};

export const CASE_CONFIG: Record<string, CaseConfig> = {
  keydrop: {
    logoUrl: '/images/brands/keydrop.png',
    sector: 'Gaming — CS2 Skins',
    stats: [
      { value: '12', label: 'Creadores activados' },
      { value: '4', label: 'Países' },
      { value: 'Activa 2026', label: 'Campaña' },
      { value: '1:1', label: 'Tracking por código' },
    ],
    services: [
      'Selección y casting de creadores CS2',
      'Negociación y contratos',
      'Brief creativo por perfil',
      'Códigos de referido únicos',
      'Seguimiento y reporting por creador',
      'Gestión de facturación',
    ],
    ctaText: '¿Necesitas activar creadores en el ecosistema gaming? Cuéntanos tu objetivo.',
  },
  empiredrop: {
    logoUrl: '/images/brands/empiredrop.png',
    sector: 'Gaming — CS2 Skins',
    stats: [
      { value: '5', label: 'Creadores activados' },
      { value: 'ES + LATAM', label: 'Mercados' },
      { value: '100%', label: 'Gestión integral' },
    ],
    services: [
      'Selección de perfiles CS2',
      'Negociación de condiciones',
      'Brief y coordinación de campaña',
      'Códigos de referido únicos',
      'Seguimiento y reporting final',
    ],
    ctaText: '¿Quieres penetrar en la comunidad hispanohablante de CS2? Hablemos.',
  },
  csdrop: {
    logoUrl: null,
    sector: 'Gaming — CS2',
    stats: [
      { value: '2', label: 'Creadores activados' },
      { value: 'ES + LATAM', label: 'Mercados' },
      { value: 'CS2', label: 'Ecosistema' },
    ],
    services: [
      'Selección de perfiles CS2',
      'Brief creativo y coordinación',
      'Códigos de referido únicos',
      'Seguimiento de rendimiento',
    ],
    ctaText: '¿Buscas creadores especializados en CS2? Tenemos el roster.',
  },
  onewin: {
    logoUrl: '/images/brands/1win.png',
    sector: 'iGaming — Apuestas',
    stats: [
      { value: '100+', label: 'Creadores activados' },
      { value: '340+', label: 'FTDs verificados' },
      { value: '8M', label: 'Usuarios alcanzados' },
      { value: '0', label: 'Incidencias DGOJ' },
    ],
    services: [
      'Selección y vetting de 100+ creadores',
      'Coordinación masiva en menos de 72h',
      'Códigos de referido únicos por creador',
      'Compliance DGOJ y revisión pre-publicación',
      'Reporting de conversiones verificadas',
    ],
    ctaText: '¿Necesitas activar una campaña iGaming a escala? Somos la agencia.',
  },
  skinsmonkey: {
    logoUrl: '/images/brands/skinsmonkey.png',
    sector: 'Gaming — CS2 Trading',
    stats: [
      { value: '200K€', label: 'Volumen de trading' },
      { value: '6 sem', label: 'Duración' },
      { value: '100%', label: 'Atribución verificada' },
    ],
    services: [
      'Selección de creadores CS2 especializados',
      'Diseño de campaña con códigos rotativos',
      'Tracking end-to-end por creador',
      'Reporting semanal con datos reales de la plataforma',
    ],
    ctaText: '¿Quieres tráfico verificado de referidos hacia tu plataforma? Cuéntanos.',
  },
  razer: {
    logoUrl: '/images/brands/razer.png',
    sector: 'Hardware Gaming',
    stats: [
      { value: '2.5M', label: 'Usuarios alcanzados' },
      { value: 'Q4 2024', label: 'Período' },
      { value: 'ES + LATAM', label: 'Mercados' },
    ],
    services: [
      'Selección por expertise técnico gaming',
      'Brief creativo para integración en directo',
      'Coordinación de publicaciones',
      'Reporting de alcance y engagement',
    ],
    ctaText: '¿Quieres resultados similares para tu marca? Cuéntanos tu objetivo.',
  },
};

export function getCaseConfig(slug: string): CaseConfig {
  return CASE_CONFIG[slug] ?? DEFAULT;
}
