import { z } from 'zod';

import { CAMPAIGN_STATUSES } from '@/lib/schemas/campaign';
import { DELIVERABLE_TYPES } from '@/lib/schemas/deliverable';
import { SOCIAL_PLATFORM_VALUES } from '@/lib/schemas/talentSocials';

const OptionalText = z.string().max(5000);

const EmptyOrPositiveId = z.string().max(20).refine(
  (value) => value.trim() === '' || (/^\d+$/.test(value) && Number(value) > 0),
  'Introduce un ID entero positivo',
);

const EmptyOrNonNegativeNumber = z.string().max(40).refine(
  (value) => {
    if (value.trim() === '') return true;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  },
  'Introduce un importe igual o mayor que 0',
);

const EmptyOrPositiveInteger = z.string().max(10).refine(
  (value) => value.trim() === '' || (/^\d+$/.test(value) && Number(value) > 0),
  'Introduce un número entero positivo',
);

const EmptyOrIsoDate = z.string().max(10).refine(
  (value) => value.trim() === '' || z.string().date().safeParse(value.trim()).success,
  'Introduce una fecha real en formato AAAA-MM-DD',
);

const DraftDeliverableEditor = z.object({
  type: z.enum(DELIVERABLE_TYPES),
  targetCount: EmptyOrPositiveInteger,
  notes: z.string().max(500),
});

/**
 * Shape editable del borrador. Los campos obligatorios pueden quedar vacíos:
 * guardar progreso no equivale a aprobar, y la validación de dominio seguirá
 * indicando exactamente qué falta antes de crear el trato.
 */
export const draftDealEditorFormSchema = z.object({
  name: z.string().max(200),
  brandId: EmptyOrPositiveId,
  brandName: z.string().max(200),
  talentId: EmptyOrPositiveId,
  talentName: z.string().max(100),
  talentHandle: z.string().max(120),
  talentPlatform: z.union([z.literal(''), z.enum(SOCIAL_PLATFORM_VALUES)]),
  talentCountry: z.string().max(2),
  talentGame: z.string().max(100),
  status: z.enum(CAMPAIGN_STATUSES),
  startDate: EmptyOrIsoDate,
  endDate: EmptyOrIsoDate,
  durationMonths: EmptyOrPositiveInteger,
  deliveryDeadline: EmptyOrIsoDate,
  currency: z.enum(['EUR', 'USD']),
  amountBrand: EmptyOrNonNegativeNumber,
  amountTalent: EmptyOrNonNegativeNumber,
  amountInKindTalent: EmptyOrNonNegativeNumber,
  amountInKindCommunity: EmptyOrNonNegativeNumber,
  notes: OptionalText,
  creatorNotes: OptionalText,
  trackingSheetUrl: z.union([
    z.literal(''),
    z.url().refine((value) => {
      const url = new URL(value);
      return url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets/d/');
    }, 'Debe ser una URL de Google Sheets'),
  ]),
  deliverables: z.array(DraftDeliverableEditor).max(50),
});

export const updateDraftFromEditorSchema = z.object({
  id: z.number().int().positive(),
  deal: draftDealEditorFormSchema,
});

export type DraftDealEditorFormInput = z.infer<typeof draftDealEditorFormSchema>;

const UnknownRecord = z.record(z.string(), z.unknown());

