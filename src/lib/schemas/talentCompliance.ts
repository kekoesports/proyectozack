import { z } from 'zod';

// ── CNMC status (Ley General de Comunicación Audiovisual, vigente oct-2025) ──
export const CNMC_STATUSES = ['registrado', 'pendiente', 'en_tramite', 'no_aplica'] as const;
export type CnmcStatus = (typeof CNMC_STATUSES)[number];

export const CNMC_STATUS_LABELS: Record<CnmcStatus, string> = {
  registrado: 'Registrado',
  pendiente: 'Pendiente de registro',
  en_tramite: 'En trámite',
  no_aplica: 'No aplica',
};

export const CNMC_STATUS_COLORS: Record<CnmcStatus, string> = {
  registrado: 'bg-emerald-500/20 text-emerald-400',
  pendiente: 'bg-amber-500/20 text-amber-400',
  en_tramite: 'bg-blue-500/20 text-blue-400',
  no_aplica: 'bg-sp-admin-muted/20 text-sp-admin-muted',
};

// ── Tipo fiscal (para cálculo de retención IRPF) ──
export const TALENT_TAX_TYPES = [
  'autonomo_es',
  'autonomo_es_nuevo',
  'sl_sa',
  'latam',
  'no_residente',
] as const;
export type TalentTaxType = (typeof TALENT_TAX_TYPES)[number];

export const TALENT_TAX_TYPE_LABELS: Record<TalentTaxType, string> = {
  autonomo_es: 'Autónomo ES (15% IRPF)',
  autonomo_es_nuevo: 'Autónomo ES nuevo (7% IRPF)',
  sl_sa: 'Sociedad ES (SL/SA, sin retención)',
  latam: 'LATAM (sin retención ES)',
  no_residente: 'No residente UE',
};

// ── Sección del IAE ──
//
// Manda sobre el tipo fiscal a la hora de decidir si una factura lleva
// retención: un autónomo de alta en actividad EMPRESARIAL (961.1 producción
// audiovisual, 844 publicidad) no retiene IRPF, aunque su tipo diga 15%.
// Dejarlo sin anotar no equivale a "no retiene": equivale a "no se sabe".
export const IAE_ACTIVIDADES = ['profesional', 'empresarial'] as const;
export type IaeActividad = (typeof IAE_ACTIVIDADES)[number];

export const IAE_ACTIVIDAD_LABELS: Record<IaeActividad, string> = {
  profesional: 'Profesional (sección 2ª — retiene IRPF)',
  empresarial: 'Empresarial (961.1, 844… — no retiene)',
};

/**
 * IRPF withholding percentages by tax type.
 * autonomo_es_nuevo applies during the first year of self-employed activity.
 */
export const IRPF_BY_TAX_TYPE: Record<TalentTaxType, number> = {
  autonomo_es: 15,
  autonomo_es_nuevo: 7,
  sl_sa: 0,
  latam: 0,
  no_residente: 24, // type 24: non-resident income tax (standard rate)
};

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

// Schema for updating talent compliance & fiscal fields
export const updateTalentComplianceSchema = z.object({
  talentId: z.coerce.number().int().positive(),

  // CNMC compliance
  cnmcStatus: z.enum(CNMC_STATUSES).optional(),
  cnmcRegisteredAt: z.string().optional(), // ISO date string or empty
  cnmcNotes: z.string().optional(),
  hasRcInsurance: z.coerce.boolean().optional(),

  // Fiscal data
  taxType: z.enum(TALENT_TAX_TYPES).optional(),
  // El <select> vacío llega como '' y eso no es un valor del enum: se trata
  // como "no lo toques", igual que si el campo no viniera en el formulario.
  iaeActividad: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(IAE_ACTIVIDADES).optional(),
  ),
  iaeEpigrafe: optStr(20),
  nif: optStr(20),
  fiscalName: optStr(250),
  fiscalAddress: z.string().optional(),
});

export type UpdateTalentComplianceInput = z.infer<typeof updateTalentComplianceSchema>;

// ── Campaign CNMC checklist ──
// Verifica que todos los requisitos legales están en orden antes de activar una campaña
export type CnmcChecklistItem = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly platform?: string; // if platform-specific
};

export const CNMC_CHECKLIST_ITEMS: readonly CnmcChecklistItem[] = [
  {
    id: 'talent_registered',
    label: 'Talent registrado en CNMC',
    description: 'El talento tiene cnmcStatus = "registrado" o "no_aplica" (<10k seguidores)',
  },
  {
    id: 'contract_signed',
    label: 'Contrato firmado',
    description: 'Existe contrato firmado por ambas partes para esta campaña',
  },
  {
    id: 'disclosure_twitch',
    label: 'Disclaimer Twitch configurado',
    description: 'Texto en panel de info + comando /sponsor o similar habilitado en el stream',
    platform: 'twitch',
  },
  {
    id: 'disclosure_youtube',
    label: 'Disclaimer YouTube configurado',
    description: 'Card "Incluye contenido pagado" activada + mención en descripción del vídeo',
    platform: 'youtube',
  },
  {
    id: 'disclosure_instagram',
    label: 'Etiqueta Instagram configurada',
    description: 'Etiqueta nativa "Colaboración pagada con [marca]" activada en la publicación',
    platform: 'instagram',
  },
  {
    id: 'disclosure_tiktok',
    label: 'Toggle TikTok activado',
    description: 'Toggle nativo "Contenido de marca" activado en el vídeo de TikTok',
    platform: 'tiktok',
  },
  {
    id: 'brand_approved',
    label: 'Contenido aprobado por la marca',
    description: 'La marca ha revisado y aprobado el brief/guion/contenido previo a publicación',
  },
  {
    id: 'rc_insurance_ok',
    label: 'Seguro RC activo',
    description: 'El talento tiene seguro de Responsabilidad Civil activo (obligatorio si está registrado en CNMC)',
  },
] as const;

export const updateCampaignCnmcChecklistSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  cnmcChecklistOk: z.boolean(),
});

export type UpdateCampaignCnmcChecklistInput = z.infer<typeof updateCampaignCnmcChecklistSchema>;
