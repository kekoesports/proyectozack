export const IP_DOCUMENT_CATEGORIES = [
  'ownership',
  'people',
  'cost',
  'technical',
  'valuation',
  'tax',
  'transfer_pricing',
  'corporate',
  'revenue',
  'brand_domain',
  'other',
] as const;

export const IP_DOCUMENT_STATUSES = [
  'draft',
  'collected',
  'review_required',
  'advisor_approved',
  'replaced',
] as const;

export const IP_DOCUMENT_STORAGE_LOCATIONS = [
  'google_drive',
  'crm_private',
  'github',
  'other',
] as const;

export type IpDocumentCategory = (typeof IP_DOCUMENT_CATEGORIES)[number];
export type IpDocumentStatus = (typeof IP_DOCUMENT_STATUSES)[number];
export type IpDocumentStorageLocation = (typeof IP_DOCUMENT_STORAGE_LOCATIONS)[number];

export type IpDataRoomStage = 'now' | 'before_transfer' | 'after_incorporation' | 'annual_claim';

export type IpDataRoomRequirement = {
  readonly code: string;
  readonly title: string;
  readonly category: IpDocumentCategory;
  readonly stage: IpDataRoomStage;
  readonly description: string;
};

/**
 * Lista de control documental. Un documento registrado no implica que su
 * contenido sea jurídicamente suficiente: `advisor_approved` sigue siendo una
 * decisión humana y profesional.
 */
export const IP_DATA_ROOM_REQUIREMENTS: readonly IpDataRoomRequirement[] = [
  {
    code: 'TECH-PROVENANCE',
    title: 'Procedencia y baseline técnico PRE-CYPRUS',
    category: 'technical',
    stage: 'now',
    description: 'Repositorio, hitos, autores, componentes y fecha de corte del software preexistente.',
  },
  {
    code: 'PEOPLE-CONTRIBUTORS',
    title: 'Expediente de contribuyentes y cesiones',
    category: 'people',
    stage: 'now',
    description: 'Hechos, entregables, pagos y contrato o cesión válida de cada persona que contribuyó al código.',
  },
  {
    code: 'PEOPLE-FOUNDER',
    title: 'Relación del fundador, remuneración y propiedad',
    category: 'ownership',
    stage: 'now',
    description: 'Acuerdos societarios/laborales y criterio sobre quién soporta el coste y adquiere el resultado.',
  },
  {
    code: 'COST-REGISTER',
    title: 'Costes reales de desarrollo conciliados',
    category: 'cost',
    stage: 'now',
    description: 'Nóminas, facturas, hosting, APIs y pagos vinculados a cada activo y periodo.',
  },
  {
    code: 'TECH-THIRD-PARTY',
    title: 'Dependencias, licencias y componentes de terceros',
    category: 'technical',
    stage: 'now',
    description: 'Inventario de paquetes, modelos, APIs, datasets y restricciones de reutilización comercial.',
  },
  {
    code: 'PRODUCT-ARCHITECTURE',
    title: 'Arquitectura de producto y dominio KekoPilot',
    category: 'brand_domain',
    stage: 'now',
    description: 'Separación entre web comercial, panel SaaS, APIs y CRM preexistente de SocialPro.',
  },
  {
    code: 'ADVISOR-SPAIN',
    title: 'Criterio coordinado de asesor español',
    category: 'tax',
    stage: 'before_transfer',
    description: 'Propiedad actual, IS/I+D+i, residencia, exit tax y tratamiento de cualquier operación vinculada.',
  },
  {
    code: 'ADVISOR-CYPRUS',
    title: 'Criterio coordinado de asesor chipriota',
    category: 'tax',
    stage: 'before_transfer',
    description: 'Activo cualificado, Nexus, sustancia, residencia, contratos y documentación del régimen.',
  },
  {
    code: 'VALUE-INDEPENDENT',
    title: 'Valoración independiente del activo',
    category: 'valuation',
    stage: 'before_transfer',
    description: 'Valor de mercado y metodología antes de vender, aportar o licenciar IP entre partes relacionadas.',
  },
  {
    code: 'TP-FUNCTIONAL',
    title: 'Análisis funcional y precios de transferencia',
    category: 'transfer_pricing',
    stage: 'before_transfer',
    description: 'Funciones, activos, riesgos, DEMPE y remuneración de cada entidad implicada.',
  },
  {
    code: 'CY-INCORPORATION',
    title: 'Constitución y registros de Cyprus Ltd',
    category: 'corporate',
    stage: 'after_incorporation',
    description: 'Certificados, UBO, fiscalidad, IVA y cuenta bancaria. Debe permanecer vacío hasta que la sociedad exista.',
  },
  {
    code: 'CY-SUBSTANCE',
    title: 'Sustancia y dirección efectiva en Chipre',
    category: 'corporate',
    stage: 'after_incorporation',
    description: 'Decisiones, personal, espacio, control de riesgos, contratos y actividad real documentada.',
  },
  {
    code: 'REVENUE-ALLOCATION',
    title: 'Ingresos y beneficio por activo',
    category: 'revenue',
    stage: 'annual_claim',
    description: 'Separación de SaaS, licencias, servicios y embedded income con conciliación contable.',
  },
  {
    code: 'NEXUS-ANNUAL',
    title: 'Cálculo Nexus anual revisado',
    category: 'tax',
    stage: 'annual_claim',
    description: 'Gasto cualificado y total durante la vida del activo, pérdidas y beneficio neto con aprobación profesional.',
  },
] as const;

export function isKnownIpRequirementCode(value: string): boolean {
  return IP_DATA_ROOM_REQUIREMENTS.some((requirement) => requirement.code === value);
}

export function isIpDocumentReady(status: IpDocumentStatus): boolean {
  return status === 'collected' || status === 'advisor_approved';
}