function readRecord(value: unknown): Record<string, unknown> | null {
  const parsed = UnknownRecord.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function readString(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

function readNumber(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function readDeliverables(value: unknown): DraftDealEditorFormInput['deliverables'] {
  const rows = z.array(z.unknown()).safeParse(value);
  if (!rows.success) return [];

  return rows.data.flatMap((row) => {
    const record = readRecord(row);
    const type = z.enum(DELIVERABLE_TYPES).safeParse(record?.type);
    if (!record || !type.success) return [];
    const targetCount = record.targetCount;
    return [{
      type: type.data,
      targetCount: typeof targetCount === 'number' && Number.isFinite(targetCount)
        ? String(targetCount)
        : '',
      notes: readString(record, 'notes'),
    }];
  });
}

/** Convierte el JSON parcial de n8n en valores seguros para el formulario. */
export function draftDealEditorDefaults(proposedDeal: unknown): DraftDealEditorFormInput {
  const deal = readRecord(proposedDeal);
  const brand = readRecord(deal?.brand);
  const talent = readRecord(deal?.talent);
  const status = z.enum(CAMPAIGN_STATUSES).safeParse(deal?.status);
  const platform = z.enum(SOCIAL_PLATFORM_VALUES).safeParse(talent?.platform);
  const currency = z.enum(['EUR', 'USD']).safeParse(deal?.currency);

  return {
    name: readString(deal, 'name'),
    brandId: readNumber(brand, 'id'),
    brandName: readString(brand, 'name'),
    talentId: readNumber(talent, 'id'),
    talentName: readString(talent, 'name'),
    talentHandle: readString(talent, 'handle'),
    talentPlatform: platform.success ? platform.data : '',
    talentCountry: readString(talent, 'country'),
    talentGame: readString(talent, 'game'),
    status: status.success ? status.data : 'propuesta',
    startDate: readString(deal, 'startDate'),
    endDate: readString(deal, 'endDate'),
    durationMonths: readNumber(deal, 'durationMonths'),
    deliveryDeadline: readString(deal, 'deliveryDeadline'),
    currency: currency.success ? currency.data : 'EUR',
    amountBrand: readNumber(deal, 'amountBrand') || '0',
    amountTalent: readNumber(deal, 'amountTalent') || '0',
    amountInKindTalent: readNumber(deal, 'amountInKindTalent') || '0',
    amountInKindCommunity: readNumber(deal, 'amountInKindCommunity') || '0',
    notes: readString(deal, 'notes'),
    creatorNotes: readString(deal, 'creatorNotes'),
    trackingSheetUrl: readString(deal, 'trackingSheetUrl'),
    deliverables: readDeliverables(deal?.deliverables),
  };
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

/** Reconstruye el payload de dominio conservando metadatos no editados. */
export function buildAutomationDealProposal(
  input: DraftDealEditorFormInput,
  currentProposal: unknown,
): Record<string, unknown> {
  const current = readRecord(currentProposal) ?? {};
  const currentTalent = readRecord(current.talent);
  const preservedTopGeos = currentTalent?.topGeos;
  const brandId = optionalNumber(input.brandId);
  const talentId = optionalNumber(input.talentId);

  const brand = brandId !== undefined
    ? { id: brandId }
    : { name: input.brandName.trim(), createIfMissing: true };
  const talent = talentId !== undefined
    ? { id: talentId, ...(preservedTopGeos !== undefined ? { topGeos: preservedTopGeos } : {}) }
    : {
        name: input.talentName.trim(),
        handle: input.talentHandle.trim(),
        platform: input.talentPlatform,
        ...(input.talentCountry.trim() ? { country: input.talentCountry.trim().toUpperCase() } : {}),
        ...(input.talentGame.trim() ? { game: input.talentGame.trim() } : {}),
        ...(preservedTopGeos !== undefined ? { topGeos: preservedTopGeos } : {}),
        createIfMissing: true,
      };

  const proposal: Record<string, unknown> = {
    ...current,
    name: input.name.trim(),
    brand,
    talent,
    status: input.status,
    currency: input.currency,
    amountBrand: optionalNumber(input.amountBrand) ?? 0,
    amountTalent: optionalNumber(input.amountTalent) ?? 0,
    amountInKindTalent: optionalNumber(input.amountInKindTalent) ?? 0,
    amountInKindCommunity: optionalNumber(input.amountInKindCommunity) ?? 0,
    deliverables: input.deliverables.map((row) => ({
      type: row.type,
      targetCount: Number(row.targetCount),
      ...(row.notes.trim() ? { notes: row.notes.trim() } : {}),
    })),
  };

  const optionalFields: ReadonlyArray<readonly [string, string | number | undefined]> = [
    ['startDate', input.startDate.trim() || undefined],
    ['endDate', input.endDate.trim() || undefined],
    ['durationMonths', optionalNumber(input.durationMonths)],
    ['deliveryDeadline', input.deliveryDeadline.trim() || undefined],
    ['notes', input.notes.trim() || undefined],
    ['creatorNotes', input.creatorNotes.trim() || undefined],
    ['trackingSheetUrl', input.trackingSheetUrl.trim() || undefined],
  ];
  for (const [key, value] of optionalFields) {
    if (value === undefined) delete proposal[key];
    else proposal[key] = value;
  }

  return proposal;
}
