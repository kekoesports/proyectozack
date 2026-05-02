'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
} from '@/lib/queries/campaigns';
import { requireAnyRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { logRedacted } from '@/lib/log';
import { CAMPAIGN_STATUSES, CAMPAIGN_ACTION_TYPES } from '@/lib/schemas/campaign';

const optionalString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional(),
);

const CreateLegacy = z.object({
  brandId: z.coerce.number().int().positive(),
  talentId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  actionType: z.enum(CAMPAIGN_ACTION_TYPES).default('otro'),
  status: z.enum(CAMPAIGN_STATUSES).default('propuesta'),
  amountBrand: z.coerce.number().nonnegative().default(0),
  amountTalent: z.coerce.number().nonnegative().default(0),
  sector: optionalString,
  geo: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  notes: optionalString,
  responsibleUserId: optionalString,
});

const UpdateLegacy = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  brandId: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number().int().positive().optional()),
  talentId: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number().int().positive().optional()),
  amountBrand: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number().nonnegative().optional()),
  amountTalent: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number().nonnegative().optional()),
  sector: optionalString,
  geo: optionalString,
  status: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.enum(CAMPAIGN_STATUSES).optional()),
  startDate: optionalString,
  endDate: optionalString,
  notes: optionalString,
  responsibleUserId: optionalString,
});

const IdOnly = z.object({ id: z.coerce.number().int().positive() });

export async function createCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const parsed = parseFormData(formData, CreateLegacy);
  if (!parsed.ok) {
    logRedacted('warn', '[campaign-actions] createCampaign invalid input', parsed.fieldErrors);
    return;
  }
  const { brandId, talentId, name, actionType, status, amountBrand, amountTalent, sector, geo, startDate, endDate, notes, responsibleUserId } = parsed.data;

  await createCampaign({
    brandId,
    talentId,
    name,
    actionType,
    status,
    amountBrand,
    amountTalent,
    ...(sector ? { sector } : {}),
    ...(geo ? { geo } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(notes ? { notes } : {}),
    ...(responsibleUserId ? { responsibleUserId } : {}),
  });

  revalidatePath('/admin/campanas');
}

export async function updateCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const parsed = parseFormData(formData, UpdateLegacy);
  if (!parsed.ok) {
    logRedacted('warn', '[campaign-actions] updateCampaign invalid input', parsed.fieldErrors);
    return;
  }
  const { id, ...rest } = parsed.data;

  const patch: Parameters<typeof updateCampaign>[1] = { name: rest.name };
  if (rest.brandId !== undefined) patch.brandId = rest.brandId;
  if (rest.talentId !== undefined) patch.talentId = rest.talentId;
  if (rest.amountBrand !== undefined) patch.amountBrand = rest.amountBrand;
  if (rest.amountTalent !== undefined) patch.amountTalent = rest.amountTalent;
  if (rest.sector) patch.sector = rest.sector;
  if (rest.geo) patch.geo = rest.geo;
  if (rest.status) patch.status = rest.status;
  if (rest.startDate) patch.startDate = rest.startDate;
  if (rest.endDate) patch.endDate = rest.endDate;
  if (rest.notes) patch.notes = rest.notes;
  if (rest.responsibleUserId) patch.responsibleUserId = rest.responsibleUserId;

  await updateCampaign(id, patch);

  revalidatePath('/admin/campanas');
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const parsed = parseFormData(formData, IdOnly);
  if (!parsed.ok) return;
  // Los tratos se archivan (soft-delete) en lugar de borrarse para preservar datos históricos.
  await archiveCampaign(parsed.data.id);
  revalidatePath('/admin/campanas');
}

// El estado de cobro/pago del trato se deriva automáticamente de los movimientos de facturación
// vinculados al trato (via getCampaignPaymentStatus, que suma invoices por campaignId).
// El flujo correcto es: registrar movimiento en Facturación → estado del trato se actualiza solo.
export async function markBrandPaidAction(_formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  revalidatePath('/admin/campanas');
}

export async function markTalentPaidAction(_formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  revalidatePath('/admin/campanas');
}
